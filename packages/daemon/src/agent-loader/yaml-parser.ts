import type { AgentConfig } from '@herald/shared';
import { AgentConfigSchema } from '@herald/shared';
import yaml from 'js-yaml';

export type ParseSuccess = { success: true; config: AgentConfig };
export type ParseFailure = { success: false; error: string };
export type ParseResult = ParseSuccess | ParseFailure;

export async function parseAgentYaml(filePath: string): Promise<ParseResult> {
  try {
    const file = Bun.file(filePath);
    if (!(await file.exists())) {
      return { success: false, error: `File not found: ${filePath}` };
    }

    const text = await file.text();
    const raw = yaml.load(text);

    if (raw === null || raw === undefined || typeof raw !== 'object') {
      return { success: false, error: `Invalid YAML structure in ${filePath}` };
    }

    const result = AgentConfigSchema.safeParse(raw);
    if (!result.success) {
      const issues = result.error.issues.map((i) => i.message).join(', ');
      return { success: false, error: `Validation failed for ${filePath}: ${issues}` };
    }

    return { success: true, config: result.data };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: `Failed to parse ${filePath}: ${message}` };
  }
}
