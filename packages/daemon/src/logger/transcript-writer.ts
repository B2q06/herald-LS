import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { HeraldConfig } from '@herald/shared';

export interface TranscriptMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function writeTranscript(
  agentName: string,
  runId: string,
  messages: TranscriptMessage[],
  heraldConfig: HeraldConfig,
): Promise<void> {
  const conversationsDir = join(heraldConfig.memory_dir, 'conversations');
  await mkdir(conversationsDir, { recursive: true });

  // Extract date from runId (format: YYYYMMDD-HHmmss) or use today
  const dateStr = runId.slice(0, 8);
  const formattedDate = `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;

  const filename = `${formattedDate}-${agentName}.md`;
  const filepath = join(conversationsDir, filename);

  // Build the new run section
  const lines: string[] = [];

  // If file doesn't exist, add the top-level heading
  const fileExists = existsSync(filepath);
  if (!fileExists) {
    lines.push(`# Conversation: ${agentName} — ${formattedDate}`);
    lines.push('');
  }

  lines.push(`## Run: ${runId}`);
  lines.push('');

  for (const msg of messages) {
    const roleHeading = msg.role === 'user' ? 'User' : 'Assistant';
    lines.push(`### ${roleHeading}`);
    lines.push(msg.content);
    lines.push('');
  }

  const section = lines.join('\n');

  if (fileExists) {
    // Append to existing file
    const existing = await Bun.file(filepath).text();
    await Bun.write(filepath, `${existing}\n${section}`);
  } else {
    await Bun.write(filepath, section);
  }
}
