import { describe, expect, it } from 'vitest';

import {
  bold,
  dim,
  green,
  red,
  yellow,
  cyan,
  inverse,
  brightWhite,
  clearScreen,
  moveTo,
  hideCursor,
  showCursor,
  truncate,
  fitWidth,
  stripAnsi,
  visibleLength,
  box,
  horizontalSep,
  renderDashboard,
  renderAgentDetailView,
  renderScheduleView,
  renderConnectionStatus,
  renderNotificationArea,
} from './renderer.ts';
import type { DashboardState, AgentDetail, Schedule, RecentChange, ConnectionStatus } from './state.ts';

// ── ANSI Formatting Tests ──────────────────────────────────────

describe('ANSI formatting functions', () => {
  it('bold wraps text with bold escape codes', () => {
    const result = bold('hello');
    expect(result).toBe('\x1b[1mhello\x1b[0m');
  });

  it('dim wraps text with dim escape codes', () => {
    const result = dim('hello');
    expect(result).toBe('\x1b[2mhello\x1b[0m');
  });

  it('green wraps text with green color code', () => {
    const result = green('ok');
    expect(result).toBe('\x1b[32mok\x1b[0m');
  });

  it('red wraps text with red color code', () => {
    const result = red('err');
    expect(result).toBe('\x1b[31merr\x1b[0m');
  });

  it('yellow wraps text with yellow color code', () => {
    const result = yellow('warn');
    expect(result).toBe('\x1b[33mwarn\x1b[0m');
  });

  it('cyan wraps text with cyan color code', () => {
    const result = cyan('info');
    expect(result).toBe('\x1b[36minfo\x1b[0m');
  });

  it('inverse wraps text with inverse code', () => {
    const result = inverse('sel');
    expect(result).toBe('\x1b[7msel\x1b[0m');
  });
});

// ── Cursor & Screen Control ────────────────────────────────────

describe('cursor and screen control', () => {
  it('clearScreen returns clear + home sequence', () => {
    expect(clearScreen()).toBe('\x1b[2J\x1b[H');
  });

  it('moveTo returns cursor positioning sequence', () => {
    expect(moveTo(5, 10)).toBe('\x1b[5;10H');
  });

  it('hideCursor returns hide sequence', () => {
    expect(hideCursor()).toBe('\x1b[?25l');
  });

  it('showCursor returns show sequence', () => {
    expect(showCursor()).toBe('\x1b[?25h');
  });
});

// ── Text Utilities ─────────────────────────────────────────────

describe('truncate', () => {
  it('returns text unchanged when shorter than maxLen', () => {
    expect(truncate('hello', 10)).toBe('hello');
  });

  it('returns text unchanged when equal to maxLen', () => {
    expect(truncate('hello', 5)).toBe('hello');
  });

  it('truncates with ellipsis when longer than maxLen', () => {
    const result = truncate('hello world', 8);
    expect(result).toHaveLength(8);
    expect(result.endsWith('\u2026')).toBe(true);
    expect(result).toBe('hello w\u2026');
  });

  it('returns empty string for maxLen 0', () => {
    expect(truncate('hello', 0)).toBe('');
  });

  it('handles maxLen <= 3 without ellipsis', () => {
    expect(truncate('hello', 2)).toBe('he');
    expect(truncate('hello', 3)).toBe('hel');
  });
});

describe('fitWidth', () => {
  it('pads short text with spaces', () => {
    expect(fitWidth('hi', 5)).toBe('hi   ');
  });

  it('returns text unchanged at exact width', () => {
    expect(fitWidth('hello', 5)).toBe('hello');
  });

  it('truncates long text to width', () => {
    const result = fitWidth('hello world', 5);
    expect(result).toHaveLength(5);
  });

  it('returns empty string for width 0', () => {
    expect(fitWidth('hello', 0)).toBe('');
  });
});

