/**
 * Newspaper compilation pipeline orchestrator.
 *
 * Combines source markdown files, converts to Typst markup,
 * and invokes Typst compilation for PDF and HTML output.
 *
 * Never throws -- all errors are caught and returned in PipelineResult.
 */

import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { HeraldConfig } from '@herald/shared';
import { markdownToTypst } from './markdown-to-typst.ts';
import type { CompilationResult } from './typst-compiler.ts';
import { compileTypst as defaultCompileTypst } from './typst-compiler.ts';

export interface PipelineResult {
  status: 'compiled' | 'partial' | 'source-only' | 'no-sources';
  pdf?: string;
  html?: string;
  errors: string[];
}

export interface EditionStatus {
  editionDate: string;
  hasSources: boolean;
  hasPdf: boolean;
  hasHtml: boolean;
  hasTypst: boolean;
  pdfPath?: string;
  htmlPath?: string;
  typstPath?: string;
}

/** Compiler function type for dependency injection in tests */
export type CompilerFn = (
  templatePath: string,
  outputPath: string,
  format: 'pdf' | 'html',
  inputs: Record<string, string>,
  timeoutMs?: number,
) => Promise<CompilationResult>;

/**
 * Run the full newspaper compilation pipeline:
 * 1. Validate sources exist
 * 2. Combine .md files (editorial.md first, then alphabetical)
 * 3. Convert combined markdown to Typst markup
 * 4. Compile PDF
 * 5. Compile HTML
 *
 * The compiler parameter defaults to the real compileTypst function.
 * Tests can pass a mock compiler to avoid subprocess dependency.
 */
export async function runNewspaperPipeline(
  editionDate: string,
  heraldConfig: HeraldConfig,
  compiler: CompilerFn = defaultCompileTypst,
): Promise<PipelineResult> {
  const errors: string[] = [];

  try {
    const editionDir = join(heraldConfig.newspaper_dir, 'editions', editionDate);
    const sourcesDir = join(editionDir, 'sources');

    // Step 1: Validate sources exist
    let sourceFiles: string[];
    try {
      const allFiles = await readdir(sourcesDir);
      sourceFiles = allFiles.filter((f) => f.endsWith('.md'));
    } catch {
      return { status: 'no-sources', errors: [] };
    }

    if (sourceFiles.length === 0) {
      return { status: 'no-sources', errors: [] };
    }

    // Step 2: Combine files -- editorial.md first, then remaining alphabetically
    const editorialFile = 'editorial.md';
    const hasEditorial = sourceFiles.includes(editorialFile);
    const otherFiles = sourceFiles.filter((f) => f !== editorialFile).sort();

    const orderedFiles = hasEditorial ? [editorialFile, ...otherFiles] : otherFiles;

    const parts: string[] = [];
    for (const file of orderedFiles) {
      const content = await readFile(join(sourcesDir, file), 'utf-8');
      parts.push(content);
    }

    const combinedMarkdown = parts.join('\n\n');

    // Step 3: Convert markdown to Typst markup
    const typstContent = markdownToTypst(combinedMarkdown);
    const combinedPath = join(editionDir, 'combined.typ');
    await writeFile(combinedPath, typstContent, 'utf-8');

    // Step 4 & 5: Compile PDF and HTML
    const templatePath = join(heraldConfig.newspaper_dir, 'templates', 'newspaper.typ');
    const pdfPath = join(editionDir, 'newspaper.pdf');
    const htmlPath = join(editionDir, 'newspaper.html');

    const inputs = {
      date: editionDate,
      'newspaper-md': combinedPath,
    };

    const [pdfResult, htmlResult] = await Promise.all([
      compiler(templatePath, pdfPath, 'pdf', inputs),
      compiler(templatePath, htmlPath, 'html', inputs),
    ]);

    if (!pdfResult.success) {
      errors.push(pdfResult.error ?? 'PDF compilation failed');
    }
    if (!htmlResult.success) {
      errors.push(htmlResult.error ?? 'HTML compilation failed');
    }

    const pdf = pdfResult.success ? pdfResult.outputPath : undefined;
    const html = htmlResult.success ? htmlResult.outputPath : undefined;

    if (pdf && html) {
      console.log(`[herald] Newspaper pipeline: compiled (PDF + HTML)`);
      return { status: 'compiled', pdf, html, errors };
    }

    if (pdf || html) {
      console.log(`[herald] Newspaper pipeline: partial (${pdf ? 'PDF' : 'HTML'} only)`);
      return { status: 'partial', pdf, html, errors };
    }

    console.log(
      '[herald] Newspaper pipeline: source-only (compilation failed, markdown available)',
    );
    return { status: 'source-only', errors };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error(`[herald] Newspaper pipeline error: ${error}`);
    errors.push(error);
    return { status: 'source-only', errors };
  }
}

/**
 * Check what outputs exist for a given edition date.
 */
export async function getEditionStatus(
  editionDate: string,
  heraldConfig: HeraldConfig,
): Promise<EditionStatus> {
  const editionDir = join(heraldConfig.newspaper_dir, 'editions', editionDate);

  const status: EditionStatus = {
    editionDate,
    hasSources: false,
    hasPdf: false,
    hasHtml: false,
    hasTypst: false,
  };

  try {
    // Check sources directory
    const sourcesDir = join(editionDir, 'sources');
    try {
      const files = await readdir(sourcesDir);
      status.hasSources = files.some((f) => f.endsWith('.md'));
    } catch {
      // Sources dir doesn't exist
    }

    // Check PDF
    const pdfPath = join(editionDir, 'newspaper.pdf');
    try {
      await stat(pdfPath);
      status.hasPdf = true;
      status.pdfPath = pdfPath;
    } catch {
      // PDF doesn't exist
    }

    // Check HTML
    const htmlPath = join(editionDir, 'newspaper.html');
    try {
      await stat(htmlPath);
      status.hasHtml = true;
      status.htmlPath = htmlPath;
    } catch {
      // HTML doesn't exist
    }

    // Check combined markdown
    const typstPath = join(editionDir, 'combined.typ');
    try {
      await stat(typstPath);
      status.hasTypst = true;
      status.typstPath = typstPath;
    } catch {
      // Combined file doesn't exist
    }
  } catch {
    // Edition dir doesn't exist -- all flags remain false
  }

  return status;
}
