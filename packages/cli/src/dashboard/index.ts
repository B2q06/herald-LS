/**
 * Herald TUI Dashboard — main entry point.
 *
 * Sets up raw terminal mode, polls the daemon API on an interval,
 * renders the dashboard, and handles keyboard input.
 */

import { clearScreen, hideCursor, showCursor, renderDashboard } from './renderer.ts';
import { createInitialState, fetchState, type DashboardState } from './state.ts';
import { parseKeypress, applyAction, type InputState, type DashboardAction } from './input.ts';

const DEFAULT_POLL_INTERVAL_MS = 5000;
const RECONNECT_POLL_INTERVAL_MS = 2000;

/**
 * Start the interactive TUI dashboard.
 * Blocks until the user presses q or Ctrl+C.
 */
export async function startDashboard(pollIntervalMs = DEFAULT_POLL_INTERVAL_MS): Promise<void> {
  // ── TTY Guard ────────────────────────────────────────────────
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error('Dashboard requires an interactive terminal (TTY). Pipe and redirect are not supported.');
  }

  let state = createInitialState();
  // Start with 'connecting' status before first fetch
  state.connectionStatus = 'connecting';
  let running = true;
  let refreshInProgress = false;
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let currentPollInterval = pollIntervalMs;

  // ── Terminal Setup ──────────────────────────────────────────
  const stdin = process.stdin;
  const stdout = process.stdout;

  // Save terminal state
  if (stdin.isTTY) {
    stdin.setRawMode(true);
  }
  stdin.resume();
  stdin.setEncoding('utf8');

  // Hide cursor
  stdout.write(hideCursor());

  // ── Cleanup Function ────────────────────────────────────────
  function cleanup(): void {
    running = false;
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
    // Remove event listeners to prevent leaks
    stdin.removeListener('data', onData);
    process.removeListener('SIGWINCH', onResize);
    process.removeListener('SIGINT', onSigint);
    process.removeListener('SIGTERM', onSigint);
    if (stdin.isTTY) {
      stdin.setRawMode(false);
    }
    stdin.pause();
    stdout.write(showCursor());
    stdout.write(clearScreen());
  }

  // ── Render ──────────────────────────────────────────────────
  function render(): void {
    const content = renderDashboard(state);
    stdout.write(clearScreen() + content);
  }

  // ── Fetch & Render ──────────────────────────────────────────
  async function refresh(): Promise<void> {
    if (refreshInProgress) return;
    refreshInProgress = true;
    try {
      const wasDisconnected = state.connectionStatus === 'disconnected'
        || state.connectionStatus === 'connecting';
      state = await fetchState(state);

      // Story 5.5: Adaptive polling interval
      if (state.connectionStatus === 'disconnected') {
        // Switch to faster polling during disconnection
        if (currentPollInterval !== RECONNECT_POLL_INTERVAL_MS) {
          currentPollInterval = RECONNECT_POLL_INTERVAL_MS;
          restartPolling();
        }
      } else if (state.connectionStatus === 'connected' && wasDisconnected) {
        // Reconnected — restore normal polling interval
        if (currentPollInterval !== pollIntervalMs) {
          currentPollInterval = pollIntervalMs;
          restartPolling();
        }
      }

      if (running) render();
    } finally {
      refreshInProgress = false;
    }
  }

  /** Error handler for fire-and-forget refresh() calls. */
  function refreshWithCatch(): void {
    refresh().catch((err) => {
      state = { ...state, error: `Refresh error: ${String(err)}` };
      render();
    });
  }

  /** Restart the polling timer with the current interval. */
  function restartPolling(): void {
    if (pollTimer) {
      clearInterval(pollTimer);
    }
    pollTimer = setInterval(() => {
      if (running) refreshWithCatch();
    }, currentPollInterval);
  }

  // ── Handle Terminal Resize ──────────────────────────────────
  function onResize(): void {
    state = {
      ...state,
      termWidth: stdout.columns || 80,
      termHeight: stdout.rows || 24,
    };
    if (running) render();
  }
  process.on('SIGWINCH', onResize);

  // ── Handle Keyboard Input ───────────────────────────────────
  function onData(data: Buffer | string): void {
    const buf = typeof data === 'string' ? Buffer.from(data) : data;
    const action = parseKeypress(buf);

    if (action.type === 'quit') {
      cleanup();
      process.exit(0);
    }

    if (action.type === 'refresh') {
      refreshWithCatch();
      return;
    }

    // Build the input state subset needed by applyAction
    const inputState: InputState = {
      selectedPanel: state.selectedPanel,
      selectedAgentIndex: state.selectedAgentIndex,
      newspaperScrollOffset: state.newspaperScrollOffset,
      agentCount: state.agents.length,
      newspaperLineCount: state.newspaper?.content.split('\n').length ?? 0,
      bodyHeight: Math.max(5, state.termHeight - 6),
      showHelp: state.showHelp,
      // Story 5.3 & 5.4: View management
      view: state.view,
      selectedAgentName: state.selectedAgentName,
      selectedScheduleIndex: state.selectedScheduleIndex,
      scheduleCount: state.schedules.length,
    };

    const updated = applyAction(inputState, action);

    state = {
      ...state,
      selectedPanel: updated.selectedPanel,
      selectedAgentIndex: updated.selectedAgentIndex,
      newspaperScrollOffset: updated.newspaperScrollOffset,
      showHelp: updated.showHelp,
      view: updated.view,
      selectedAgentName: updated.selectedAgentName,
      selectedScheduleIndex: updated.selectedScheduleIndex,
    };

    // Handle view transitions that need additional state changes
    handleViewTransition(state, action);

    render();

    // If we just entered a new view that needs data, fetch it
    if (updated.view !== inputState.view) {
      if (updated.view === 'agent-detail' || updated.view === 'schedule') {
        refreshWithCatch();
      }
    }
  }

  /**
   * Handle view transition side effects (setting agent name, clearing details).
   */
  function handleViewTransition(s: DashboardState, action: DashboardAction): void {
    // Entering agent-detail: set the selected agent name from the agents list
    if (action.type === 'select' && s.view === 'agent-detail') {
      const agent = s.agents[s.selectedAgentIndex];
      if (agent) {
        state = { ...state, selectedAgentName: agent.name };
      }
    }

    // Leaving agent-detail: clear the detail data
    if (action.type === 'back' && s.view === 'main') {
      state = { ...state, agentDetail: null };
    }
  }

  stdin.on('data', onData);

  // ── Handle Graceful Shutdown ────────────────────────────────
  function onSigint(): void {
    cleanup();
    process.exit(0);
  }
  process.on('SIGINT', onSigint);
  process.on('SIGTERM', onSigint);

  // ── Initial Fetch ───────────────────────────────────────────
  await refresh();

  // ── Start Polling ───────────────────────────────────────────
  pollTimer = setInterval(() => {
    if (running) refreshWithCatch();
  }, pollIntervalMs);

  // Keep the process alive until cleanup is called.
  // This returns a promise that never resolves (dashboard runs until quit).
  return new Promise<void>(() => {
    // Intentionally unresolved — the dashboard runs until process.exit() is called.
  });
}
