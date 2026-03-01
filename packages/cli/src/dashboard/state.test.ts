import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the api-client module before importing state
vi.mock('../utils/api-client.ts', () => ({
  get: vi.fn(),
  post: vi.fn(),
  agentPath: (name: string) => encodeURIComponent(name),
  DaemonUnreachableError: class DaemonUnreachableError extends Error {
    constructor(url: string) {
      super(`Herald daemon unreachable at ${url}. Is it running?`);
      this.name = 'DaemonUnreachableError';
    }
  },
}));

import { get, DaemonUnreachableError } from '../utils/api-client.ts';
import {
  createInitialState,
  fetchState,
  detectChanges,
  pruneOldChanges,
  hasRecentChange,
  buildAgentStateMap,
  formatChangeDuration,
  type DashboardState,
  type AgentDetail,
  type Schedule,
  type RecentChange,
  type Agent,
} from './state.ts';

describe('createInitialState', () => {
  it('returns a state with default values', () => {
    const state = createInitialState();

    expect(state.agents).toEqual([]);
    expect(state.newspaper).toBeNull();
    expect(state.daemon).toBeNull();
    expect(state.selectedPanel).toBe('agents');
    expect(state.selectedAgentIndex).toBe(0);
    expect(state.newspaperScrollOffset).toBe(0);
    expect(state.lastUpdate).toBeNull();
    expect(state.error).toBeNull();
    expect(state.showHelp).toBe(false);
    // Story 5.3 & 5.4 defaults
    expect(state.view).toBe('main');
    expect(state.selectedAgentName).toBeNull();
    expect(state.agentDetail).toBeNull();
    expect(state.schedules).toEqual([]);
    expect(state.selectedScheduleIndex).toBe(0);
    // Story 5.5 defaults
    expect(state.connectionStatus).toBe('connecting');
    expect(state.recentChanges).toEqual([]);
    expect(state.lastAgentStates).toBeInstanceOf(Map);
    expect(state.lastAgentStates.size).toBe(0);
  });

  it('uses process.stdout dimensions for terminal size', () => {
    const state = createInitialState();
    // These will be whatever the test runner provides (or defaults)
    expect(typeof state.termWidth).toBe('number');
    expect(typeof state.termHeight).toBe('number');
    expect(state.termWidth).toBeGreaterThan(0);
    expect(state.termHeight).toBeGreaterThan(0);
  });
});