describe('stripAnsi', () => {
  it('removes ANSI color codes', () => {
    expect(stripAnsi(green('hello'))).toBe('hello');
  });

  it('removes nested ANSI codes', () => {
    expect(stripAnsi(bold(green('text')))).toBe('text');
  });

  it('returns plain text unchanged', () => {
    expect(stripAnsi('plain')).toBe('plain');
  });

  it('strips non-SGR escape sequences (cursor control, etc.)', () => {
    // Hide cursor: ESC[?25l
    expect(stripAnsi('\x1b[?25lhello')).toBe('hello');
    // Cursor movement: ESC[5A
    expect(stripAnsi('\x1b[5Aworld')).toBe('world');
    // Erase in display: ESC[2J
    expect(stripAnsi('\x1b[2Jtext')).toBe('text');
  });
});

describe('visibleLength', () => {
  it('returns length of plain text', () => {
    expect(visibleLength('hello')).toBe(5);
  });

  it('returns length excluding ANSI codes', () => {
    expect(visibleLength(green('hello'))).toBe(5);
    expect(visibleLength(bold('ok'))).toBe(2);
  });
});

// ── Box Drawing ────────────────────────────────────────────────

describe('box', () => {
  it('draws a box with title and content', () => {
    const lines = box('Title', ['Line 1', 'Line 2'], 30);
    expect(lines.length).toBe(4); // top + 2 content + bottom
    expect(lines[0]).toContain('Title');
    expect(lines[0].startsWith('\u2554')).toBe(true); // ╔
    expect(lines[0].endsWith('\u2557')).toBe(true);   // ╗
    expect(lines[3].startsWith('\u255a')).toBe(true);  // ╚
    expect(lines[3].endsWith('\u255d')).toBe(true);    // ╝
  });

  it('content lines are bordered with vertical bars', () => {
    const lines = box('T', ['Hello'], 20);
    expect(lines[1].startsWith('\u2551')).toBe(true);  // ║
    expect(lines[1].endsWith('\u2551')).toBe(true);    // ║
    expect(lines[1]).toContain('Hello');
  });

  it('pads content lines to fill width', () => {
    const lines = box('T', ['Hi'], 20);
    // Inner width is 18, "Hi" is 2, so 16 spaces of padding
    const contentLine = lines[1];
    // Should be: ║Hi                ║
    expect(contentLine.length).toBe(20);
  });
});

describe('horizontalSep', () => {
  it('draws a horizontal separator with tee connectors', () => {
    const sep = horizontalSep(20);
    expect(sep.startsWith('\u2560')).toBe(true);  // ╠
    expect(sep.endsWith('\u2563')).toBe(true);     // ╣
    expect(sep.length).toBe(20);
  });
});

// ── Full Dashboard Render ──────────────────────────────────────

