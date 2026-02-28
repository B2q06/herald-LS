import { mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { HeraldConfig } from '@herald/shared';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { writeTranscript } from './transcript-writer.ts';

describe('writeTranscript', () => {
  let tempDir: string;
  let heraldConfig: HeraldConfig;

  beforeEach(async () => {
    tempDir = join(tmpdir(), `herald-transcript-test-${Date.now()}`);
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

  it('creates transcript file with correct format', async () => {
    const messages = [
      { role: 'user' as const, content: 'Hello agent' },
      { role: 'assistant' as const, content: 'Hello! I am ready to assist.' },
    ];

    await writeTranscript('test-agent', '20260228-053000', messages, heraldConfig);

    const filepath = join(tempDir, 'memory', 'conversations', '2026-02-28-test-agent.md');
    const content = await Bun.file(filepath).text();

    expect(content).toContain('# Conversation: test-agent — 2026-02-28');
    expect(content).toContain('## Run: 20260228-053000');
    expect(content).toContain('### User');
    expect(content).toContain('Hello agent');
    expect(content).toContain('### Assistant');
    expect(content).toContain('Hello! I am ready to assist.');
  });

  it('creates conversations directory if it does not exist', async () => {
    const messages = [{ role: 'user' as const, content: 'Test' }];

    await writeTranscript('test-agent', '20260228-120000', messages, heraldConfig);

    const filepath = join(tempDir, 'memory', 'conversations', '2026-02-28-test-agent.md');
    const file = Bun.file(filepath);
    expect(await file.exists()).toBe(true);
  });

  it('appends to existing file for same day', async () => {
    const messages1 = [
      { role: 'user' as const, content: 'First prompt' },
      { role: 'assistant' as const, content: 'First response' },
    ];

    const messages2 = [
      { role: 'user' as const, content: 'Second prompt' },
      { role: 'assistant' as const, content: 'Second response' },
    ];

    await writeTranscript('test-agent', '20260228-053000', messages1, heraldConfig);
    await writeTranscript('test-agent', '20260228-060000', messages2, heraldConfig);

    const filepath = join(tempDir, 'memory', 'conversations', '2026-02-28-test-agent.md');
    const content = await Bun.file(filepath).text();

    // Should have one top-level heading
    const headingCount = (content.match(/# Conversation:/g) || []).length;
    expect(headingCount).toBe(1);

    // Should have two run sections
    expect(content).toContain('## Run: 20260228-053000');
    expect(content).toContain('## Run: 20260228-060000');

    // Both messages present
    expect(content).toContain('First prompt');
    expect(content).toContain('Second response');
  });

  it('handles empty messages array', async () => {
    await writeTranscript('test-agent', '20260228-053000', [], heraldConfig);

    const filepath = join(tempDir, 'memory', 'conversations', '2026-02-28-test-agent.md');
    const content = await Bun.file(filepath).text();

    expect(content).toContain('# Conversation: test-agent — 2026-02-28');
    expect(content).toContain('## Run: 20260228-053000');
  });
});
