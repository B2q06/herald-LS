/**
 * Dashboard state management.
 * Defines the state shape and provides functions to create and update it
 * by polling the Herald daemon API.
 */

import { get, DaemonUnreachableError, agentPath } from '../utils/api-client.ts';

// ── Types ──────────────────────────────────────────────────────

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected';

export interface RecentChange {
  type: 'agent-completed' | 'agent-failed' | 'newspaper-updated';
  agentName?: string;
  timestamp: Date;
}

export interface Agent {
  name: string;
  config?: Record<string, unknown>;
  status: string;
  registeredAt?: string;
  lastRun?: string;
  lastError?: string;
}

export interface AgentDetail {
  name: string;
  status: string;
  schedule?: string;
  lastRun?: string;
  lastRunStatus?: string;
  lastRunDuration?: string;
  sessionLimit?: number;
  discoveryMode?: string;
  teamEligible?: boolean;
  memoryPaths?: Record<string, string>;
  config?: Record<string, unknown>;
  registeredAt?: string;
  lastError?: string;
}

export interface Schedule {
  name: string;
  cron: string;
  nextRun?: string;
  enabled: boolean;
}

export interface Newspaper {
  editionDate: string;
  content: string;
}

export interface DaemonInfo {
  uptime: number;
  version: string;
}

export type ViewMode = 'main' | 'agent-detail' | 'schedule';

export interface DashboardState {
  agents: Agent[];
  newspaper: Newspaper | null;
  daemon: DaemonInfo | null;
  selectedPanel: 'agents' | 'newspaper';
  selectedAgentIndex: number;
  newspaperScrollOffset: number;
  termWidth: number;
  termHeight: number;
  lastUpdate: Date | null;
  error: string | null;
  showHelp: boolean;
  // Story 5.3: Agent Drill-In View
  view: ViewMode;
  selectedAgentName: string | null;
  agentDetail: AgentDetail | null;
  // Story 5.4: Schedule View
  schedules: Schedule[];
  selectedScheduleIndex: number;
  // Story 5.5: Real-Time Dashboard Updates
  connectionStatus: ConnectionStatus;
  recentChanges: RecentChange[];
  lastAgentStates: Map<string, string>; // name -> lastRun for change detection
}

// ── API Response Shapes ────────────────────────────────────────

interface HealthResponse {
  status: string;
  uptime: number;
}

interface AgentsResponse {
  agents: Agent[];
}

interface NewspaperResponse {
  editionDate: string;
  content: string;
}

interface AgentDetailResponse {
  name: string;
  config?: Record<string, unknown>;
  status: string;
  registeredAt?: string;
  lastRun?: string;
  lastError?: string;
}

interface ScheduleResponse {
  schedules: Array<{
    agentName?: string;
    name?: string;
    cronExpression?: string;
    cron?: string;
    nextRun?: string;
    enabled?: boolean;
  }>;
}

// ── State Functions ────────────────────────────────────────────

/** Create the initial dashboard state with sensible defaults. */
export function createInitialState(): DashboardState {
  return {
    agents: [],
    newspaper: null,
    daemon: null,
    selectedPanel: 'agents',
    selectedAgentIndex: 0,
    newspaperScrollOffset: 0,
    termWidth: process.stdout.columns || 80,
    termHeight: process.stdout.rows || 24,
    lastUpdate: null,
    error: null,
    showHelp: false,
    // Story 5.3: Agent Drill-In View
    view: 'main',
    selectedAgentName: null,
    agentDetail: null,
    // Story 5.4: Schedule View
    schedules: [],
    selectedScheduleIndex: 0,
    // Story 5.5: Real-Time Dashboard Updates
    connectionStatus: 'connecting',
    recentChanges: [],
    lastAgentStates: new Map(),
  };
}

/**
 * Fetch current state from the daemon API.
 * Returns a new state object with updated data.
 * On failure, sets the error field and clears daemon info.
 *
 * @param current - The current dashboard state
 * @param now - Current time for testability (defaults to new Date())
 */
