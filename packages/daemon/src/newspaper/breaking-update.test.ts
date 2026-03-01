import { mkdir, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { BreakingEvent, HeraldConfig } from '@herald/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { listBreakingUpdates, processBreakingUpdate } from './breaking-update.ts';

// Mock pipeline and git-versioner to avoid real subprocess calls
vi.mock('./pipeline.ts', () => ({
  runNewspaperPipeline: vi.fn().mockResolvedValue({
    status: 'compiled',
    pdf: '/tmp/newspaper.pdf',
    html: '/tmp/newspaper.html',
    errors: [],
  }),
}));

vi.mock('./git-versioner.ts', () => ({
  commitEdition: vi.fn().mockResolvedValue({
    success: true,
    commitHash: 'abc1234',
  }),
}));

describe('breaking-update', () => {
  let tempDir: string;
  let heraldConfig: HeraldConfig;

  const makeBreakingEvent = (overrides?: Partial<BreakingEvent>): BreakingEvent => ({
    source_agent: 'ml-researcher',
    headline: 'Major GPU Architecture Shift Announced',
    content: 'NVIDIA announces a completely new GPU architecture...',
    urgency: 'high',
    detected_at: new Date().toISOString(),
    ...overrides,
  });

  beforeEach(async () => {
    tempDir = join(tmpdir(), `herald-breaking-test-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });

    heraldConfig = {
      port: 3117,
      data_dir: join(tempDir, 'data'),
      agents_dir: join(tempDir, 'agents'),
      personas_dir: join(tempDir, 'personas'),
      memory_dir: join(tempDir, 'memory'),
      reports_dir: join(tempDir, 'reports'),
      newspaper_dir: join(tempDir, 'newspaper'),
      log_level: 'info',
    };

    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('processBreakingUpdate', () => {
    it('writes update file with correct frontmatter to updates/ directory', async () => {
      const event = makeBreakingEvent();
      const result = await processBreakingUpdate(event, { heraldConfig });

      expect(result.updateId).toMatch(/^update-\d{6}$/);
      expect(result.updatePath).toContain('/updates/');
      expect(result.editionDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);

      const content = await Bun.file(result.updatePath).text();
      expect(content).toContain('---');
      expect(content).toContain('source_agent: ml-researcher');
      expect(content).toContain('headline: "Major GPU Architecture Shift Announced"');
      expect(content).toContain('urgency: high');
      expect(content).toContain('## Major GPU Architecture Shift Announced');
      expect(content).toContain('NVIDIA announces');
    });

    it('creates updates/ directory if it does not exist', async () => {
      const event = makeBreakingEvent();
      const result = await processBreakingUpdate(event, { heraldConfig });

      const updatesDir = join(
        heraldConfig.newspaper_dir,
        'editions',
        result.editionDate,
        'updates',
      );
      const files = await readdir(updatesDir);
      expect(files.length).toBe(1);
      expect(files[0]).toMatch(/^update-\d{6}\.md$/);
    });

    it('creates edition directory if morning synthesis has not run yet', async () => {
      const event = makeBreakingEvent();
      const result = await processBreakingUpdate(event, { heraldConfig });

      const editionDir = join(heraldConfig.newspaper_dir, 'editions', result.editionDate);
      const entries = await readdir(editionDir);
      expect(entries).toContain('updates');
    });

    it('includes affected_domains in frontmatter when present', async () => {
      const event = makeBreakingEvent({
        affected_domains: ['ml', 'compute'],
      });
      const result = await processBreakingUpdate(event, { heraldConfig });

      const content = await Bun.file(result.updatePath).text();
      expect(content).toContain('affected_domains: [ml, compute]');
    });

    it('calls runNewspaperPipeline with editionDate and heraldConfig', async () => {
      const { runNewspaperPipeline } = await import('./pipeline.ts');
      const event = makeBreakingEvent();
      await processBreakingUpdate(event, { heraldConfig });

      expect(runNewspaperPipeline).toHaveBeenCalledWith(expect.any(String), heraldConfig);
    });

    it('calls commitEdition with editionDir and BREAKING: prefix in message', async () => {
      const { commitEdition } = await import('./git-versioner.ts');
      const event = makeBreakingEvent();
      const result = await processBreakingUpdate(event, { heraldConfig });

      const expectedEditionDir = join(
        heraldConfig.newspaper_dir,
        'editions',
        result.editionDate,
      );
      expect(commitEdition).toHaveBeenCalledWith(
        expectedEditionDir,
        `BREAKING: Major GPU Architecture Shift Announced (via ml-researcher)`,
      );
    });

    it('returns recompiled:true when pipeline succeeds', async () => {
      const event = makeBreakingEvent();
      const result = await processBreakingUpdate(event, { heraldConfig });
      expect(result.recompiled).toBe(true);
    });

    it('returns recompiled:false if runNewspaperPipeline fails (does not throw)', async () => {
      const { runNewspaperPipeline } = await import('./pipeline.ts');
      (runNewspaperPipeline as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('Typst not found'),
      );

      const event = makeBreakingEvent();
      const result = await processBreakingUpdate(event, { heraldConfig });

      expect(result.recompiled).toBe(false);
      expect(result.updatePath).toBeTruthy(); // File still written
    });

    it('returns committed:false if commitEdition fails (does not throw)', async () => {
      const { commitEdition } = await import('./git-versioner.ts');
      (commitEdition as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('Not a git repo'),
      );

      const event = makeBreakingEvent();
      const result = await processBreakingUpdate(event, { heraldConfig });

      expect(result.committed).toBe(false);
      expect(result.updatePath).toBeTruthy(); // File still written
    });

    it('rejects invalid BreakingEvent with Zod validation', async () => {
      const invalidEvent = {
        source_agent: 'test',
        // missing required fields
      } as unknown as BreakingEvent;

      await expect(
        processBreakingUpdate(invalidEvent, { heraldConfig }),
      ).rejects.toThrow();
    });
  });

  describe('listBreakingUpdates', () => {
    it('returns empty array for edition with no updates', async () => {
      const updates = await listBreakingUpdates('2026-02-28', heraldConfig);
      expect(updates).toEqual([]);
    });

    it('returns sorted list of updates', async () => {
      const updatesDir = join(
        heraldConfig.newspaper_dir,
        'editions',
        '2026-02-28',
        'updates',
      );
      await mkdir(updatesDir, { recursive: true });
      await Bun.write(join(updatesDir, 'update-100000.md'), 'first update');
      await Bun.write(join(updatesDir, 'update-143045.md'), 'second update');
      await Bun.write(join(updatesDir, 'update-171230.md'), 'third update');

      const updates = await listBreakingUpdates('2026-02-28', heraldConfig);

      expect(updates).toHaveLength(3);
      expect(updates[0].updateId).toBe('update-100000');
      expect(updates[1].updateId).toBe('update-143045');
      expect(updates[2].updateId).toBe('update-171230');
      expect(updates[0].path).toContain('update-100000.md');
    });

    it('filters non-md files', async () => {
      const updatesDir = join(
        heraldConfig.newspaper_dir,
        'editions',
        '2026-02-28',
        'updates',
      );
      await mkdir(updatesDir, { recursive: true });
      await Bun.write(join(updatesDir, 'update-100000.md'), 'update');
      await Bun.write(join(updatesDir, '.gitkeep'), '');

      const updates = await listBreakingUpdates('2026-02-28', heraldConfig);
      expect(updates).toHaveLength(1);
    });
  });
});
