import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../utils/api-client.ts', () => ({
  get: vi.fn(),
  post: vi.fn(),
  agentPath: (name: string) => encodeURIComponent(name),
  ApiError: class ApiError extends Error {
    public readonly statusCode: number;
    public readonly body: unknown;
    constructor(statusCode: number, body: unknown) {
      super(`API returned ${statusCode}`);
      this.name = 'ApiError';
      this.statusCode = statusCode;
      this.body = body;
    }
  },
}));

import { get, post, ApiError } from '../utils/api-client.ts';
import { verifyAgent, sendMessage, processInput, getChatHelp } from './chat.ts';

describe('chat command', () => {
  let consoleErrors: string[];
  const originalError = console.error;
  const originalExit = process.exit;

  beforeEach(() => {
    consoleErrors = [];
    console.error = (...args: unknown[]) => consoleErrors.push(args.join(' '));
    process.exit = vi.fn() as never;
    vi.mocked(get).mockReset();
    vi.mocked(post).mockReset();
  });

  afterEach(() => {
    console.error = originalError;
    process.exit = originalExit;
  });

  describe('verifyAgent', () => {
    it('returns agent detail when agent exists', async () => {
      vi.mocked(get).mockResolvedValue({
        name: 'scout',
        status: 'idle',
      });

      const agent = await verifyAgent('scout');
      expect(agent).toEqual({ name: 'scout', status: 'idle' });
      expect(get).toHaveBeenCalledWith('/api/agents/scout');
    });

    it('returns null when agent is not found (404)', async () => {
      vi.mocked(get).mockRejectedValue(new ApiError(404, { error: 'Not found' }));

      const agent = await verifyAgent('nonexistent');
      expect(agent).toBeNull();
    });

    it('rethrows non-404 errors', async () => {
      vi.mocked(get).mockRejectedValue(new Error('Network error'));

      await expect(verifyAgent('scout')).rejects.toThrow('Network error');
    });
  });

  describe('sendMessage', () => {
    it('sends prompt to agent and returns result text', async () => {
      vi.mocked(post).mockResolvedValue({
        runId: 'run-001',
        result: 'Here is my response',
        status: 'success',
        startedAt: '2026-03-01T10:00:00Z',
        finishedAt: '2026-03-01T10:01:00Z',
      });

      const response = await sendMessage('scout', 'hello there');

      expect(post).toHaveBeenCalledWith('/api/agents/scout/run', {
        prompt: 'hello there',
      });
      expect(response).toBe('Here is my response');
    });

    it('returns fallback text when result is empty', async () => {
      vi.mocked(post).mockResolvedValue({
        runId: 'run-002',
        result: '',
        status: 'success',
        startedAt: '2026-03-01T10:00:00Z',
        finishedAt: '2026-03-01T10:01:00Z',
      });

      const response = await sendMessage('scout', 'hello');
      // Empty string is falsy, so fallback is used
      expect(response).toContain('run-002');
      expect(response).toContain('success');
    });
  });

  describe('processInput', () => {
    it('returns skip for empty input', () => {
      expect(processInput('')).toEqual({ action: 'skip' });
      expect(processInput('   ')).toEqual({ action: 'skip' });
    });

    it('returns exit for /exit', () => {
      expect(processInput('/exit')).toEqual({ action: 'exit' });
    });

    it('returns exit for /quit', () => {
      expect(processInput('/quit')).toEqual({ action: 'exit' });
    });

    it('returns help for /help', () => {
      const result = processInput('/help');
      expect(result.action).toBe('help');
      expect(result.text).toContain('/exit');
      expect(result.text).toContain('/help');
      expect(result.text).toContain('/run');
    });

    it('returns run for /run', () => {
      expect(processInput('/run')).toEqual({ action: 'run' });
    });

    it('returns send for regular text', () => {
      expect(processInput('hello agent')).toEqual({
        action: 'send',
        message: 'hello agent',
      });
    });

    it('trims whitespace from input', () => {
      expect(processInput('  hello  ')).toEqual({
        action: 'send',
        message: 'hello',
      });
    });
  });

  describe('getChatHelp', () => {
    it('returns help text containing all commands', () => {
      const help = getChatHelp();
      expect(help).toContain('/help');
      expect(help).toContain('/exit');
      expect(help).toContain('/quit');
      expect(help).toContain('/run');
    });
  });
});