describe('renderDashboard', () => {
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
      connectionStatus: 'connected',
      recentChanges: [],
      lastAgentStates: new Map(),
      ...overrides,
    };
  }

  it('renders header with HERALD DASHBOARD title', () => {
    const result = renderDashboard(makeState());
    expect(stripAnsi(result)).toContain('HERALD DASHBOARD');
  });

  it('shows "Disconnected" when connectionStatus is disconnected', () => {
    const result = renderDashboard(makeState({ daemon: null, connectionStatus: 'disconnected' }));
    expect(stripAnsi(result)).toContain('Disconnected');
  });

  it('shows "Connected" when daemon info is available', () => {
    const result = renderDashboard(makeState({
      daemon: { uptime: 8100, version: '0.0.1' },
    }));
    const plain = stripAnsi(result);
    expect(plain).toContain('Connected');
    expect(plain).toContain('2h 15m');
  });

  it('renders agent list with status icons and names', () => {
    const result = renderDashboard(makeState({
      termWidth: 120,
      agents: [
        { name: 'ml-researcher', status: 'idle', lastRun: new Date().toISOString() },
        { name: 'compute-bot', status: 'running' },
      ],
    }));
    const plain = stripAnsi(result);
    expect(plain).toContain('ml-researcher');
    expect(plain).toContain('compute-bot');
    expect(plain).toContain('[ok]');
    expect(plain).toContain('[..]');
  });

  it('shows "No agents registered" when agents list is empty', () => {
    const result = renderDashboard(makeState({ agents: [] }));
    expect(stripAnsi(result)).toContain('No agents registered');
  });

  it('shows newspaper content when available', () => {
    const result = renderDashboard(makeState({
      newspaper: {
        editionDate: '2026-03-01',
        content: '# Herald Daily Brief\n## Top Stories\nBig news today.',
      },
    }));
    const plain = stripAnsi(result);
    expect(plain).toContain('Herald Daily Brief');
    expect(plain).toContain('Top Stories');
    expect(plain).toContain('Big news today.');
  });

  it('shows "No newspaper available" when newspaper is null', () => {
    const result = renderDashboard(makeState({ newspaper: null }));
    expect(stripAnsi(result)).toContain('No newspaper available');
  });

  it('renders footer with keyboard shortcut hints', () => {
    const result = renderDashboard(makeState());
    const plain = stripAnsi(result);
    expect(plain).toContain('q:quit');
    expect(plain).toContain('Tab:switch');
    expect(plain).toContain('j/k:nav');
    expect(plain).toContain('r:refresh');
    expect(plain).toContain('?:help');
  });

  it('shows error message when error is set', () => {
    const result = renderDashboard(makeState({ error: 'Connection refused' }));
    expect(stripAnsi(result)).toContain('Error: Connection refused');
  });

  it('renders help overlay when showHelp is true', () => {
    const result = renderDashboard(makeState({ showHelp: true }));
    const plain = stripAnsi(result);
    expect(plain).toContain('Keyboard Shortcuts');
    expect(plain).toContain('Quit dashboard');
    expect(plain).toContain('Switch between panels');
  });

  it('highlights selected agent with cursor marker', () => {
    const result = renderDashboard(makeState({
      selectedPanel: 'agents',
      selectedAgentIndex: 1,
      agents: [
        { name: 'agent-a', status: 'idle' },
        { name: 'agent-b', status: 'idle' },
      ],
    }));
    // The selected agent line should have the ">" marker
    const lines = stripAnsi(result).split('\n');
    const agentBLine = lines.find(l => l.includes('agent-b'));
    expect(agentBLine).toBeDefined();
    expect(agentBLine!.includes('>')).toBe(true);
  });

  it('renders with minimum terminal size gracefully', () => {
    // Should not throw with very small terminal
    const result = renderDashboard(makeState({
      termWidth: 60,
      termHeight: 10,
    }));
    expect(result.length).toBeGreaterThan(0);
  });

  it('renders footer with new keyboard shortcuts (s:schedule, Enter:detail)', () => {
    const result = renderDashboard(makeState());
    const plain = stripAnsi(result);
    expect(plain).toContain('s:schedule');
    expect(plain).toContain('Enter:detail');
  });

  it('dispatches to agent-detail view when view is agent-detail', () => {
    const result = renderDashboard(makeState({
      view: 'agent-detail',
      selectedAgentName: 'test-agent',
      agentDetail: {
        name: 'test-agent',
        status: 'idle',
        schedule: '30 5 * * *',
      },
    }));
    const plain = stripAnsi(result);
    expect(plain).toContain('AGENT: test-agent');
    expect(plain).not.toContain('HERALD DASHBOARD');
  });

  it('dispatches to schedule view when view is schedule', () => {
    const result = renderDashboard(makeState({
      view: 'schedule',
      schedules: [
        { name: 'scout', cron: '30 5 * * *', enabled: true },
      ],
    }));
    const plain = stripAnsi(result);
    expect(plain).toContain('SCHEDULE MANAGER');
    expect(plain).not.toContain('HERALD DASHBOARD');
  });
});

// ── Agent Detail View Rendering ─────────────────────────────

