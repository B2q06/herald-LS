import { describe, expect, it } from 'vitest';
import {
  agentTableHeader,
  formatAgent,
  formatRelativeTime,
  formatUptime,
  statusIcon,
} from './format.ts';

describe('formatUptime', () => {
  it('formats seconds only', () => {
    expect(formatUptime(30)).toBe('30s');
  });

  it('formats minutes and seconds', () => {
    expect(formatUptime(90)).toBe('1m 30s');
  });

  it('formats hours and minutes', () => {
    expect(formatUptime(3661)).toBe('1h 1m 1s');
  });

  it('formats days, hours and minutes', () => {
    expect(formatUptime(90061)).toBe('1d 1h 1m');
  });

  it('omits seconds when days are present', () => {
    expect(formatUptime(86400)).toBe('1d');
  });

  it('handles zero', () => {
    expect(formatUptime(0)).toBe('0s');
  });

  it('formats exactly one minute', () => {
    expect(formatUptime(60)).toBe('1m');
  });

  it('formats exactly one hour', () => {
    expect(formatUptime(3600)).toBe('1h');
  });
});

describe('formatRelativeTime', () => {
  it('returns "just now" for recent timestamps', () => {
    const now = new Date();
    expect(formatRelativeTime(now)).toBe('just now');
  });

  it('returns seconds ago', () => {
    const date = new Date(Date.now() - 45_000);
    expect(formatRelativeTime(date)).toBe('45s ago');
  });

  it('returns minutes ago', () => {
    const date = new Date(Date.now() - 5 * 60_000);
    expect(formatRelativeTime(date)).toBe('5m ago');
  });

  it('returns hours ago', () => {
    const date = new Date(Date.now() - 2 * 3600_000);
    expect(formatRelativeTime(date)).toBe('2h ago');
  });

  it('returns days ago', () => {
    const date = new Date(Date.now() - 3 * 86400_000);
    expect(formatRelativeTime(date)).toBe('3d ago');
  });

  it('returns months ago', () => {
    const date = new Date(Date.now() - 60 * 86400_000);
    expect(formatRelativeTime(date)).toBe('2mo ago');
  });

  it('returns "unknown" for invalid dates', () => {
    expect(formatRelativeTime('not-a-date')).toBe('unknown');
  });
});

describe('statusIcon', () => {
  it('returns ok icon for success', () => {
    expect(statusIcon('success')).toBe('[ok]');
  });

  it('returns ok icon for idle', () => {
    expect(statusIcon('idle')).toBe('[ok]');
  });

  it('returns fail icon for failed', () => {
    expect(statusIcon('failed')).toBe('[FAIL]');
  });

  it('returns fail icon for error', () => {
    expect(statusIcon('error')).toBe('[FAIL]');
  });

  it('returns running icon', () => {
    expect(statusIcon('running')).toBe('[..]');
  });

  it('returns pending icon', () => {
    expect(statusIcon('pending')).toBe('[--]');
  });

  it('returns unknown icon for unrecognized status', () => {
    expect(statusIcon('foo')).toBe('[??]');
  });
});

describe('formatAgent', () => {
  it('formats an agent with all fields', () => {
    const result = formatAgent({
      name: 'test-agent',
      status: 'success',
      lastRun: new Date().toISOString(),
      config: { schedule: '0 */6 * * *' },
    });
    expect(result).toContain('[ok]');
    expect(result).toContain('test-agent');
    expect(result).toContain('just now');
    expect(result).toContain('0 */6 * * *');
  });

  it('formats an agent with no last run', () => {
    const result = formatAgent({
      name: 'new-agent',
      status: 'idle',
    });
    expect(result).toContain('[ok]');
    expect(result).toContain('new-agent');
    expect(result).toContain('never');
    expect(result).toContain('manual');
  });

  it('formats a failed agent', () => {
    const result = formatAgent({
      name: 'broken',
      status: 'failed',
    });
    expect(result).toContain('[FAIL]');
  });
});

describe('agentTableHeader', () => {
  it('includes column headers', () => {
    const header = agentTableHeader();
    expect(header).toContain('Name');
    expect(header).toContain('Status');
    expect(header).toContain('Last Run');
    expect(header).toContain('Schedule');
  });
});
