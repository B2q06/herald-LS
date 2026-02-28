import { describe, expect, it } from 'vitest';
import { AgentConfigSchema } from './agent-config.ts';

describe('AgentConfigSchema', () => {
  it('parses valid agent config', () => {
    const valid = {
      name: 'ml-researcher',
      persona: './personas/ml-researcher.md',
      output_dir: './reports/ml-researcher',
      schedule: '0 8 * * *',
      session_limit: 5,
      notify_policy: 'failures' as const,
    };

    const result = AgentConfigSchema.parse(valid);
    expect(result.name).toBe('ml-researcher');
    expect(result.session_limit).toBe(5);
    expect(result.team_eligible).toBe(false);
  });

  it('applies defaults for optional fields', () => {
    const minimal = {
      name: 'test-agent',
      persona: './personas/test.md',
      output_dir: './reports/test',
    };

    const result = AgentConfigSchema.parse(minimal);
    expect(result.session_limit).toBe(10);
    expect(result.notify_policy).toBe('failures');
    expect(result.team_eligible).toBe(false);
  });

  it('throws on invalid input', () => {
    const invalid = {
      name: 123,
      persona: true,
    };

    expect(() => AgentConfigSchema.parse(invalid)).toThrow();
  });
});