describe('renderAgentDetailView', () => {
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
      view: 'agent-detail',
      selectedAgentName: null,
      agentDetail: null,
      schedules: [],
      selectedScheduleIndex: 0,
      // Story 5.5: Real-Time Dashboard Updates
      connectionStatus: 'connected',
      recentChanges: [],
      lastAgentStates: new Map(),
      ...overrides,
    };
  }

  it('renders agent name in header', () => {
    const result = renderAgentDetailView(makeState({
      selectedAgentName: 'ml-researcher',
      agentDetail: { name: 'ml-researcher', status: 'idle' },
    }));
    const plain = stripAnsi(result);
    expect(plain).toContain('AGENT: ml-researcher');
  });

  it('shows [Back] label in header', () => {
    const result = renderAgentDetailView(makeState({
      selectedAgentName: 'scout',
      agentDetail: { name: 'scout', status: 'idle' },
    }));
    const plain = stripAnsi(result);
    expect(plain).toContain('[Back]');
  });

  it('shows loading state when agentDetail is null', () => {
    const result = renderAgentDetailView(makeState({
      selectedAgentName: 'scout',
      agentDetail: null,
    }));
    const plain = stripAnsi(result);
    expect(plain).toContain('Loading agent details');
  });

  it('shows agent status', () => {
    const result = renderAgentDetailView(makeState({
      agentDetail: { name: 'scout', status: 'idle' },
    }));
    const plain = stripAnsi(result);
    expect(plain).toContain('Status:');
    expect(plain).toContain('idle');
  });

  it('shows agent schedule', () => {
    const result = renderAgentDetailView(makeState({
      agentDetail: { name: 'scout', status: 'idle', schedule: '30 5,11,17,23 * * *' },
    }));
    const plain = stripAnsi(result);
    expect(plain).toContain('Schedule:');
    expect(plain).toContain('30 5,11,17,23 * * *');
  });

  it('shows "not configured" when schedule is missing', () => {
    const result = renderAgentDetailView(makeState({
      agentDetail: { name: 'scout', status: 'idle' },
    }));
    const plain = stripAnsi(result);
    expect(plain).toContain('not configured');
  });

  it('shows last run information', () => {
    const result = renderAgentDetailView(makeState({
      agentDetail: {
        name: 'scout',
        status: 'idle',
        lastRun: new Date().toISOString(),
        lastRunStatus: 'success',
        lastRunDuration: '12m',
      },
    }));
    const plain = stripAnsi(result);
    expect(plain).toContain('Last Run:');
    expect(plain).toContain('success');
    expect(plain).toContain('12m');
  });

  it('shows "never" when last run is missing', () => {
    const result = renderAgentDetailView(makeState({
      agentDetail: { name: 'scout', status: 'idle' },
    }));
    const plain = stripAnsi(result);
    expect(plain).toContain('never');
  });

  it('shows session limit', () => {
    const result = renderAgentDetailView(makeState({
      agentDetail: { name: 'scout', status: 'idle', sessionLimit: 15 },
    }));
    const plain = stripAnsi(result);
    expect(plain).toContain('Session Limit:');
    expect(plain).toContain('15');
  });

  it('shows discovery mode', () => {
    const result = renderAgentDetailView(makeState({
      agentDetail: { name: 'scout', status: 'idle', discoveryMode: 'aggressive' },
    }));
    const plain = stripAnsi(result);
    expect(plain).toContain('Discovery Mode:');
    expect(plain).toContain('aggressive');
  });

  it('shows team eligibility', () => {
    const result = renderAgentDetailView(makeState({
      agentDetail: { name: 'scout', status: 'idle', teamEligible: true },
    }));
    const plain = stripAnsi(result);
    expect(plain).toContain('Team Eligible:');
    expect(plain).toContain('yes');
  });

  it('shows team eligibility as no', () => {
    const result = renderAgentDetailView(makeState({
      agentDetail: { name: 'scout', status: 'idle', teamEligible: false },
    }));
    const plain = stripAnsi(result);
    expect(plain).toContain('no');
  });

  it('shows memory paths', () => {
    const result = renderAgentDetailView(makeState({
      agentDetail: {
        name: 'scout',
        status: 'idle',
        memoryPaths: {
          knowledge: 'memory/agents/scout/knowledge',
          preferences: 'memory/agents/scout/prefs',
        },
      },
    }));
    const plain = stripAnsi(result);
    expect(plain).toContain('Memory Paths:');
    expect(plain).toContain('knowledge:');
    expect(plain).toContain('memory/agents/scout/knowledge');
  });

  it('shows last error when present', () => {
    const result = renderAgentDetailView(makeState({
      agentDetail: {
        name: 'scout',
        status: 'error',
        lastError: 'Connection timeout',
      },
    }));
    const plain = stripAnsi(result);
    expect(plain).toContain('Last Error:');
    expect(plain).toContain('Connection timeout');
  });

  it('shows footer with Esc:back and r:refresh', () => {
    const result = renderAgentDetailView(makeState({
      agentDetail: { name: 'scout', status: 'idle' },
    }));
    const plain = stripAnsi(result);
    expect(plain).toContain('Esc:back');
    expect(plain).toContain('r:refresh');
  });

  it('shows error overlay when error is set', () => {
    const result = renderAgentDetailView(makeState({
      agentDetail: { name: 'scout', status: 'idle' },
      error: 'Connection failed',
    }));
    const plain = stripAnsi(result);
    expect(plain).toContain('Error: Connection failed');
  });

  it('renders with minimum terminal size gracefully', () => {
    const result = renderAgentDetailView(makeState({
      termWidth: 60,
      termHeight: 10,
      agentDetail: { name: 'scout', status: 'idle' },
    }));
    expect(result.length).toBeGreaterThan(0);
  });
});

