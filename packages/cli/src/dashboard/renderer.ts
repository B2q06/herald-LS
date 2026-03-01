/**
 * Terminal rendering utilities for the Herald TUI dashboard.
 * Pure ANSI escape code functions — no external dependencies.
 */

import type { DashboardState, AgentDetail, Schedule, RecentChange } from './state.ts';
import { hasRecentChange, formatChangeDuration } from './state.ts';
import { formatRelativeTime, statusIcon } from '../utils/format.ts';

// ── ANSI Escape Codes ──────────────────────────────────────────

const ESC = '\x1b[';

/** Clear the entire screen and move cursor to top-left. */
export function clearScreen(): string {
  return `${ESC}2J${ESC}H`;
}

/** Move cursor to a specific row and column (1-indexed). */
export function moveTo(row: number, col: number): string {
  return `${ESC}${row};${col}H`;
}

/** Hide the terminal cursor. */
export function hideCursor(): string {
  return `${ESC}?25l`;
}

/** Show the terminal cursor. */
export function showCursor(): string {
  return `${ESC}?25h`;
}

// ── Text Formatting ────────────────────────────────────────────

export function bold(text: string): string {
  return `${ESC}1m${text}${ESC}0m`;
}

export function dim(text: string): string {
  return `${ESC}2m${text}${ESC}0m`;
}

export function green(text: string): string {
  return `${ESC}32m${text}${ESC}0m`;
}

export function red(text: string): string {
  return `${ESC}31m${text}${ESC}0m`;
}

export function yellow(text: string): string {
  return `${ESC}33m${text}${ESC}0m`;
}

export function cyan(text: string): string {
  return `${ESC}36m${text}${ESC}0m`;
}

export function inverse(text: string): string {
  return `${ESC}7m${text}${ESC}0m`;
}

export function brightWhite(text: string): string {
  return `${ESC}1;97m${text}${ESC}0m`;
}

// ── Utility Functions ──────────────────────────────────────────

/** Truncate text to maxLen, adding ellipsis if truncated. */
export function truncate(text: string, maxLen: number): string {
  if (maxLen <= 0) return '';
  if (text.length <= maxLen) return text;
  if (maxLen <= 3) return text.slice(0, maxLen);
  return text.slice(0, maxLen - 1) + '\u2026';
}

/** Pad or truncate text to exactly the given width. */
export function fitWidth(text: string, width: number): string {
  if (width <= 0) return '';
  if (text.length === width) return text;
  if (text.length > width) return truncate(text, width);
  return text + ' '.repeat(width - text.length);
}