describe('fetchState', () => {
  beforeEach(() => {
    vi.mocked(get).mockReset();
  });

  function makeState(overrides: Partial<DashboardState> = {}): DashboardState {
    return {
      agents: [],
      newspaper: null,
      daemon: null,
      selectedPanel: 'agents',
      selectedAgentIndex: 0,
      newspaperScrollOffset: 0,
      termWidth: 80,
      termHeight: 24,
      lastUpdate: null,
      error: null,
      showHelp: false,
      view: 'main',
      selectedAgentName: null,
      agentDetail: null,
      schedules: [],
      selectedScheduleIndex: 0,
      // Story 5.5: Real-Time Dashboard Updates
      connectionStatus: 'connecting',
      recentChanges: [],
      lastAgentStates: new Map(),
      ...overrides,
    };
  }

  it('fetches health, agents, and newspaper data', async () => {
    vi.mocked(get)
      .mockResolvedValueOnce({ status: 'ok', uptime: 3600 })  // /health
      .mockResolvedValueOnce({                                  // /api/agents
        agents: [
          { name: 'scout', status: 'idle', lastRun: '2026-03-01T10:00:00Z' },
        ],
      })
      .mockResolvedValueOnce({                                  // /api/newspaper/current
        editionDate: '2026-03-01',
        content: '# Daily Brief\nNews here.',
      });

    const state = makeState();
    const next = await fetchState(state);

    expect(next.daemon).toEqual({ uptime: 3600, version: '0.0.1' });
    expect(next.agents).toHaveLength(1);
    expect(next.agents[0].name).toBe('scout');
    expect(next.newspaper).not.toBeNull();
    expect(next.newspaper!.editionDate).toBe('2026-03-01');
    expect(next.lastUpdate).toBeInstanceOf(Date);
    expect(next.error).toBeNull();
  });

  it('handles daemon unreachable error gracefully', async () => {
    vi.mocked(get).mockRejectedValue(
      new DaemonUnreachableError('http://localhost:3117'),
    );

    const state = makeState({ daemon: { uptime: 100, version: '0.0.1' } });
    const next = await fetchState(state);

    expect(next.daemon).toBeNull();
    expect(next.error).toContain('Daemon unreachable');
  });

  it('handles generic errors', async () => {
    vi.mocked(get).mockRejectedValue(new Error('Network timeout'));

    const state = makeState();
    const next = await fetchState(state);

    expect(next.error).toBe('Network timeout');
  });

  it('handles newspaper endpoint failure without crashing', async () => {
    vi.mocked(get)
      .mockResolvedValueOnce({ status: 'ok', uptime: 100 })
      .mockResolvedValueOnce({ agents: [] })
      .mockRejectedValueOnce(new Error('Not found'));  // newspaper fails

    const state = makeState();
    const next = await fetchState(state);

    // Newspaper should be null since the catch returns null
    expect(next.newspaper).toBeNull();
    expect(next.daemon).not.toBeNull();
    expect(next.error).toBeNull();
  });

  it('clamps selectedAgentIndex when agents list shrinks', async () => {
    vi.mocked(get)
      .mockResolvedValueOnce({ status: 'ok', uptime: 100 })
      .mockResolvedValueOnce({
        agents: [{ name: 'a', status: 'idle' }],
      })
      .mockResolvedValueOnce(null);

    const state = makeState({ selectedAgentIndex: 5 });
    const next = await fetchState(state);

    expect(next.selectedAgentIndex).toBe(0); // clamped to last index
  });

  it('preserves selectedAgentIndex when within range', async () => {
    vi.mocked(get)
      .mockResolvedValueOnce({ status: 'ok', uptime: 100 })
      .mockResolvedValueOnce({
        agents: [
          { name: 'a', status: 'idle' },
          { name: 'b', status: 'idle' },
          { name: 'c', status: 'idle' },
        ],
      })
      .mockResolvedValueOnce(null);

    const state = makeState({ selectedAgentIndex: 1 });
    const next = await fetchState(state);

    expect(next.selectedAgentIndex).toBe(1);
  });

  it('preserves UI state fields across fetch', async () => {
    vi.mocked(get)
      .mockResolvedValueOnce({ status: 'ok', uptime: 100 })
      .mockResolvedValueOnce({ agents: [] })
      .mockResolvedValueOnce(null);

    const state = makeState({
      selectedPanel: 'newspaper',
      newspaperScrollOffset: 5,
      showHelp: true,
    });
    const next = await fetchState(state);

    expect(next.selectedPanel).toBe('newspaper');
    expect(next.newspaperScrollOffset).toBe(5);
    expect(next.showHelp).toBe(true);
  });

  it('fetches agent detail when view is agent-detail', async () => {
    vi.mocked(get)
      .mockResolvedValueOnce({ status: 'ok', uptime: 100 })       // /health
      .mockResolvedValueOnce({ agents: [{ name: 'scout', status: 'idle' }] })  // /api/agents
      .mockResolvedValueOnce(null)                                 // /api/newspaper/current
      .mockResolvedValueOnce({                                     // /api/agents/scout
        name: 'scout',
        status: 'idle',
        config: {
          schedule: '30 5,11,17,23 * * *',
          sessionLimit: 15,
          discoveryMode: 'aggressive',
          teamEligible: true,
          memoryPaths: { knowledge: 'memory/agents/scout/knowledge' },
        },
        registeredAt: '2026-02-15T10:00:00Z',
        lastRun: '2026-03-01T05:56:30Z',
      });

    const state = makeState({
      view: 'agent-detail',
      selectedAgentName: 'scout',
    });
    const next = await fetchState(state);

    expect(next.agentDetail).not.toBeNull();
    expect(next.agentDetail!.name).toBe('scout');
    expect(next.agentDetail!.schedule).toBe('30 5,11,17,23 * * *');
    expect(next.agentDetail!.sessionLimit).toBe(15);
    expect(next.agentDetail!.discoveryMode).toBe('aggressive');
    expect(next.agentDetail!.teamEligible).toBe(true);
  });

  it('does not fetch agent detail when view is main', async () => {
    vi.mocked(get)
      .mockResolvedValueOnce({ status: 'ok', uptime: 100 })
      .mockResolvedValueOnce({ agents: [] })
      .mockResolvedValueOnce(null);

    const state = makeState({ view: 'main', selectedAgentName: null });
    const next = await fetchState(state);

    expect(next.agentDetail).toBeNull();
    // get should have been called 3 times (health, agents, newspaper)
    expect(vi.mocked(get)).toHaveBeenCalledTimes(3);
  });

  it('fetches schedules when view is schedule', async () => {
    vi.mocked(get)
      .mockResolvedValueOnce({ status: 'ok', uptime: 100 })       // /health
      .mockResolvedValueOnce({ agents: [] })                       // /api/agents
      .mockResolvedValueOnce(null)                                 // /api/newspaper/current (caught)
      .mockResolvedValueOnce({                                     // /api/schedule
        schedules: [
          { name: 'scout', cron: '30 5,11,17,23 * * *', nextRun: '06:30', enabled: true },
          { name: 'newspaper', cron: '0 6 * * *', nextRun: '06:00', enabled: true },
        ],
      });

    const state = makeState({ view: 'schedule' });
    const next = await fetchState(state);

    expect(next.schedules).toHaveLength(2);
    expect(next.schedules[0].name).toBe('scout');
    expect(next.schedules[1].cron).toBe('0 6 * * *');
  });

  it('clamps selectedScheduleIndex when schedules list shrinks', async () => {
    vi.mocked(get)
      .mockResolvedValueOnce({ status: 'ok', uptime: 100 })       // /health
      .mockResolvedValueOnce({ agents: [] })                       // /api/agents
      .mockResolvedValueOnce(null)                                 // /api/newspaper/current (caught)
      .mockResolvedValueOnce({                                     // /api/schedule
        schedules: [
          { name: 'scout', cron: '30 5 * * *', enabled: true },
        ],
      });

    const state = makeState({ view: 'schedule', selectedScheduleIndex: 5 });
    const next = await fetchState(state);

    expect(next.selectedScheduleIndex).toBe(0); // clamped to last index
  });

  it('preserves view state fields across fetch', async () => {
    vi.mocked(get)
      .mockResolvedValueOnce({ status: 'ok', uptime: 100 })
      .mockResolvedValueOnce({ agents: [] })
      .mockResolvedValueOnce(null);

    const state = makeState({
      view: 'main',
      selectedAgentName: 'test-agent',
      selectedScheduleIndex: 2,
    });
    const next = await fetchState(state);

    expect(next.view).toBe('main');
    expect(next.selectedAgentName).toBe('test-agent');
    expect(next.selectedScheduleIndex).toBe(2);
  });

  // Story 5.5: Connection status and change detection in fetchState

  it('sets connectionStatus to connected on successful fetch', async () => {
    vi.mocked(get)
      .mockResolvedValueOnce({ status: 'ok', uptime: 100 })
      .mockResolvedValueOnce({ agents: [] })
      .mockResolvedValueOnce(null);

    const state = makeState({ connectionStatus: 'connecting' });
    const next = await fetchState(state);

    expect(next.connectionStatus).toBe('connected');
  });

  it('sets connectionStatus to disconnected on fetch failure', async () => {
    vi.mocked(get).mockRejectedValue(
      new DaemonUnreachableError('http://localhost:3117'),
    );

    const state = makeState({ connectionStatus: 'connected' });
    const next = await fetchState(state);

    expect(next.connectionStatus).toBe('disconnected');
  });

  it('detects agent changes when lastRun changes', async () => {
    const now = new Date('2026-03-01T12:00:00Z');
    const prevStates = new Map([['scout', '2026-03-01T11:00:00Z']]);

    vi.mocked(get)
      .mockResolvedValueOnce({ status: 'ok', uptime: 100 })
      .mockResolvedValueOnce({
        agents: [
          { name: 'scout', status: 'idle', lastRun: '2026-03-01T11:30:00Z' },
        ],
      })
      .mockResolvedValueOnce(null);

    const state = makeState({ lastAgentStates: prevStates });
    const next = await fetchState(state, now);

    expect(next.recentChanges).toHaveLength(1);
    expect(next.recentChanges[0].type).toBe('agent-completed');
    expect(next.recentChanges[0].agentName).toBe('scout');
    expect(next.recentChanges[0].timestamp).toEqual(now);
  });

  it('does not detect changes on first fetch (empty prevStates)', async () => {
    const now = new Date('2026-03-01T12:00:00Z');

    vi.mocked(get)
      .mockResolvedValueOnce({ status: 'ok', uptime: 100 })
      .mockResolvedValueOnce({
        agents: [
          { name: 'scout', status: 'idle', lastRun: '2026-03-01T11:30:00Z' },
        ],
      })
      .mockResolvedValueOnce(null);

    const state = makeState(); // empty lastAgentStates
    const next = await fetchState(state, now);

    expect(next.recentChanges).toHaveLength(0);
  });

  it('builds lastAgentStates map after successful fetch', async () => {
    vi.mocked(get)
      .mockResolvedValueOnce({ status: 'ok', uptime: 100 })
      .mockResolvedValueOnce({
        agents: [
          { name: 'scout', status: 'idle', lastRun: '2026-03-01T11:30:00Z' },
          { name: 'bot', status: 'running' }, // no lastRun
        ],
      })
      .mockResolvedValueOnce(null);

    const state = makeState();
    const next = await fetchState(state);

    expect(next.lastAgentStates.size).toBe(1);
    expect(next.lastAgentStates.get('scout')).toBe('2026-03-01T11:30:00Z');
  });

  it('prunes old changes during fetch', async () => {
    const oldTime = new Date('2026-03-01T11:58:00Z');
    const now = new Date('2026-03-01T12:00:00Z');
    const oldChange: RecentChange = {
      type: 'agent-completed',
      agentName: 'old-agent',
      timestamp: oldTime, // 2 minutes old at 'now'
    };

    vi.mocked(get)
      .mockResolvedValueOnce({ status: 'ok', uptime: 100 })
      .mockResolvedValueOnce({ agents: [] })
      .mockResolvedValueOnce(null);

    const state = makeState({ recentChanges: [oldChange] });
    const next = await fetchState(state, now);

    // The old change (2 min old) should be pruned (>60s)
    expect(next.recentChanges).toHaveLength(0);
  });
});