export async function fetchState(current: DashboardState, now: Date = new Date()): Promise<DashboardState> {
  const next: DashboardState = { ...current, error: null };

  try {
    // Fetch all endpoints in parallel
    const fetches: [
      Promise<HealthResponse>,
      Promise<AgentsResponse>,
      Promise<NewspaperResponse | null>,
      Promise<AgentDetailResponse | null>,
      Promise<ScheduleResponse | null>,
    ] = [
      get<HealthResponse>('/health'),
      get<AgentsResponse>('/api/agents'),
      get<NewspaperResponse>('/api/newspaper/current').catch(() => null),
      // Fetch agent detail when viewing agent-detail view
      current.view === 'agent-detail' && current.selectedAgentName
        ? get<AgentDetailResponse>(`/api/agents/${agentPath(current.selectedAgentName)}`).catch(() => null)
        : Promise.resolve(null),
      // Fetch schedules when viewing schedule view
      current.view === 'schedule'
        ? get<ScheduleResponse>('/api/schedule').catch(() => null)
        : Promise.resolve(null),
    ];

    const [health, agentsData, newspaperData, agentDetailData, scheduleData] = await Promise.all(fetches);

    next.daemon = {
      uptime: health.uptime,
      version: '0.0.1', // health endpoint may not include version
    };
    next.agents = agentsData.agents;
    next.newspaper = newspaperData;
    next.lastUpdate = now;

    // Story 5.5: Connection status — successful fetch
    next.connectionStatus = 'connected';

    // Story 5.5: Change detection — compare agent lastRun with previous state
    const newChanges = detectChanges(current.lastAgentStates, agentsData.agents, now);
    // Merge new changes with existing, then prune old ones
    next.recentChanges = pruneOldChanges(
      [...current.recentChanges, ...newChanges],
      now,
    );

    // Update lastAgentStates for next comparison
    next.lastAgentStates = buildAgentStateMap(agentsData.agents);

    // Clamp selectedAgentIndex if agents list changed
    if (next.agents.length > 0) {
      next.selectedAgentIndex = Math.min(
        next.selectedAgentIndex,
        next.agents.length - 1,
      );
    } else {
      next.selectedAgentIndex = 0;
    }

    // Update agent detail if fetched
    if (agentDetailData) {
      next.agentDetail = parseAgentDetail(agentDetailData);
    }

    // Update schedules if fetched — map daemon response fields to internal Schedule type
    if (scheduleData) {
      next.schedules = scheduleData.schedules.map((s) => ({
        name: s.agentName ?? s.name ?? 'unknown',
        cron: s.cronExpression ?? s.cron ?? '',
        nextRun: s.nextRun,
        enabled: s.enabled ?? true,
      }));
      // Clamp selectedScheduleIndex
      if (next.schedules.length > 0) {
        next.selectedScheduleIndex = Math.min(
          next.selectedScheduleIndex,
          next.schedules.length - 1,
        );
      } else {
        next.selectedScheduleIndex = 0;
      }
    }
  } catch (err) {
    if (err instanceof DaemonUnreachableError) {
      next.daemon = null;
      next.error = 'Daemon unreachable. Is it running?';
    } else {
      next.error = (err as Error).message || 'Unknown error';
    }
    // Story 5.5: Connection status — failed fetch
    next.connectionStatus = 'disconnected';
  }

  return next;
}

// ── Story 5.5: Change Detection Helpers ──────────────────────

/**
 * Build a map of agent name -> lastRun for change detection.
 */
export function buildAgentStateMap(agents: Agent[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const agent of agents) {
    if (agent.lastRun) {
      map.set(agent.name, agent.lastRun);
    }
  }
  return map;
}

/**
 * Compare previous agent states with current agents to detect changes.
 * Returns new RecentChange entries for agents whose lastRun changed.
 */
export function detectChanges(
  prevStates: Map<string, string>,
  agents: Agent[],
  now: Date,
): RecentChange[] {
  const changes: RecentChange[] = [];

  // Skip detection on the very first fetch (empty prevStates)
  if (prevStates.size === 0) {
    return changes;
  }

  for (const agent of agents) {
    if (!agent.lastRun) continue;

    const prevLastRun = prevStates.get(agent.name);
    // New agent or lastRun changed
    if (prevLastRun !== agent.lastRun) {
      const changeType = agent.status === 'failed' || agent.status === 'error'
        ? 'agent-failed'
        : 'agent-completed';
      changes.push({
        type: changeType,
        agentName: agent.name,
        timestamp: now,
      });
    }
  }

  return changes;
}

/**
 * Remove changes older than 60 seconds from the list.
 */
export function pruneOldChanges(
  changes: RecentChange[],
  now: Date,
  maxAgeMs: number = 60_000,
): RecentChange[] {
  return changes.filter(c => now.getTime() - c.timestamp.getTime() < maxAgeMs);
}

/**
 * Check if an agent has a recent change (within the last 30 seconds).
 */
export function hasRecentChange(
  agentName: string,
  recentChanges: RecentChange[],
  now: Date,
  thresholdMs: number = 30_000,
): RecentChange | undefined {
  return recentChanges.find(
    c => c.agentName === agentName && now.getTime() - c.timestamp.getTime() < thresholdMs,
  );
}

/**
 * Format a relative duration for notification display (e.g. "30s ago", "1m ago").
 */
export function formatChangeDuration(change: RecentChange, now: Date): string {
  const diffMs = now.getTime() - change.timestamp.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  if (diffSecs < 60) return `${diffSecs}s ago`;
  const diffMins = Math.floor(diffSecs / 60);
  return `${diffMins}m ago`;
}

/** Parse API response into AgentDetail. */
function parseAgentDetail(data: AgentDetailResponse): AgentDetail {
  const config = data.config || {};
  return {
    name: data.name,
    status: data.status,
    schedule: config.schedule as string | undefined,
    lastRun: data.lastRun,
    lastRunStatus: config.lastRunStatus as string | undefined,
    lastRunDuration: config.lastRunDuration as string | undefined,
    sessionLimit: config.sessionLimit as number | undefined,
    discoveryMode: config.discoveryMode as string | undefined,
    teamEligible: config.teamEligible as boolean | undefined,
    memoryPaths: config.memoryPaths as Record<string, string> | undefined,
    config: data.config,
    registeredAt: data.registeredAt,
    lastError: data.lastError,
  };
}
