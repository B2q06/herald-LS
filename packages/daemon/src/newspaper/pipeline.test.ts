import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { HeraldConfig } from '@herald/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CompilerFn } from './pipeline.ts';
import { getEditionStatus, runNewspaperPipeline } from './pipeline.ts';
import type { CompilationResult } from './typst-compiler.ts';

describe('runNewspaperPipeline', () => {
  let tempDir: string;
  let heraldConfig: HeraldConfig;
  let mockCompiler: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    tempDir = join(
      tmpdir(),
      `herald-pipeline-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
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

    // Default: compilation succeeds
    mockCompiler = vi.fn(
      async (
        _templatePath: string,
        outputPath: string,
        format: 'pdf' | 'html',
      ): Promise<CompilationResult> => ({
        success: true,
        format,
        outputPath,
        durationMs: 100,
      }),
    );
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(tempDir, { recursive: true, force: true });
  });

  it('returns no-sources when edition directory does not exist', async () => {
    const result = await runNewspaperPipeline(
      '2026-02-28',
      heraldConfig,
      mockCompiler as CompilerFn,
    );

    expect(result.status).toBe('no-sources');
    expect(result.errors).toHaveLength(0);
    expect(result.pdf).toBeUndefined();
    expect(result.html).toBeUndefined();
  });

  it('returns no-sources when sources directory is empty', async () => {
    const sourcesDir = join(heraldConfig.newspaper_dir, 'editions', '2026-02-28', 'sources');
    await mkdir(sourcesDir, { recursive: true });

    const result = await runNewspaperPipeline(
      '2026-02-28',
      heraldConfig,
      mockCompiler as CompilerFn,
    );

    expect(result.status).toBe('no-sources');
  });

  it('combines source files with editorial first, then alphabetical', async () => {
    const sourcesDir = join(heraldConfig.newspaper_dir, 'editions', '2026-02-28', 'sources');
    await mkdir(sourcesDir, { recursive: true });

    await writeFile(join(sourcesDir, 'editorial.md'), '# Editorial Content');
    await writeFile(join(sourcesDir, 'compute-researcher.md'), '# Compute Report');
    await writeFile(join(sourcesDir, 'ai-tooling-researcher.md'), '# AI Tooling Report');
    await writeFile(join(sourcesDir, 'ml-researcher.md'), '# ML Report');

    const templatesDir = join(heraldConfig.newspaper_dir, 'templates');
    await mkdir(templatesDir, { recursive: true });
    await writeFile(join(templatesDir, 'newspaper.typ'), 'template');

    await runNewspaperPipeline('2026-02-28', heraldConfig, mockCompiler as CompilerFn);

    // Verify the combined file was created
    const combinedPath = join(heraldConfig.newspaper_dir, 'editions', '2026-02-28', 'combined.typ');
    const combined = await readFile(combinedPath, 'utf-8');

    // Editorial should be first
    const editorialIndex = combined.indexOf('Editorial Content');
    const aiToolingIndex = combined.indexOf('AI Tooling Report');
    const computeIndex = combined.indexOf('Compute Report');
    const mlIndex = combined.indexOf('ML Report');

    expect(editorialIndex).toBeGreaterThanOrEqual(0);
    expect(aiToolingIndex).toBeGreaterThan(editorialIndex);
    expect(computeIndex).toBeGreaterThan(aiToolingIndex);
    expect(mlIndex).toBeGreaterThan(computeIndex);
  });

  it('handles missing editorial.md gracefully', async () => {
    const sourcesDir = join(heraldConfig.newspaper_dir, 'editions', '2026-02-28', 'sources');
    await mkdir(sourcesDir, { recursive: true });

    await writeFile(join(sourcesDir, 'compute-researcher.md'), '# Compute Report');
    await writeFile(join(sourcesDir, 'ml-researcher.md'), '# ML Report');

    const templatesDir = join(heraldConfig.newspaper_dir, 'templates');
    await mkdir(templatesDir, { recursive: true });
    await writeFile(join(templatesDir, 'newspaper.typ'), 'template');

    await runNewspaperPipeline('2026-02-28', heraldConfig, mockCompiler as CompilerFn);

    // Combined file should still be created with remaining files alphabetically
    const combinedPath = join(heraldConfig.newspaper_dir, 'editions', '2026-02-28', 'combined.typ');
    const combined = await readFile(combinedPath, 'utf-8');

    const computeIndex = combined.indexOf('Compute Report');
    const mlIndex = combined.indexOf('ML Report');

    expect(computeIndex).toBeGreaterThanOrEqual(0);
    expect(mlIndex).toBeGreaterThan(computeIndex);
  });

  it('calls compileTypst for both PDF and HTML', async () => {
    const sourcesDir = join(heraldConfig.newspaper_dir, 'editions', '2026-02-28', 'sources');
    await mkdir(sourcesDir, { recursive: true });
    await writeFile(join(sourcesDir, 'editorial.md'), '# Editorial');

    const templatesDir = join(heraldConfig.newspaper_dir, 'templates');
    await mkdir(templatesDir, { recursive: true });
    await writeFile(join(templatesDir, 'newspaper.typ'), 'template');

    await runNewspaperPipeline('2026-02-28', heraldConfig, mockCompiler as CompilerFn);

    expect(mockCompiler).toHaveBeenCalledTimes(2);

    // Check PDF call
    const pdfCall = mockCompiler.mock.calls.find((call: unknown[]) => call[2] === 'pdf');
    expect(pdfCall).toBeDefined();
    expect(pdfCall?.[1]).toContain('newspaper.pdf');

    // Check HTML call
    const htmlCall = mockCompiler.mock.calls.find((call: unknown[]) => call[2] === 'html');
    expect(htmlCall).toBeDefined();
    expect(htmlCall?.[1]).toContain('newspaper.html');
  });

  it('returns compiled status on full success', async () => {
    const sourcesDir = join(heraldConfig.newspaper_dir, 'editions', '2026-02-28', 'sources');
    await mkdir(sourcesDir, { recursive: true });
    await writeFile(join(sourcesDir, 'editorial.md'), '# Editorial');

    const templatesDir = join(heraldConfig.newspaper_dir, 'templates');
    await mkdir(templatesDir, { recursive: true });
    await writeFile(join(templatesDir, 'newspaper.typ'), 'template');

    const result = await runNewspaperPipeline(
      '2026-02-28',
      heraldConfig,
      mockCompiler as CompilerFn,
    );

    expect(result.status).toBe('compiled');
    expect(result.pdf).toBeDefined();
    expect(result.html).toBeDefined();
    expect(result.errors).toHaveLength(0);
  });

  it('returns partial status when PDF succeeds but HTML fails', async () => {
    const sourcesDir = join(heraldConfig.newspaper_dir, 'editions', '2026-02-28', 'sources');
    await mkdir(sourcesDir, { recursive: true });
    await writeFile(join(sourcesDir, 'editorial.md'), '# Editorial');

    const templatesDir = join(heraldConfig.newspaper_dir, 'templates');
    await mkdir(templatesDir, { recursive: true });
    await writeFile(join(templatesDir, 'newspaper.typ'), 'template');

    const failingCompiler = vi.fn(
      async (
        _templatePath: string,
        outputPath: string,
        format: 'pdf' | 'html',
      ): Promise<CompilationResult> => {
        if (format === 'html') {
          return { success: false, format, durationMs: 50, error: 'HTML compilation failed' };
        }
        return { success: true, format, outputPath, durationMs: 100 };
      },
    );

    const result = await runNewspaperPipeline(
      '2026-02-28',
      heraldConfig,
      failingCompiler as CompilerFn,
    );

    expect(result.status).toBe('partial');
    expect(result.pdf).toBeDefined();
    expect(result.html).toBeUndefined();
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('HTML compilation failed');
  });

  it('returns source-only status when both compilations fail', async () => {
    const sourcesDir = join(heraldConfig.newspaper_dir, 'editions', '2026-02-28', 'sources');
    await mkdir(sourcesDir, { recursive: true });
    await writeFile(join(sourcesDir, 'editorial.md'), '# Editorial');

    const templatesDir = join(heraldConfig.newspaper_dir, 'templates');
    await mkdir(templatesDir, { recursive: true });
    await writeFile(join(templatesDir, 'newspaper.typ'), 'template');

    const failingCompiler = vi.fn(
      async (
        _templatePath: string,
        _outputPath: string,
        format: 'pdf' | 'html',
      ): Promise<CompilationResult> => ({
        success: false,
        format,
        durationMs: 50,
        error: 'Typst not found',
      }),
    );

    const result = await runNewspaperPipeline(
      '2026-02-28',
      heraldConfig,
      failingCompiler as CompilerFn,
    );

    expect(result.status).toBe('source-only');
    expect(result.pdf).toBeUndefined();
    expect(result.html).toBeUndefined();
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('never throws even on unexpected errors', async () => {
    // Point to non-existent directory to trigger a file error
    heraldConfig.newspaper_dir = '/nonexistent/path/that/does/not/exist';

    const result = await runNewspaperPipeline(
      '2026-02-28',
      heraldConfig,
      mockCompiler as CompilerFn,
    );

    // Should return a result, not throw
    expect(result).toBeDefined();
    expect(result.status).toBe('no-sources');
  });

  it('converts markdown to typst in combined file', async () => {
    const sourcesDir = join(heraldConfig.newspaper_dir, 'editions', '2026-02-28', 'sources');
    await mkdir(sourcesDir, { recursive: true });
    await writeFile(join(sourcesDir, 'editorial.md'), '# Main Title\n\nSome **bold** text');

    const templatesDir = join(heraldConfig.newspaper_dir, 'templates');
    await mkdir(templatesDir, { recursive: true });
    await writeFile(join(templatesDir, 'newspaper.typ'), 'template');

    await runNewspaperPipeline('2026-02-28', heraldConfig, mockCompiler as CompilerFn);

    const combinedPath = join(heraldConfig.newspaper_dir, 'editions', '2026-02-28', 'combined.typ');
    const combined = await readFile(combinedPath, 'utf-8');

    // Markdown headings should be converted to Typst headings
    expect(combined).toContain('= Main Title');
    // Bold should be converted
    expect(combined).toContain('*bold*');
    // Should not contain markdown-style heading
    expect(combined).not.toContain('# Main Title');
  });

  it('passes correct inputs to compileTypst', async () => {
    const sourcesDir = join(heraldConfig.newspaper_dir, 'editions', '2026-02-28', 'sources');
    await mkdir(sourcesDir, { recursive: true });
    await writeFile(join(sourcesDir, 'editorial.md'), '# Test');

    const templatesDir = join(heraldConfig.newspaper_dir, 'templates');
    await mkdir(templatesDir, { recursive: true });
    await writeFile(join(templatesDir, 'newspaper.typ'), 'template');

    await runNewspaperPipeline('2026-02-28', heraldConfig, mockCompiler as CompilerFn);

    const pdfCall = mockCompiler.mock.calls.find((call: unknown[]) => call[2] === 'pdf');
    expect(pdfCall).toBeDefined();

    // Check inputs passed to compileTypst
    const inputs = pdfCall?.[3] as Record<string, string>;
    expect(inputs.date).toBe('2026-02-28');
    expect(inputs['newspaper-md']).toBeDefined();
  });
});

describe('getEditionStatus', () => {
  let tempDir: string;
  let heraldConfig: HeraldConfig;

  beforeEach(async () => {
    tempDir = join(
      tmpdir(),
      `herald-status-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
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
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('returns all false when edition does not exist', async () => {
    const status = await getEditionStatus('2026-02-28', heraldConfig);

    expect(status.editionDate).toBe('2026-02-28');
    expect(status.hasSources).toBe(false);
    expect(status.hasPdf).toBe(false);
    expect(status.hasHtml).toBe(false);
    expect(status.hasTypst).toBe(false);
  });

  it('detects sources directory', async () => {
    const sourcesDir = join(heraldConfig.newspaper_dir, 'editions', '2026-02-28', 'sources');
    await mkdir(sourcesDir, { recursive: true });
    await writeFile(join(sourcesDir, 'editorial.md'), '# Content');

    const status = await getEditionStatus('2026-02-28', heraldConfig);

    expect(status.hasSources).toBe(true);
  });

  it('detects PDF file', async () => {
    const editionDir = join(heraldConfig.newspaper_dir, 'editions', '2026-02-28');
    await mkdir(editionDir, { recursive: true });
    await writeFile(join(editionDir, 'newspaper.pdf'), 'fake pdf content');

    const status = await getEditionStatus('2026-02-28', heraldConfig);

    expect(status.hasPdf).toBe(true);
    expect(status.pdfPath).toContain('newspaper.pdf');
  });

  it('detects HTML file', async () => {
    const editionDir = join(heraldConfig.newspaper_dir, 'editions', '2026-02-28');
    await mkdir(editionDir, { recursive: true });
    await writeFile(join(editionDir, 'newspaper.html'), '<html>content</html>');

    const status = await getEditionStatus('2026-02-28', heraldConfig);

    expect(status.hasHtml).toBe(true);
    expect(status.htmlPath).toContain('newspaper.html');
  });

  it('detects combined markdown file', async () => {
    const editionDir = join(heraldConfig.newspaper_dir, 'editions', '2026-02-28');
    await mkdir(editionDir, { recursive: true });
    await writeFile(join(editionDir, 'combined.typ'), '= Content');

    const status = await getEditionStatus('2026-02-28', heraldConfig);

    expect(status.hasTypst).toBe(true);
    expect(status.typstPath).toContain('combined.typ');
  });

  it('returns complete status with all files present', async () => {
    const editionDir = join(heraldConfig.newspaper_dir, 'editions', '2026-02-28');
    const sourcesDir = join(editionDir, 'sources');
    await mkdir(sourcesDir, { recursive: true });
    await writeFile(join(sourcesDir, 'editorial.md'), '# Content');
    await writeFile(join(editionDir, 'newspaper.pdf'), 'pdf');
    await writeFile(join(editionDir, 'newspaper.html'), 'html');
    await writeFile(join(editionDir, 'combined.typ'), 'typst');

    const status = await getEditionStatus('2026-02-28', heraldConfig);

    expect(status.hasSources).toBe(true);
    expect(status.hasPdf).toBe(true);
    expect(status.hasHtml).toBe(true);
    expect(status.hasTypst).toBe(true);
  });
});
