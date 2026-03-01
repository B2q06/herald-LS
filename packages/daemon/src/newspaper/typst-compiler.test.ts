import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from 'bun:test';
import type { SpawnResult } from './typst-compiler.ts';
import { compileTypst } from './typst-compiler.ts';

describe('compileTypst', () => {
  let mockSpawn: ReturnType<typeof mock>;

  beforeEach(() => {
    mockSpawn = mock();
    spyOn(console, 'log').mockImplementation(() => {});
    spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    mock.restore();
  });

  it('returns successful result when typst exits with code 0', async () => {
    mockSpawn.mockResolvedValue({ exitCode: 0, stderr: '' });

    const result = await compileTypst(
      '/path/to/template.typ',
      '/path/to/output.pdf',
      'pdf',
      { date: '2026-02-28', 'newspaper-md': '/path/to/combined.typ' },
      15_000,
      mockSpawn as (args: string[], timeoutMs: number) => Promise<SpawnResult>,
    );

    expect(result.success).toBe(true);
    expect(result.format).toBe('pdf');
    expect(result.outputPath).toBe('/path/to/output.pdf');
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
    expect(result.error).toBeUndefined();
  });

  it('builds correct args for pdf compilation', async () => {
    mockSpawn.mockResolvedValue({ exitCode: 0, stderr: '' });

    await compileTypst(
      '/path/to/template.typ',
      '/path/to/output.pdf',
      'pdf',
      { date: '2026-02-28' },
      15_000,
      mockSpawn as (args: string[], timeoutMs: number) => Promise<SpawnResult>,
    );

    const args = mockSpawn.mock.calls[0][0];
    expect(args).toEqual([
      'typst',
      'compile',
      '/path/to/template.typ',
      '/path/to/output.pdf',
      '--input',
      'date=2026-02-28',
    ]);
  });

  it('passes --format html flag for html format', async () => {
    mockSpawn.mockResolvedValue({ exitCode: 0, stderr: '' });

    await compileTypst(
      '/path/to/template.typ',
      '/path/to/output.html',
      'html',
      { date: '2026-02-28' },
      15_000,
      mockSpawn as (args: string[], timeoutMs: number) => Promise<SpawnResult>,
    );

    const args = mockSpawn.mock.calls[0][0] as string[];
    expect(args).toContain('--format');
    expect(args).toContain('html');
  });

  it('passes --input flags for each input', async () => {
    mockSpawn.mockResolvedValue({ exitCode: 0, stderr: '' });

    await compileTypst(
      '/path/to/template.typ',
      '/path/to/output.pdf',
      'pdf',
      { date: '2026-02-28', 'newspaper-md': '/path/to/combined.typ' },
      15_000,
      mockSpawn as (args: string[], timeoutMs: number) => Promise<SpawnResult>,
    );

    const args = mockSpawn.mock.calls[0][0] as string[];
    const inputIndices = args.reduce((acc: number[], arg: string, i: number) => {
      if (arg === '--input') acc.push(i);
      return acc;
    }, []);
    expect(inputIndices.length).toBe(2);
    expect(args[inputIndices[0] + 1]).toBe('date=2026-02-28');
    expect(args[inputIndices[1] + 1]).toBe('newspaper-md=/path/to/combined.typ');
  });

  it('returns failed result when typst exits with non-zero code', async () => {
    mockSpawn.mockResolvedValue({ exitCode: 1, stderr: 'error: file not found' });

    const result = await compileTypst(
      '/path/to/template.typ',
      '/path/to/output.pdf',
      'pdf',
      { date: '2026-02-28' },
      15_000,
      mockSpawn as (args: string[], timeoutMs: number) => Promise<SpawnResult>,
    );

    expect(result.success).toBe(false);
    expect(result.format).toBe('pdf');
    expect(result.error).toContain('Typst exited with code 1');
    expect(result.error).toContain('file not found');
    expect(result.outputPath).toBeUndefined();
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('returns failed result when spawn throws (e.g., ENOENT)', async () => {
    mockSpawn.mockRejectedValue(new Error('spawn ENOENT'));

    const result = await compileTypst(
      '/path/to/template.typ',
      '/path/to/output.pdf',
      'pdf',
      { date: '2026-02-28' },
      15_000,
      mockSpawn as (args: string[], timeoutMs: number) => Promise<SpawnResult>,
    );

    expect(result.success).toBe(false);
    expect(result.format).toBe('pdf');
    expect(result.error).toContain('spawn ENOENT');
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('passes timeout to spawn function', async () => {
    mockSpawn.mockResolvedValue({ exitCode: 0, stderr: '' });

    await compileTypst(
      '/path/to/template.typ',
      '/path/to/output.pdf',
      'pdf',
      {},
      5_000,
      mockSpawn as (args: string[], timeoutMs: number) => Promise<SpawnResult>,
    );

    expect(mockSpawn.mock.calls[0][1]).toBe(5_000);
  });

  it('logs success message on successful compilation', async () => {
    mockSpawn.mockResolvedValue({ exitCode: 0, stderr: '' });

    await compileTypst(
      '/path/to/template.typ',
      '/path/to/output.pdf',
      'pdf',
      {},
      15_000,
      mockSpawn as (args: string[], timeoutMs: number) => Promise<SpawnResult>,
    );

    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('[herald] Typst compiled pdf'),
    );
  });

  it('logs error message on failed compilation', async () => {
    mockSpawn.mockResolvedValue({ exitCode: 1, stderr: 'some error' });

    await compileTypst(
      '/path/to/template.typ',
      '/path/to/output.pdf',
      'pdf',
      {},
      15_000,
      mockSpawn as (args: string[], timeoutMs: number) => Promise<SpawnResult>,
    );

    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('[herald] Typst compilation failed (pdf)'),
    );
  });

  it('logs subprocess error on spawn failure', async () => {
    mockSpawn.mockRejectedValue(new Error('cannot execute'));

    await compileTypst(
      '/path/to/template.typ',
      '/path/to/output.pdf',
      'pdf',
      {},
      15_000,
      mockSpawn as (args: string[], timeoutMs: number) => Promise<SpawnResult>,
    );

    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('[herald] Typst subprocess error (pdf)'),
    );
  });

  it('handles non-Error throws', async () => {
    mockSpawn.mockRejectedValue('string error');

    const result = await compileTypst(
      '/path/to/template.typ',
      '/path/to/output.pdf',
      'pdf',
      {},
      15_000,
      mockSpawn as (args: string[], timeoutMs: number) => Promise<SpawnResult>,
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe('string error');
  });

  it('uses default timeout of 15000ms', async () => {
    mockSpawn.mockResolvedValue({ exitCode: 0, stderr: '' });

    await compileTypst(
      '/path/to/template.typ',
      '/path/to/output.pdf',
      'pdf',
      {},
      undefined,
      mockSpawn as (args: string[], timeoutMs: number) => Promise<SpawnResult>,
    );

    expect(mockSpawn.mock.calls[0][1]).toBe(15_000);
  });
});