// ── Schedule View Rendering ─────────────────────────────────

describe('renderScheduleView', () => {
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
      view: 'schedule',
      selectedAgentName: null,
      agentDetail: null,
      schedules: [],
      selectedScheduleIndex: 0,
      // Story 5.5: Real-Time Dashboard Updates
      connectionStatus: 'connected',
      recentChanges: [],
      lastAgentStates: new Map(),
      ...overrides,
    };
  }

  it('renders SCHEDULE MANAGER header', () => {
    const result = renderScheduleView(makeState());
    const plain = stripAnsi(result);
    expect(plain).toContain('SCHEDULE MANAGER');
  });

  it('shows [Back] label in header', () => {
    const result = renderScheduleView(makeState());
    const plain = stripAnsi(result);
    expect(plain).toContain('[Back]');
  });

  it('shows table headers (Agent, Schedule, Next Run)', () => {
    const result = renderScheduleView(makeState());
    const plain = stripAnsi(result);
    expect(plain).toContain('Agent');
    expect(plain).toContain('Schedule');
    expect(plain).toContain('Next Run');
  });

  it('shows "No schedules configured" when empty', () => {
    const result = renderScheduleView(makeState({ schedules: [] }));
    const plain = stripAnsi(result);
    expect(plain).toContain('No schedules configured');
  });

  it('renders schedule entries', () => {
    const result = renderScheduleView(makeState({
      schedules: [
        { name: 'ml-researcher', cron: '30 5,11,17,23 * * *', nextRun: '06:30', enabled: true },
        { name: 'newspaper', cron: '0 6 * * *', nextRun: '06:00', enabled: true },
      ],
    }));
    const plain = stripAnsi(result);
    expect(plain).toContain('ml-researcher');
    expect(plain).toContain('30 5,11,17,23 * * *');
    expect(plain).toContain('06:30');
    expect(plain).toContain('newspaper');
    expect(plain).toContain('0 6 * * *');
    expect(plain).toContain('06:00');
  });

  it('highlights selected schedule with cursor marker', () => {
    const result = renderScheduleView(makeState({
      selectedScheduleIndex: 1,
      schedules: [
        { name: 'agent-a', cron: '* * * * *', enabled: true },
        { name: 'agent-b', cron: '0 6 * * *', enabled: true },
      ],
    }));
    const lines = stripAnsi(result).split('\n');
    const agentBLine = lines.find(l => l.includes('agent-b'));
    expect(agentBLine).toBeDefined();
    expect(agentBLine!.includes('>')).toBe(true);
  });

  it('does not highlight unselected schedules with cursor', () => {
    const result = renderScheduleView(makeState({
      selectedScheduleIndex: 1,
      schedules: [
        { name: 'agent-a', cron: '* * * * *', enabled: true },
        { name: 'agent-b', cron: '0 6 * * *', enabled: true },
      ],
    }));
    const lines = stripAnsi(result).split('\n');
    const agentALine = lines.find(l => l.includes('agent-a'));
    expect(agentALine).toBeDefined();
    // agent-a line should not start with >
    expect(agentALine!.trimStart().startsWith('>')).toBe(false);
  });

  it('shows footer with Esc:back, j/k:nav, r:refresh', () => {
    const result = renderScheduleView(makeState());
    const plain = stripAnsi(result);
    expect(plain).toContain('Esc:back');
    expect(plain).toContain('j/k:nav');
    expect(plain).toContain('r:refresh');
  });

  it('shows error overlay when error is set', () => {
    const result = renderScheduleView(makeState({
      error: 'Schedule fetch failed',
    }));
    const plain = stripAnsi(result);
    expect(plain).toContain('Error: Schedule fetch failed');
  });

  it('renders with minimum terminal size gracefully', () => {
    const result = renderScheduleView(makeState({
      termWidth: 60,
      termHeight: 10,
      schedules: [
        { name: 'scout', cron: '30 5 * * *', enabled: true },
      ],
    }));
    expect(result.length).toBeGreaterThan(0);
  });

  it('shows disabled indicator for disabled schedules', () => {
    const result = renderScheduleView(makeState({
      schedules: [
        { name: 'disabled-agent', cron: '0 6 * * *', enabled: false },
      ],
    }));
    const plain = stripAnsi(result);
    expect(plain).toContain('disabled');
  });
});

