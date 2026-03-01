import { describe, expect, it } from 'vitest';
import { generateZshCompletions } from './zsh.ts';

describe('zsh completion script', () => {
  const script = generateZshCompletions();

  it('starts with #compdef herald directive', () => {
    expect(script).toMatch(/^#compdef herald/);
  });

  it('defines the _herald function', () => {
    expect(script).toContain('_herald()');
  });

  it('includes all top-level commands', () => {
    const commands = ['status', 'agents', 'run', 'paper', 'report', 'chat', 'logs', 'dash', 'completions'];
    for (const cmd of commands) {
      expect(script).toContain(`'${cmd}:`);
    }
  });

  it('uses _arguments for flag completion', () => {
    expect(script).toContain('_arguments');
  });

  it('completes --json flag for status command', () => {
    expect(script).toContain("'--json[Output raw JSON]'");
  });

  it('completes --history, --date, and --weekly flags for paper command', () => {
    expect(script).toContain("'--history[List past editions]'");
    expect(script).toContain("'--date[View a specific edition by date]");
    expect(script).toContain("'--weekly[View latest weekly synthesis]'");
  });

  it('completes --latest flag for report command', () => {
    expect(script).toContain("'--latest[Display the most recent report]'");
  });

  it('completes --prompt flag for run command', () => {
    expect(script).toContain("'--prompt[Custom prompt for the agent]");
  });

  it('completes --poll flag for dash command', () => {
    expect(script).toContain("'--poll[Polling interval in milliseconds]");
  });

  it('completes --install and --shell flags for completions command', () => {
    expect(script).toContain("'--install[Install completions to shell config]'");
    expect(script).toContain("'--shell[Specify shell]");
  });

  it('defines _herald_agents function for dynamic agent completion', () => {
    expect(script).toContain('_herald_agents()');
  });

  it('calls herald __complete agents for dynamic completion', () => {
    expect(script).toContain('herald __complete agents');
  });

  it('uses compadd for agent name completion', () => {
    expect(script).toContain('compadd');
  });

  it('suppresses stderr in agent completion', () => {
    expect(script).toContain('2>/dev/null');
  });

  it('references _herald_agents for run, report, chat, and logs commands', () => {
    // Each of these commands should reference the _herald_agents completer
    const agentRefs = script.match(/_herald_agents/g);
    // _herald_agents function definition + 4 command references (run, report, chat, logs)
    expect(agentRefs).not.toBeNull();
    expect(agentRefs!.length).toBeGreaterThanOrEqual(5);
  });

  it('ends with invocation of _herald', () => {
    expect(script.trimEnd()).toMatch(/_herald "\$@"$/);
  });
});
