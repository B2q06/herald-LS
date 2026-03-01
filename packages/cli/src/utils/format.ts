/**
 * Formatting utilities for Herald CLI output.
 */

export interface AgentInfo {
  name: string;
  status: string;
  lastRun?: string;
  config?: { schedule?: string };
}

/** Format uptime in seconds to human-readable string. */
export function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;

  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 && days === 0) parts.push(`${secs}s`);

  return parts.join(' ');
}

/** Format a date string to relative time like "2h ago", "just now". */
export function formatRelativeTime(date: string | Date): string {
  const now = Date.now();
  const then = new Date(date).getTime();
  const diffMs = now - then;

  if (Number.isNaN(diffMs)) return 'unknown';

  const diffSecs = Math.floor(diffMs / 1000);

  if (diffSecs < 0) return 'in the future';
  if (diffSecs < 30) return 'just now';
  if (diffSecs < 60) return `${diffSecs}s ago`;

  const diffMins = Math.floor(diffSecs / 60);
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;

  const diffMonths = Math.floor(diffDays / 30);
  return `${diffMonths}mo ago`;
}

/** Return a status icon character for agent status. */
export function statusIcon(status: string): string {
  switch (status) {
    case 'success':
    case 'idle':
      return '[ok]';
    case 'failed':
    case 'error':
      return '[FAIL]';
    case 'running':
      return '[..]';
    case 'pending':
    case 'active':
      return '[--]';
    default:
      return '[??]';
  }
}

/** Format a single agent for display. */
export function formatAgent(agent: AgentInfo): string {
  const icon = statusIcon(agent.status);
  const lastRun = agent.lastRun ? formatRelativeTime(agent.lastRun) : 'never';
  const schedule = agent.config?.schedule ?? 'manual';
  return `${icon} ${agent.name.padEnd(20)} ${agent.status.padEnd(10)} ${lastRun.padEnd(12)} ${schedule}`;
}

/** Format a table header for agent listing. */
export function agentTableHeader(): string {
  return `${''.padEnd(6)} ${'Name'.padEnd(20)} ${'Status'.padEnd(10)} ${'Last Run'.padEnd(12)} Schedule`;
}