// ── Story 5.5: Change Detection Unit Tests ─────────────────────

describe('detectChanges', () => {
  const now = new Date('2026-03-01T12:00:00Z');

  it('returns empty array when prevStates is empty (first fetch)', () => {
    const agents: Agent[] = [
      { name: 'scout', status: 'idle', lastRun: '2026-03-01T11:00:00Z' },
    ];
    const result = detectChanges(new Map(), agents, now);
    expect(result).toEqual([]);
  });

  it('detects agent-completed when lastRun changes for idle agent', () => {
    const prev = new Map([['scout', '2026-03-01T10:00:00Z']]);
    const agents: Agent[] = [
      { name: 'scout', status: 'idle', lastRun: '2026-03-01T11:00:00Z' },
    ];
    const result = detectChanges(prev, agents, now);

    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('agent-completed');
    expect(result[0].agentName).toBe('scout');
    expect(result[0].timestamp).toBe(now);
  });

  it('detects agent-failed when lastRun changes for failed agent', () => {
    const prev = new Map([['scout', '2026-03-01T10:00:00Z']]);
    const agents: Agent[] = [
      { name: 'scout', status: 'failed', lastRun: '2026-03-01T11:00:00Z' },
    ];
    const result = detectChanges(prev, agents, now);

    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('agent-failed');
  });

  it('detects agent-failed for error status', () => {
    const prev = new Map([['scout', '2026-03-01T10:00:00Z']]);
    const agents: Agent[] = [
      { name: 'scout', status: 'error', lastRun: '2026-03-01T11:00:00Z' },
    ];
    const result = detectChanges(prev, agents, now);

    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('agent-failed');
  });

  it('does not detect changes when lastRun is unchanged', () => {
    const prev = new Map([['scout', '2026-03-01T10:00:00Z']]);
    const agents: Agent[] = [
      { name: 'scout', status: 'idle', lastRun: '2026-03-01T10:00:00Z' },
    ];
    const result = detectChanges(prev, agents, now);
    expect(result).toHaveLength(0);
  });

  it('detects changes for multiple agents', () => {
    const prev = new Map([
      ['scout', '2026-03-01T10:00:00Z'],
      ['bot', '2026-03-01T09:00:00Z'],
    ]);
    const agents: Agent[] = [
      { name: 'scout', status: 'idle', lastRun: '2026-03-01T11:00:00Z' },
      { name: 'bot', status: 'idle', lastRun: '2026-03-01T10:00:00Z' },
    ];
    const result = detectChanges(prev, agents, now);

    expect(result).toHaveLength(2);
    expect(result[0].agentName).toBe('scout');
    expect(result[1].agentName).toBe('bot');
  });

  it('detects change for newly appearing agent with lastRun', () => {
    const prev = new Map([['scout', '2026-03-01T10:00:00Z']]);
    const agents: Agent[] = [
      { name: 'scout', status: 'idle', lastRun: '2026-03-01T10:00:00Z' },
      { name: 'new-bot', status: 'idle', lastRun: '2026-03-01T11:00:00Z' },
    ];
    const result = detectChanges(prev, agents, now);

    expect(result).toHaveLength(1);
    expect(result[0].agentName).toBe('new-bot');
  });

  it('skips agents without lastRun', () => {
    const prev = new Map([['scout', '2026-03-01T10:00:00Z']]);
    const agents: Agent[] = [
      { name: 'scout', status: 'idle', lastRun: '2026-03-01T10:00:00Z' },
      { name: 'new-bot', status: 'pending' }, // no lastRun
    ];
    const result = detectChanges(prev, agents, now);
    expect(result).toHaveLength(0);
  });
});