// ── Story 5.5: Connection Status Rendering ──────────────────

describe('renderConnectionStatus', () => {
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
      connectionStatus: 'connected',
      recentChanges: [],
      lastAgentStates: new Map(),
      ...overrides,
    };
  }

  it('shows green dot and "Connected" when connected', () => {
    const result = renderConnectionStatus(makeState({
      connectionStatus: 'connected',
      daemon: { uptime: 100, version: '0.0.1' },
    }));
    const plain = stripAnsi(result.text);
    expect(plain).toContain('Connected');
    // Check the dot is present (bullet character)
    expect(plain).toContain('\u25cf');
  });

  it('shows uptime when connected with daemon info', () => {
    const result = renderConnectionStatus(makeState({
      connectionStatus: 'connected',
      daemon: { uptime: 8100, version: '0.0.1' },
    }));
    const plain = stripAnsi(result.text);
    expect(plain).toContain('Uptime:');
    expect(plain).toContain('2h 15m');
  });

  it('shows yellow dot and "Connecting..." when connecting', () => {
    const result = renderConnectionStatus(makeState({
      connectionStatus: 'connecting',
    }));
    const plain = stripAnsi(result.text);
    expect(plain).toContain('Connecting...');
    expect(plain).toContain('\u25cf');
  });

  it('shows red dot and "Disconnected" when disconnected', () => {
    const result = renderConnectionStatus(makeState({
      connectionStatus: 'disconnected',
    }));
    const plain = stripAnsi(result.text);
    expect(plain).toContain('Disconnected');
    expect(plain).toContain('\u25cf');
  });

  it('returns correct visible length for connected state', () => {
    const result = renderConnectionStatus(makeState({
      connectionStatus: 'connected',
      daemon: { uptime: 100, version: '0.0.1' },
    }));
    // visibleLen should match the actual stripped length
    expect(result.visibleLen).toBe(stripAnsi(result.text).length);
  });

  it('returns correct visible length for connecting state', () => {
    const result = renderConnectionStatus(makeState({
      connectionStatus: 'connecting',
    }));
    expect(result.visibleLen).toBe(stripAnsi(result.text).length);
  });

  it('returns correct visible length for disconnected state', () => {
    const result = renderConnectionStatus(makeState({
      connectionStatus: 'disconnected',
    }));
    expect(result.visibleLen).toBe(stripAnsi(result.text).length);
  });
});

// ── Story 5.5: Notification Area Rendering ──────────────────