/** Strip ANSI escape codes from a string (for length calculations). */
export function stripAnsi(text: string): string {
  // eslint-disable-next-line no-control-regex
  return text.replace(/\x1b\[[0-9;?]*[a-zA-Z]/g, '');
}

/** Get the visible (non-ANSI) length of a string. */
export function visibleLength(text: string): string['length'] {
  return stripAnsi(text).length;
}

// ── Box Drawing ────────────────────────────────────────────────

const BOX = {
  topLeft: '\u2554',     // ╔
  topRight: '\u2557',    // ╗
  bottomLeft: '\u255a',  // ╚
  bottomRight: '\u255d', // ╝
  horizontal: '\u2550',  // ═
  vertical: '\u2551',    // ║
  teeRight: '\u2560',    // ╠
  teeLeft: '\u2563',     // ╣
  teeDown: '\u2566',     // ╦
  teeUp: '\u2569',       // ╩
  cross: '\u256c',       // ╬
  thinHoriz: '\u2500',   // ─
  thinVert: '\u2502',    // │
  thinTeeDown: '\u252c', // ┬
  thinTeeUp: '\u2534',   // ┴
} as const;

/**
 * Draw a bordered box with a title and content lines.
 * Returns an array of strings (one per row).
 */
export function box(title: string, contentLines: string[], width: number): string[] {
  const innerWidth = width - 2; // accounting for left/right borders
  const lines: string[] = [];

  // Top border with title
  const titleDisplay = ` ${title} `;
  const titleLen = titleDisplay.length;
  const remainingHoriz = innerWidth - titleLen;
  const topBorder = BOX.topLeft
    + BOX.horizontal.repeat(Math.min(2, innerWidth))
    + (innerWidth > 2 ? titleDisplay : '')
    + BOX.horizontal.repeat(Math.max(0, remainingHoriz - 2))
    + BOX.topRight;
  lines.push(topBorder);

  // Content lines
  for (const line of contentLines) {
    const visible = stripAnsi(line);
    const padding = Math.max(0, innerWidth - visible.length);
    lines.push(BOX.vertical + line + ' '.repeat(padding) + BOX.vertical);
  }

  // Bottom border
  lines.push(BOX.bottomLeft + BOX.horizontal.repeat(innerWidth) + BOX.bottomRight);

  return lines;
}

/** Draw a horizontal separator line that fits inside a box. */
export function horizontalSep(width: number): string {
  return BOX.teeRight + BOX.horizontal.repeat(width - 2) + BOX.teeLeft;
}

// ── Status Colorization ────────────────────────────────────────

/** Return a colorized status icon. */
function colorizedStatus(status: string): string {
  const icon = statusIcon(status);
  switch (status) {
    case 'success':
    case 'idle':
      return green(icon);
    case 'failed':
    case 'error':
      return red(icon);
    case 'running':
      return yellow(icon);
    case 'pending':
      return dim(icon);
    default:
      return dim(icon);
  }
}

/** Format uptime seconds into a compact display like "2h 15m". */
function formatUptimeCompact(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

// ── Connection Status ───────────────────────────────────────────

/**
 * Render the connection status indicator for the header.
 * Returns both the ANSI-formatted text and its visible length.
 */
export function renderConnectionStatus(state: DashboardState): { text: string; visibleLen: number } {
  switch (state.connectionStatus) {
    case 'connected': {
      const uptimeStr = state.daemon ? formatUptimeCompact(state.daemon.uptime) : '';
      const uptimePart = uptimeStr ? dim(' | ') + dim('Uptime: ') + uptimeStr : '';
      const uptimeVisibleLen = uptimeStr ? ' | Uptime: '.length + uptimeStr.length : 0;
      return {
        text: green('\u25cf') + ' ' + green('Connected') + uptimePart,
        visibleLen: '\u25cf Connected'.length + uptimeVisibleLen,
      };
    }
    case 'connecting':
      return {
        text: yellow('\u25cf') + ' ' + yellow('Connecting...'),
        visibleLen: '\u25cf Connecting...'.length,
      };
    case 'disconnected':
      return {
        text: red('\u25cf') + ' ' + red('Disconnected'),
        visibleLen: '\u25cf Disconnected'.length,
      };
    default:
      return { text: '', visibleLen: 0 };
  }
}

// ── Notification Area ──────────────────────────────────────────

/**
 * Render the notification area showing the most recent change.
 * Returns an array of lines for display below the agent list.
 *
 * @param recentChanges - The list of recent changes
 * @param now - Current time for computing relative timestamps
 */
export function renderNotificationArea(recentChanges: RecentChange[], now: Date): string[] {
  if (recentChanges.length === 0) return [];

  // Show the most recent change
  const latest = recentChanges[recentChanges.length - 1];
  const duration = formatChangeDuration(latest, now);
  let message: string;

  switch (latest.type) {
    case 'agent-completed':
      message = `${latest.agentName ?? 'agent'} completed patrol (${duration})`;
      break;
    case 'agent-failed':
      message = `${latest.agentName ?? 'agent'} failed (${duration})`;
      break;
    case 'newspaper-updated':
      message = `Newspaper updated (${duration})`;
      break;
    default:
      message = 'unknown event';
      break;
  }

  return ['', '  ' + yellow('\u25b6') + ' ' + dim(message)];
}

// ── Main Dashboard Renderer ────────────────────────────────────

/**
 * Render the full dashboard to a string.
 * This is a pure function: given state, it produces the screen content.
 * Dispatches to the appropriate view renderer based on state.view.
 */
export function renderDashboard(state: DashboardState): string {
  switch (state.view) {
    case 'agent-detail':
      return renderAgentDetailView(state);
    case 'schedule':
      return renderScheduleView(state);
    case 'main':
    default:
      return renderMainView(state);
  }
}

/**
 * Render the main two-panel dashboard view.
 */
function renderMainView(state: DashboardState): string {
  const { termWidth, termHeight } = state;
  const width = Math.max(termWidth, 60);
  const output: string[] = [];

  // ── Header ────────────────────────────────────────────────
  const headerInner = width - 2;
  const titleText = bold('  HERALD DASHBOARD');
  const connInfo = renderConnectionStatus(state);
  const titleVisibleLen = '  HERALD DASHBOARD'.length;
  const headerPad = Math.max(1, headerInner - titleVisibleLen - connInfo.visibleLen);

  output.push(BOX.topLeft + BOX.horizontal.repeat(headerInner) + BOX.topRight);
  output.push(BOX.vertical + titleText + ' '.repeat(headerPad) + connInfo.text + BOX.vertical);
  output.push(horizontalSep(width));

  // ── Body: Two-Panel Layout ────────────────────────────────
  // Left panel: agents, Right panel: newspaper
  const dividerCol = Math.floor(width * 0.45);
  const leftWidth = dividerCol - 1;   // inside the box borders
  const rightWidth = width - dividerCol - 2;

  // Available body height (total - header(3) - separator(1) - footer(2))
  const bodyHeight = Math.max(5, termHeight - 6);

  // Prepare left panel (agents)
  const leftLines = renderAgentPanel(state, leftWidth, bodyHeight);

  // Prepare right panel (newspaper)
  const rightLines = renderNewspaperPanel(state, rightWidth, bodyHeight);

  // Merge panels side-by-side
  for (let i = 0; i < bodyHeight; i++) {
    const left = i < leftLines.length ? leftLines[i] : '';
    const right = i < rightLines.length ? rightLines[i] : '';
    const leftVisible = stripAnsi(left);
    const rightVisible = stripAnsi(right);
    const leftPad = Math.max(0, leftWidth - leftVisible.length);
    const rightPad = Math.max(0, rightWidth - rightVisible.length);

    output.push(
      BOX.vertical
      + left + ' '.repeat(leftPad)
      + BOX.thinVert
      + right + ' '.repeat(rightPad)
      + BOX.vertical
    );
  }

  // ── Footer ────────────────────────────────────────────────
  output.push(horizontalSep(width));
  const helpItems = [
    'q:quit',
    'Tab:switch',
    'j/k:nav',
    's:schedule',
    'Enter:detail',
    'r:refresh',
    '?:help',
  ];
  const helpText = dim('  ' + helpItems.join('  '));
  const helpVisibleLen = ('  ' + helpItems.join('  ')).length;
  const lastUpdateText = state.lastUpdate
    ? dim(`Updated ${formatRelativeTime(state.lastUpdate)}`)
    : '';
  const lastUpdateLen = state.lastUpdate
    ? `Updated ${formatRelativeTime(state.lastUpdate)}`.length
    : 0;
  const footerInner = width - 2;
  const footerPad = Math.max(1, footerInner - helpVisibleLen - lastUpdateLen);
  output.push(BOX.vertical + helpText + ' '.repeat(footerPad) + lastUpdateText + BOX.vertical);
  output.push(BOX.bottomLeft + BOX.horizontal.repeat(footerInner) + BOX.bottomRight);

  // ── Error overlay ─────────────────────────────────────────
  if (state.error) {
    output.push('');
    output.push(red(`  Error: ${state.error}`));
  }

  // ── Help overlay ──────────────────────────────────────────
  if (state.showHelp) {
    const helpLines = renderHelpOverlay(width);
    // Insert centered overlay — we'll append after the main content
    // and the caller can position it
    output.push('');
    output.push(...helpLines);
  }

  return output.join('\n');
}

// ── Panel Renderers ────────────────────────────────────────────

function renderAgentPanel(state: DashboardState, width: number, height: number, now: Date = new Date()): string[] {
  const lines: string[] = [];
  const isActive = state.selectedPanel === 'agents';
  const panelTitle = isActive ? inverse(' AGENTS ') : bold(' AGENTS ');
  lines.push('  ' + panelTitle);
  lines.push('  ' + dim(BOX.thinHoriz.repeat(Math.min(width - 4, 20))));

  if (state.agents.length === 0) {
    lines.push('');
    lines.push(dim('  No agents registered'));
    return lines;
  }

  // Reserve space for notification area (2 lines if there are changes)
  const notificationLines = renderNotificationArea(state.recentChanges, now);
  const agentDisplayHeight = Math.max(0, height - 3 - notificationLines.length);

  for (let i = 0; i < state.agents.length && i < agentDisplayHeight; i++) {
    const agent = state.agents[i];
    const icon = colorizedStatus(agent.status);
    const recentChange = hasRecentChange(agent.name, state.recentChanges, now);
    const nameColWidth = Math.max(8, width - 22);

    // Story 5.5: Highlight recently changed agents
    let displayName: string;
    let newIndicator = '';
    if (recentChange) {
      displayName = brightWhite(fitWidth(truncate(agent.name, nameColWidth), nameColWidth));
      newIndicator = ' ' + green('NEW');
    } else {
      displayName = fitWidth(truncate(agent.name, nameColWidth), nameColWidth);
    }

    const lastRun = agent.lastRun ? formatRelativeTime(agent.lastRun) : 'never';
    const line = `  ${icon} ${displayName} ${dim(lastRun)}${newIndicator}`;

    if (isActive && i === state.selectedAgentIndex) {
      lines.push(cyan('> ') + line.slice(2));
    } else {
      lines.push(line);
    }
  }

  if (state.agents.length > agentDisplayHeight) {
    lines.push(dim(`  ... ${state.agents.length - agentDisplayHeight} more`));
  }

  // Story 5.5: Notification area
  lines.push(...notificationLines);

  return lines;
}

function renderNewspaperPanel(state: DashboardState, width: number, height: number): string[] {
  const lines: string[] = [];
  const isActive = state.selectedPanel === 'newspaper';
  const panelTitle = isActive ? inverse(" TODAY'S NEWSPAPER ") : bold(" TODAY'S NEWSPAPER ");
  lines.push(' ' + panelTitle);
  lines.push(' ' + dim(BOX.thinHoriz.repeat(Math.min(width - 3, 24))));

  if (!state.newspaper || !state.newspaper.content) {
    lines.push('');
    lines.push(dim(' No newspaper available'));
    return lines;
  }

  const contentLines = state.newspaper.content.split('\n');
  const scrollOffset = state.newspaperScrollOffset;
  const visibleLines = height - 3; // account for header + separator + possible scroll indicator

  for (let i = scrollOffset; i < contentLines.length && i < scrollOffset + visibleLines; i++) {
    let line = contentLines[i];
    // Highlight markdown headers
    if (line.startsWith('###')) {
      line = cyan(truncate(line, width - 2));
    } else if (line.startsWith('##')) {
      line = bold(truncate(line, width - 2));
    } else if (line.startsWith('#')) {
      line = bold(cyan(truncate(line, width - 2)));
    } else {
      line = truncate(line, width - 2);
    }
    lines.push(' ' + line);
  }

  // Scroll indicator
  if (contentLines.length > visibleLines) {
    const pct = Math.round(((scrollOffset + visibleLines) / contentLines.length) * 100);
    const indicator = dim(` [${Math.min(pct, 100)}%] j/k to scroll`);
    // Pad to fill remaining body height
    while (lines.length < height - 1) {
      lines.push('');
    }
    lines.push(indicator);
  }

  return lines;
}

// ── Agent Detail View ──────────────────────────────────────────

/**
 * Render the agent drill-in detail view.
 * Pure function: given state → string.
 */
export function renderAgentDetailView(state: DashboardState): string {
  const { termWidth, termHeight } = state;
  const width = Math.max(termWidth, 60);
  const innerWidth = width - 4; // padding inside the box
  const output: string[] = [];
  const detail = state.agentDetail;
  const agentName = detail?.name ?? state.selectedAgentName ?? 'unknown';

  // ── Header ────────────────────────────────────────────────
  const headerInner = width - 2;
  const titleText = bold(`  AGENT: ${agentName}`);
  const titleVisibleLen = `  AGENT: ${agentName}`.length;
  const backLabel = dim('[Back]');
  const backLabelLen = '[Back]'.length;
  const headerPad = Math.max(1, headerInner - titleVisibleLen - backLabelLen - 1);

  output.push(BOX.topLeft + BOX.horizontal.repeat(headerInner) + BOX.topRight);
  output.push(BOX.vertical + titleText + ' '.repeat(headerPad) + backLabel + ' ' + BOX.vertical);
  output.push(horizontalSep(width));

  // ── Body ──────────────────────────────────────────────────
  const bodyHeight = Math.max(5, termHeight - 6);
  const bodyLines: string[] = [];

  if (!detail) {
    bodyLines.push('');
    bodyLines.push(dim('  Loading agent details...'));
  } else {
    // Status
    const statusText = colorizedStatus(detail.status) + ' ' + detail.status;
    bodyLines.push(`  ${bold('Status:')}     ${statusText}`);

    // Schedule
    const scheduleText = detail.schedule ?? dim('not configured');
    bodyLines.push(`  ${bold('Schedule:')}   ${scheduleText}`);

    // Last Run
    if (detail.lastRun) {
      const runStatus = detail.lastRunStatus ?? 'unknown';
      const duration = detail.lastRunDuration ?? '?';
      const runTime = formatRelativeTime(detail.lastRun);
      bodyLines.push(`  ${bold('Last Run:')}   ${runTime} (${runStatus}, ${duration})`);
    } else {
      bodyLines.push(`  ${bold('Last Run:')}   ${dim('never')}`);
    }

    // Session Limit
    const sessionLimit = detail.sessionLimit != null ? String(detail.sessionLimit) : dim('default');
    bodyLines.push(`  ${bold('Session Limit:')} ${sessionLimit}`);

    // Discovery Mode
    const discoveryMode = detail.discoveryMode ?? dim('default');
    bodyLines.push(`  ${bold('Discovery Mode:')} ${discoveryMode}`);

    // Team Eligible
    const teamEligible = detail.teamEligible != null
      ? (detail.teamEligible ? green('yes') : red('no'))
      : dim('unknown');
    bodyLines.push(`  ${bold('Team Eligible:')} ${teamEligible}`);

    // Last Error
    if (detail.lastError) {
      bodyLines.push('');
      bodyLines.push(`  ${bold('Last Error:')} ${red(truncate(detail.lastError, innerWidth - 14))}`);
    }

    // Registered At
    if (detail.registeredAt) {
      bodyLines.push(`  ${bold('Registered:')}  ${formatRelativeTime(detail.registeredAt)}`);
    }

    // Memory Paths
    if (detail.memoryPaths && Object.keys(detail.memoryPaths).length > 0) {
      bodyLines.push('');
      bodyLines.push(`  ${bold('Memory Paths:')}`);
      for (const [key, value] of Object.entries(detail.memoryPaths)) {
        bodyLines.push(`    ${dim(key + ':')} ${truncate(value, innerWidth - key.length - 8)}`);
      }
    }
  }

  // Pad body to fill available height
  for (let i = 0; i < bodyHeight; i++) {
    const line = i < bodyLines.length ? bodyLines[i] : '';
    const visible = stripAnsi(line);
    const pad = Math.max(0, headerInner - visible.length);
    output.push(BOX.vertical + line + ' '.repeat(pad) + BOX.vertical);
  }

  // ── Footer ────────────────────────────────────────────────
  output.push(horizontalSep(width));
  const footerItems = ['Esc:back', 'r:refresh'];
  const footerText = dim('  ' + footerItems.join('  '));
  const footerVisibleLen = ('  ' + footerItems.join('  ')).length;
  const footerInner = width - 2;
  const footerPad = Math.max(1, footerInner - footerVisibleLen);
  output.push(BOX.vertical + footerText + ' '.repeat(footerPad) + BOX.vertical);
  output.push(BOX.bottomLeft + BOX.horizontal.repeat(footerInner) + BOX.bottomRight);

  // ── Error overlay ─────────────────────────────────────────
  if (state.error) {
    output.push('');
    output.push(red(`  Error: ${state.error}`));
  }

  return output.join('\n');
}

// ── Schedule View ──────────────────────────────────────────────

/**
 * Render the schedule manager view.
 * Pure function: given state → string.
 */
export function renderScheduleView(state: DashboardState): string {
  const { termWidth, termHeight } = state;
  const width = Math.max(termWidth, 60);
  const output: string[] = [];

  // ── Header ────────────────────────────────────────────────
  const headerInner = width - 2;
  const titleText = bold('  SCHEDULE MANAGER');
  const titleVisibleLen = '  SCHEDULE MANAGER'.length;
  const backLabel = dim('[Back]');
  const backLabelLen = '[Back]'.length;
  const headerPad = Math.max(1, headerInner - titleVisibleLen - backLabelLen - 1);

  output.push(BOX.topLeft + BOX.horizontal.repeat(headerInner) + BOX.topRight);
  output.push(BOX.vertical + titleText + ' '.repeat(headerPad) + backLabel + ' ' + BOX.vertical);
  output.push(horizontalSep(width));

  // ── Body ──────────────────────────────────────────────────
  const bodyHeight = Math.max(5, termHeight - 6);
  const bodyLines: string[] = [];

  // Column layout
  const nameColWidth = Math.max(20, Math.floor((headerInner - 6) * 0.4));
  const cronColWidth = Math.max(14, Math.floor((headerInner - 6) * 0.35));
  const nextRunColWidth = Math.max(8, headerInner - nameColWidth - cronColWidth - 6);

  // Table header
  const tableHeader = '  '
    + fitWidth(bold('Agent'), nameColWidth)
    + '  '
    + fitWidth(bold('Schedule'), cronColWidth)
    + '  '
    + bold('Next Run');
  bodyLines.push(tableHeader);

  // Separator under header
  bodyLines.push('  '
    + BOX.thinHoriz.repeat(nameColWidth)
    + '  '
    + BOX.thinHoriz.repeat(cronColWidth)
    + '  '
    + BOX.thinHoriz.repeat(nextRunColWidth));

  if (state.schedules.length === 0) {
    bodyLines.push('');
    bodyLines.push(dim('  No schedules configured'));
  } else {
    for (let i = 0; i < state.schedules.length && i < bodyHeight - 3; i++) {
      const sched = state.schedules[i];
      const enabledIndicator = sched.enabled ? '' : dim(' (disabled)');
      const name = truncate(sched.name, nameColWidth - 2);
      const cron = truncate(sched.cron, cronColWidth);
      const nextRun = sched.nextRun ? truncate(sched.nextRun, nextRunColWidth) : dim('--');
      const line = fitWidth(name, nameColWidth - 2)
        + enabledIndicator.padEnd(2)
        + '  '
        + fitWidth(cron, cronColWidth)
        + '  '
        + nextRun;

      if (i === state.selectedScheduleIndex) {
        bodyLines.push(cyan('> ') + line);
      } else {
        bodyLines.push('  ' + line);
      }
    }

    if (state.schedules.length > bodyHeight - 3) {
      bodyLines.push(dim(`  ... ${state.schedules.length - (bodyHeight - 3)} more`));
    }
  }

  // Pad body to fill available height
  for (let i = 0; i < bodyHeight; i++) {
    const line = i < bodyLines.length ? bodyLines[i] : '';
    const visible = stripAnsi(line);
    const pad = Math.max(0, headerInner - visible.length);
    output.push(BOX.vertical + line + ' '.repeat(pad) + BOX.vertical);
  }

  // ── Footer ────────────────────────────────────────────────
  output.push(horizontalSep(width));
  const footerItems = ['Esc:back', 'j/k:nav', 'r:refresh'];
  const footerText = dim('  ' + footerItems.join('  '));
  const footerVisibleLen = ('  ' + footerItems.join('  ')).length;
  const footerInner = width - 2;
  const footerPad = Math.max(1, footerInner - footerVisibleLen);
  output.push(BOX.vertical + footerText + ' '.repeat(footerPad) + BOX.vertical);
  output.push(BOX.bottomLeft + BOX.horizontal.repeat(footerInner) + BOX.bottomRight);

  // ── Error overlay ─────────────────────────────────────────
  if (state.error) {
    output.push('');
    output.push(red(`  Error: ${state.error}`));
  }

  return output.join('\n');
}

// ── Help Overlay ───────────────────────────────────────────────

function renderHelpOverlay(totalWidth: number): string[] {
  const helpContent = [
    '',
    bold('  Keyboard Shortcuts'),
    '',
    '  q, Ctrl+C     Quit dashboard',
    '  Tab           Switch between panels',
    '  j / Down      Move down / scroll down',
    '  k / Up        Move up / scroll up',
    '  Enter         Drill into selected agent',
    '  s             Open schedule manager',
    '  Esc           Go back to main view',
    '  r             Force refresh from daemon',
    '  ?             Toggle this help',
    '',
    dim('  Press any key to close'),
    '',
  ];
  const boxWidth = Math.min(50, totalWidth - 4);
  return box('Help', helpContent, boxWidth);
}
