import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createCompletionsCommand,
  detectShell,
  getCompletionScript,
  getCompletionFilePath,
  getShellConfigPath,
} from './completions.ts';

// Mock fs and os for install tests
vi.mock('node:fs', () => ({
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn(),
  readFileSync: vi.fn(),
}));

import * as fs from 'node:fs';

describe('completions command', () => {
  let consoleLogs: string[];
  let consoleErrors: string[];
  const originalLog = console.log;
  const originalError = console.error;
  const originalExit = process.exit;
  const originalShell = process.env.SHELL;

  beforeEach(() => {
    consoleLogs = [];
    consoleErrors = [];
    console.log = (...args: unknown[]) => consoleLogs.push(args.join(' '));
    console.error = (...args: unknown[]) => consoleErrors.push(args.join(' '));
    process.exit = vi.fn() as never;
    vi.mocked(fs.mkdirSync).mockReset();
    vi.mocked(fs.writeFileSync).mockReset();
    vi.mocked(fs.readFileSync).mockReset();
  });

  afterEach(() => {
    console.log = originalLog;
    console.error = originalError;
    process.exit = originalExit;
    process.env.SHELL = originalShell;
  });

  describe('detectShell', () => {
    it('detects zsh from SHELL env', () => {
      process.env.SHELL = '/bin/zsh';
      expect(detectShell()).toBe('zsh');
    });

    it('detects bash from SHELL env', () => {
      process.env.SHELL = '/usr/bin/bash';
      expect(detectShell()).toBe('bash');
    });

    it('returns null when SHELL is not set', () => {
      delete process.env.SHELL;
      expect(detectShell()).toBeNull();
    });
  });

  describe('getCompletionScript', () => {
    it('returns a script for zsh', () => {
      const script = getCompletionScript('zsh');
      expect(script).not.toBeNull();
      expect(script).toContain('_herald');
      expect(script).toContain('#compdef herald');
    });

    it('returns null for unsupported shells', () => {
      expect(getCompletionScript('fish')).toBeNull();
      expect(getCompletionScript('bash')).toBeNull();
    });
  });

  describe('getShellConfigPath', () => {
    it('returns .zshrc path for zsh', () => {
      const p = getShellConfigPath('zsh');
      expect(p).toContain('.zshrc');
    });

    it('returns null for unsupported shells', () => {
      expect(getShellConfigPath('fish')).toBeNull();
    });
  });

  describe('getCompletionFilePath', () => {
    it('returns _herald path for zsh', () => {
      const p = getCompletionFilePath('zsh');
      expect(p).toContain('.herald/completions/_herald');
    });

    it('returns null for unsupported shells', () => {
      expect(getCompletionFilePath('fish')).toBeNull();
    });
  });

  describe('command: herald completions', () => {
    it('outputs zsh completion script when shell is zsh', async () => {
      process.env.SHELL = '/bin/zsh';

      const cmd = createCompletionsCommand();
      await cmd.parseAsync(['completions'], { from: 'user' });

      const output = consoleLogs.join('\n');
      expect(output).toContain('#compdef herald');
      expect(output).toContain('_herald()');
    });

    it('outputs completion script with --shell zsh', async () => {
      delete process.env.SHELL;

      const cmd = createCompletionsCommand();
      await cmd.parseAsync(['completions', '--shell', 'zsh'], { from: 'user' });

      const output = consoleLogs.join('\n');
      expect(output).toContain('#compdef herald');
    });

    it('errors when shell cannot be detected', async () => {
      delete process.env.SHELL;

      const cmd = createCompletionsCommand();
      await cmd.parseAsync(['completions'], { from: 'user' });

      expect(consoleErrors[0]).toContain('Could not detect shell');
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('errors for unsupported shell', async () => {
      const cmd = createCompletionsCommand();
      await cmd.parseAsync(['completions', '--shell', 'fish'], { from: 'user' });

      expect(consoleErrors[0]).toContain('not supported');
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });

  describe('command: herald completions --install', () => {
    it('writes completion file and updates shell config', async () => {
      process.env.SHELL = '/bin/zsh';
      vi.mocked(fs.readFileSync).mockReturnValue('# existing config\n');

      const cmd = createCompletionsCommand();
      await cmd.parseAsync(['completions', '--install'], { from: 'user' });

      // Should create directory
      expect(fs.mkdirSync).toHaveBeenCalled();

      // Should write the completion file
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('_herald'),
        expect.stringContaining('#compdef herald'),
        'utf-8',
      );

      // Should update shell config
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('.zshrc'),
        expect.stringContaining('.herald/completions'),
        'utf-8',
      );

      const output = consoleLogs.join('\n');
      expect(output).toContain('Wrote completion script');
      expect(output).toContain('Completions installed');
    });

    it('does not duplicate fpath if already present in config', async () => {
      process.env.SHELL = '/bin/zsh';
      vi.mocked(fs.readFileSync).mockReturnValue(
        '# existing config\nfpath=(~/.herald/completions $fpath)\nautoload -Uz compinit && compinit\n',
      );

      const cmd = createCompletionsCommand();
      await cmd.parseAsync(['completions', '--install'], { from: 'user' });

      // writeFileSync should be called for the completion file only,
      // not for the shell config since it already contains the lines
      const writeFileCalls = vi.mocked(fs.writeFileSync).mock.calls;
      const configWrites = writeFileCalls.filter(
        call => typeof call[0] === 'string' && call[0].includes('.zshrc'),
      );
      expect(configWrites).toHaveLength(0);
    });

    it('handles missing shell config file gracefully', async () => {
      process.env.SHELL = '/bin/zsh';
      vi.mocked(fs.readFileSync).mockImplementation(() => {
        throw new Error('ENOENT');
      });

      const cmd = createCompletionsCommand();
      await cmd.parseAsync(['completions', '--install'], { from: 'user' });

      // Should still write both files
      expect(fs.writeFileSync).toHaveBeenCalledTimes(2);

      const output = consoleLogs.join('\n');
      expect(output).toContain('Completions installed');
    });
  });
});