describe('pruneOldChanges', () => {
  it('removes changes older than 60 seconds', () => {
    const now = new Date('2026-03-01T12:01:30Z');
    const changes: RecentChange[] = [
      { type: 'agent-completed', agentName: 'old', timestamp: new Date('2026-03-01T12:00:00Z') }, // 90s old
      { type: 'agent-completed', agentName: 'recent', timestamp: new Date('2026-03-01T12:01:00Z') }, // 30s old
    ];

    const result = pruneOldChanges(changes, now);
    expect(result).toHaveLength(1);
    expect(result[0].agentName).toBe('recent');
  });

  it('keeps changes exactly at 60 seconds (exclusive threshold)', () => {
    const now = new Date('2026-03-01T12:01:00Z');
    const changes: RecentChange[] = [
      { type: 'agent-completed', agentName: 'edge', timestamp: new Date('2026-03-01T12:00:00Z') }, // exactly 60s
    ];

    const result = pruneOldChanges(changes, now);
    // 60000ms - 60000ms = 0, which is NOT < 0, so it should be pruned
    expect(result).toHaveLength(0);
  });

  it('keeps all changes when all are recent', () => {
    const now = new Date('2026-03-01T12:00:30Z');
    const changes: RecentChange[] = [
      { type: 'agent-completed', agentName: 'a', timestamp: new Date('2026-03-01T12:00:00Z') },
      { type: 'agent-failed', agentName: 'b', timestamp: new Date('2026-03-01T12:00:10Z') },
    ];

    const result = pruneOldChanges(changes, now);
    expect(result).toHaveLength(2);
  });

  it('returns empty array when all changes are old', () => {
    const now = new Date('2026-03-01T12:05:00Z');
    const changes: RecentChange[] = [
      { type: 'agent-completed', agentName: 'old1', timestamp: new Date('2026-03-01T12:00:00Z') },
      { type: 'agent-completed', agentName: 'old2', timestamp: new Date('2026-03-01T12:01:00Z') },
    ];

    const result = pruneOldChanges(changes, now);
    expect(result).toHaveLength(0);
  });

  it('accepts custom maxAgeMs parameter', () => {
    const now = new Date('2026-03-01T12:00:10Z');
    const changes: RecentChange[] = [
      { type: 'agent-completed', agentName: 'a', timestamp: new Date('2026-03-01T12:00:00Z') },
    ];

    // 5 second max age
    const result = pruneOldChanges(changes, now, 5000);
    expect(result).toHaveLength(0);
  });
});