describe('renderNotificationArea', () => {
  const now = new Date('2026-03-01T12:00:30Z');

  it('returns empty array when no recent changes', () => {
    const result = renderNotificationArea([], now);
    expect(result).toEqual([]);
  });

  it('shows notification for agent-completed change', () => {
    const changes: RecentChange[] = [
      {
        type: 'agent-completed',
        agentName: 'ml-researcher',
        timestamp: new Date('2026-03-01T12:00:00Z'),
      },
    ];
    const result = renderNotificationArea(changes, now);
    expect(result.length).toBeGreaterThan(0);
    const plain = stripAnsi(result.join('\n'));
    expect(plain).toContain('ml-researcher completed patrol');
    expect(plain).toContain('30s ago');
  });

  it('shows notification for agent-failed change', () => {
    const changes: RecentChange[] = [
      {
        type: 'agent-failed',
        agentName: 'scout',
        timestamp: new Date('2026-03-01T12:00:00Z'),
      },
    ];
    const result = renderNotificationArea(changes, now);
    const plain = stripAnsi(result.join('\n'));
    expect(plain).toContain('scout failed');
    expect(plain).toContain('30s ago');
  });

  it('shows notification for newspaper-updated change', () => {
    const changes: RecentChange[] = [
      {
        type: 'newspaper-updated',
        timestamp: new Date('2026-03-01T11:59:30Z'),
      },
    ];
    const result = renderNotificationArea(changes, now);
    const plain = stripAnsi(result.join('\n'));
    expect(plain).toContain('Newspaper updated');
    expect(plain).toContain('1m ago');
  });

  it('shows only the most recent change when multiple exist', () => {
    const changes: RecentChange[] = [
      {
        type: 'agent-completed',
        agentName: 'old-agent',
        timestamp: new Date('2026-03-01T12:00:00Z'),
      },
      {
        type: 'agent-failed',
        agentName: 'new-agent',
        timestamp: new Date('2026-03-01T12:00:20Z'),
      },
    ];
    const result = renderNotificationArea(changes, now);
    const plain = stripAnsi(result.join('\n'));
    expect(plain).toContain('new-agent failed');
    expect(plain).not.toContain('old-agent');
  });
});

// ── Story 5.5: Recent Change Highlighting ───────────────────

describe('recent change highlighting in agent panel', () => {
  function makeState(overrides: Partial<DashboardState> = {}): DashboardState {
    return {
      agents: [],
      newspaper: null,
      daemon: { uptime: 100, version: '0.0.1' },
      selectedPanel: 'agents',
      selectedAgentIndex: 0,
      newspaperScrollOffset: 0,
      termWidth: 120,
      termHeight: 24,
      lastUpdate: new Date(),
      error: null,
      showHelp: false,
      view: 'main',
      selectedAgentName: null,
      agentDetail: null,
      schedules: [],
      selectedScheduleIndex: 0,
      // Story 5.5: Real-Time Dashboard Updates
      connectionStatus: 'connected',
      recentChanges: [],
      lastAgentStates: new Map(),
      ...overrides,
    };
  }

  it('shows NEW indicator for recently changed agent', () => {
    const now = new Date('2026-03-01T12:00:10Z');
    const result = renderDashboard(makeState({
      agents: [
        { name: 'scout', status: 'idle', lastRun: '2026-03-01T12:00:00Z' },
      ],
      recentChanges: [
        {
          type: 'agent-completed',
          agentName: 'scout',
          timestamp: now, // just now
        },
      ],
    }));
    const plain = stripAnsi(result);
    expect(plain).toContain('NEW');
  });

  it('does not show NEW indicator when no recent changes', () => {
    const result = renderDashboard(makeState({
      agents: [
        { name: 'scout', status: 'idle', lastRun: '2026-03-01T12:00:00Z' },
      ],
      recentChanges: [],
    }));
    const plain = stripAnsi(result);
    // Find the agent line specifically (not the NEWSPAPER header which contains "NEW")
    const lines = plain.split('\n');
    const scoutLine = lines.find(l => l.includes('scout') && l.includes('[ok]'));
    expect(scoutLine).toBeDefined();
    expect(scoutLine!).not.toContain('NEW');
  });

  it('shows notification area below agent list', () => {
    const now = new Date('2026-03-01T12:00:30Z');
    const result = renderDashboard(makeState({
      agents: [
        { name: 'scout', status: 'idle', lastRun: '2026-03-01T12:00:00Z' },
      ],
      recentChanges: [
        {
          type: 'agent-completed',
          agentName: 'scout',
          timestamp: new Date('2026-03-01T12:00:00Z'),
        },
      ],
    }));
    const plain = stripAnsi(result);
    expect(plain).toContain('scout completed patrol');
  });

  it('renders connection status in dashboard header', () => {
    const result = renderDashboard(makeState({
      connectionStatus: 'connecting',
    }));
    const plain = stripAnsi(result);
    expect(plain).toContain('Connecting...');
  });

  it('renders brightWhite formatting correctly', () => {
    const result = brightWhite('test');
    expect(result).toBe('\x1b[1;97mtest\x1b[0m');
    expect(stripAnsi(result)).toBe('test');
  });
});
