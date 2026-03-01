/**
 * Typst compiler subprocess invocation.
 *
 * Invokes the Typst CLI as a child process via Bun.spawn().
 * Never throws -- all errors are caught and returned in CompilationResult.
 * Enforces a timeout to prevent hanging (NFR9: <15s compilation).
 */

export interface CompilationResult {
  success: boolean;
  format: 'pdf' | 'html';
  outputPath?: string;
  error?: string;
  durationMs: number;
}

export interface SpawnResult {
  exitCode: number;
  stderr: string;
}

/**
 * Spawn a command as a subprocess and wait for it to complete.
 * Exported for testability -- tests can mock this function.
 */
export async function spawnCommand(args: string[], timeoutMs: number): Promise<SpawnResult> {
  const proc = Bun.spawn(args, {
    stdout: 'pipe',
    stderr: 'pipe',
  });

  const timeout = setTimeout(() => {
    proc.kill();
  }, timeoutMs);

  const exitCode = await proc.exited;
  clearTimeout(timeout);

  const stderr = await new Response(proc.stderr).text();
  return { exitCode, stderr };
}

export async function compileTypst(
  templatePath: string,
  outputPath: string,
  format: 'pdf' | 'html',
  inputs: Record<string, string>,
  timeoutMs = 15_000,
  spawn: typeof spawnCommand = spawnCommand,
): Promise<CompilationResult> {
  const startMs = Date.now();

  const args = ['typst', 'compile', templatePath, outputPath];
  if (format === 'html') {
    args.push('--format', 'html');
  }
  for (const [key, value] of Object.entries(inputs)) {
    args.push('--input', `${key}=${value}`);
  }

  try {
    const { exitCode, stderr } = await spawn(args, timeoutMs);
    const durationMs = Date.now() - startMs;

    if (exitCode !== 0) {
      console.error(`[herald] Typst compilation failed (${format}): ${stderr}`);
      return {
        success: false,
        format,
        durationMs,
        error: `Typst exited with code ${exitCode}: ${stderr}`,
      };
    }

    console.log(`[herald] Typst compiled ${format} in ${durationMs}ms`);
    return { success: true, format, outputPath, durationMs };
  } catch (err) {
    const durationMs = Date.now() - startMs;
    const error = err instanceof Error ? err.message : String(err);
    console.error(`[herald] Typst subprocess error (${format}): ${error}`);
    return {
      success: false,
      format,
      durationMs,
      error,
    };
  }
}