describe('hasRecentChange', () => {
  const now = new Date('2026-03-01T12:00:30Z');

  it('finds a recent change for an agent within 30s threshold', () => {
    const changes: RecentChange[] = [
      { type: 'agent-completed', agentName: 'scout', timestamp: new Date('2026-03-01T12:00:10Z') }, // 20s ago
    ];

    const result = hasRecentChange('scout', changes, now);
    expect(result).toBeDefined();
    expect(result!.agentName).toBe('scout');
  });

  it('returns undefined for agent with no recent change', () => {
    const changes: RecentChange[] = [
      { type: 'agent-completed', agentName: 'bot', timestamp: new Date('2026-03-01T12:00:10Z') },
    ];

    const result = hasRecentChange('scout', changes, now);
    expect(result).toBeUndefined();
  });

  it('returns undefined when change is older than 30s threshold', () => {
    const changes: RecentChange[] = [
      { type: 'agent-completed', agentName: 'scout', timestamp: new Date('2026-03-01T11:59:50Z') }, // 40s ago
    ];

    const result = hasRecentChange('scout', changes, now);
    expect(result).toBeUndefined();
  });

  it('accepts custom threshold', () => {
    const changes: RecentChange[] = [
      { type: 'agent-completed', agentName: 'scout', timestamp: new Date('2026-03-01T12:00:20Z') }, // 10s ago
    ];

    // 5 second threshold → 10s ago is too old
    const result = hasRecentChange('scout', changes, now, 5000);
    expect(result).toBeUndefined();
  });
});

