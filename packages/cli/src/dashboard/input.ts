/**
 * Keyboard input handler for the Herald TUI dashboard.
 * Parses raw stdin keypress data and maps to dashboard actions.
 */

import type { ViewMode } from './state.ts';

// ── Action Types ───────────────────────────────────────────────

export type DashboardAction =
  | { type: 'quit' }
  | { type: 'switchPanel' }
  | { type: 'moveDown' }
  | { type: 'moveUp' }
  | { type: 'refresh' }
  | { type: 'select' }
  | { type: 'back' }
  | { type: 'schedule' }
  | { type: 'help' }
  | { type: 'unknown' };

// ── Keypress Parsing ───────────────────────────────────────────

/**
 * Parse a raw stdin Buffer into a DashboardAction.
 *
 * Raw mode keypress byte sequences:
 * - Regular chars: single byte (e.g., 0x71 = 'q')
 * - Ctrl+C: 0x03
 * - Tab: 0x09
 * - Enter: 0x0D
 * - Escape sequences: 0x1B 0x5B <code>
 *   - Up arrow:   0x1B 0x5B 0x41
 *   - Down arrow:  0x1B 0x5B 0x42
 */
export function parseKeypress(data: Buffer): DashboardAction {
  if (data.length === 0) {
    return { type: 'unknown' };
  }

  const byte = data[0];

  // Ctrl+C
  if (byte === 0x03) {
    return { type: 'quit' };
  }

  // Tab
  if (byte === 0x09) {
    return { type: 'switchPanel' };
  }

  // Enter / Return
  if (byte === 0x0d) {
    return { type: 'select' };
  }

  // Escape sequences (arrows, etc.)
  if (byte === 0x1b) {
    // Bare Esc key (no following sequence)
    if (data.length === 1) {
      return { type: 'back' };
    }
    // Arrow key sequences: ESC [ <code>
    if (data.length >= 3 && data[1] === 0x5b) {
      switch (data[2]) {
        case 0x41: // Up arrow
          return { type: 'moveUp' };
        case 0x42: // Down arrow
          return { type: 'moveDown' };
        default:
          return { type: 'unknown' };
      }
    }
    return { type: 'unknown' };
  }

  // Single character keys
  const char = String.fromCharCode(byte);
  switch (char) {
    case 'q':
    case 'Q':
      return { type: 'quit' };
    case 'j':
      return { type: 'moveDown' };
    case 'k':
      return { type: 'moveUp' };
    case 'r':
    case 'R':
      return { type: 'refresh' };
    case 's':
    case 'S':
      return { type: 'schedule' };
    case '?':
      return { type: 'help' };
    default:
      // Any key dismisses help overlay
      return { type: 'unknown' };
  }
}

/**
 * Apply an action to the dashboard state, returning a new state.
 * This is the pure reducer for UI state changes (not data fetching).
 */
export interface InputState {
  selectedPanel: 'agents' | 'newspaper';
  selectedAgentIndex: number;
  newspaperScrollOffset: number;
  agentCount: number;
  newspaperLineCount: number;
  bodyHeight: number;
  showHelp: boolean;
  // Story 5.3 & 5.4: View management
  view: ViewMode;
  selectedAgentName: string | null;
  selectedScheduleIndex: number;
  scheduleCount: number;
}

export function applyAction(state: InputState, action: DashboardAction): InputState {
  const next = { ...state };

  // If help is showing and any non-help, non-quit key is pressed, dismiss help
  if (state.showHelp && action.type !== 'help' && action.type !== 'quit') {
    next.showHelp = false;
    return next;
  }

  // ── View-specific handling ─────────────────────────────────

  // Agent Detail view
  if (state.view === 'agent-detail') {
    switch (action.type) {
      case 'back':
        next.view = 'main';
        next.selectedAgentName = null;
        return next;
      case 'help':
        next.showHelp = !state.showHelp;
        return next;
      // quit, refresh handled by caller; other keys are no-ops
      default:
        return next;
    }
  }

  // Schedule view
  if (state.view === 'schedule') {
    switch (action.type) {
      case 'back':
        next.view = 'main';
        return next;
      case 'moveDown':
        next.selectedScheduleIndex = Math.min(
          state.selectedScheduleIndex + 1,
          Math.max(0, state.scheduleCount - 1),
        );
        return next;
      case 'moveUp':
        next.selectedScheduleIndex = Math.max(0, state.selectedScheduleIndex - 1);
        return next;
      case 'help':
        next.showHelp = !state.showHelp;
        return next;
      // quit, refresh handled by caller; other keys are no-ops
      default:
        return next;
    }
  }

  // ── Main view handling ─────────────────────────────────────

  switch (action.type) {
    case 'switchPanel':
      next.selectedPanel = state.selectedPanel === 'agents' ? 'newspaper' : 'agents';
      break;

    case 'moveDown':
      if (state.selectedPanel === 'agents') {
        next.selectedAgentIndex = Math.min(
          state.selectedAgentIndex + 1,
          Math.max(0, state.agentCount - 1),
        );
      } else {
        const maxScroll = Math.max(0, state.newspaperLineCount - state.bodyHeight + 3);
        next.newspaperScrollOffset = Math.min(
          state.newspaperScrollOffset + 1,
          maxScroll,
        );
      }
      break;

    case 'moveUp':
      if (state.selectedPanel === 'agents') {
        next.selectedAgentIndex = Math.max(0, state.selectedAgentIndex - 1);
      } else {
        next.newspaperScrollOffset = Math.max(0, state.newspaperScrollOffset - 1);
      }
      break;

    case 'select':
      // Enter on agents panel → drill into agent detail
      if (state.selectedPanel === 'agents' && state.agentCount > 0) {
        next.view = 'agent-detail';
        // selectedAgentName is set by the caller (who has the agent names)
      }
      break;

    case 'schedule':
      next.view = 'schedule';
      next.selectedScheduleIndex = 0;
      break;

    case 'back':
      // Already on main view, Esc is a no-op
      break;

    case 'help':
      next.showHelp = !state.showHelp;
      break;

    // quit, refresh, unknown — handled by caller
    default:
      break;
  }

  return next;
}