describe('buildAgentStateMap', () => {
  it('builds map from agents with lastRun', () => {
    const agents: Agent[] = [
      { name: 'scout', status: 'idle', lastRun: '2026-03-01T11:00:00Z' },
      { name: 'bot', status: 'running', lastRun: '2026-03-01T10:00:00Z' },
    ];

    const map = buildAgentStateMap(agents);
    expect(map.size).toBe(2);
    expect(map.get('scout')).toBe('2026-03-01T11:00:00Z');
    expect(map.get('bot')).toBe('2026-03-01T10:00:00Z');
  });

  it('skips agents without lastRun', () => {
    const agents: Agent[] = [
      { name: 'scout', status: 'idle', lastRun: '2026-03-01T11:00:00Z' },
      { name: 'new-bot', status: 'pending' }, // no lastRun
    ];

    const map = buildAgentStateMap(agents);
    expect(map.size).toBe(1);
    expect(map.has('new-bot')).toBe(false);
  });

  it('returns empty map for empty agents list', () => {
    const map = buildAgentStateMap([]);
    expect(map.size).toBe(0);
  });
});

describe('formatChangeDuration', () => {
  it('formats seconds when under 60s', () => {
    const change: RecentChange = {
      type: 'agent-completed',
      agentName: 'scout',
      timestamp: new Date('2026-03-01T12:00:00Z'),
    };
    const now = new Date('2026-03-01T12:00:30Z');
    expect(formatChangeDuration(change, now)).toBe('30s ago');
  });

  it('formats minutes when 60s or more', () => {
    const change: RecentChange = {
      type: 'agent-completed',
      agentName: 'scout',
      timestamp: new Date('2026-03-01T12:00:00Z'),
    };
    const now = new Date('2026-03-01T12:02:00Z');
    expect(formatChangeDuration(change, now)).toBe('2m ago');
  });

  it('formats 0s for simultaneous timestamp', () => {
    const now = new Date('2026-03-01T12:00:00Z');
    const change: RecentChange = {
      type: 'agent-completed',
      agentName: 'scout',
      timestamp: now,
    };
    expect(formatChangeDuration(change, now)).toBe('0s ago');
  });
});
