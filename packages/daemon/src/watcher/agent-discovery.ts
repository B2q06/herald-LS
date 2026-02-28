import type { FSWatcher } from 'node:fs';
import { existsSync, watch } from 'node:fs';
import { join, resolve } from 'node:path';
import { Glob } from 'bun';
import type { AgentRegistry } from '../agent-loader/agent-registry.ts';
import type { ScaffoldOptions } from '../agent-loader/scaffolder.ts';
import { scaffoldAgentDirs } from '../agent-loader/scaffolder.ts';
import { parseAgentYaml } from '../agent-loader/yaml-parser.ts';

export interface AgentDiscoveryOptions {
  agentsDir: string;
  registry: AgentRegistry;
  scaffoldOptions: ScaffoldOptions;
}

const debounceTimers = new Map<string, Timer>();

function debounced(filename: string, callback: () => void): void {
  const existing = debounceTimers.get(filename);
  if (existing) clearTimeout(existing);
  debounceTimers.set(
    filename,
    setTimeout(() => {
      debounceTimers.delete(filename);
      callback();
    }, 100),
  );
}

async function processAgentFile(
  filePath: string,
  registry: AgentRegistry,
  scaffoldOptions: ScaffoldOptions,
): Promise<void> {
  const result = await parseAgentYaml(filePath);
  if (!result.success) {
    console.warn(`[herald] ${result.error}`);
    return;
  }

  const { config } = result;
  const name = config.name;

  if (registry.has(name)) {
    registry.update(name, config);
    console.log(`[herald] Agent updated: ${name}`);
  } else {
    registry.register(name, config);
    console.log(`[herald] Agent registered: ${name}`);
  }

  try {
    await scaffoldAgentDirs(name, config, scaffoldOptions);
  } catch (err) {
    console.error(`[herald] Failed to scaffold directories for ${name}:`, err);
  }
}

function handleAgentDeletion(filename: string, registry: AgentRegistry): void {
  // Derive agent name from filename: "ml-researcher.yaml" -> need to check registry
  // Since we can't know the name from filename alone (the name field inside YAML could differ),
  // we look for agents whose config might match. But simplest approach: use filename stem as lookup.
  const stem = filename.replace(/\.yaml$/, '');

  // Check all registered agents to find one from this file
  // For simplicity, use the filename stem — convention is filename matches agent name
  if (registry.has(stem)) {
    registry.remove(stem);
    console.log(`[herald] Agent removed: ${stem}`);
  }
}

export async function initialScan(options: AgentDiscoveryOptions): Promise<void> {
  const { agentsDir, registry, scaffoldOptions } = options;

  if (!existsSync(agentsDir)) {
    console.warn(`[herald] Agents directory not found: ${agentsDir}`);
    return;
  }

  const glob = new Glob('*.yaml');
  for await (const file of glob.scan(agentsDir)) {
    const filePath = resolve(join(agentsDir, file));
    await processAgentFile(filePath, registry, scaffoldOptions);
  }
}

export function watchAgentsDir(options: AgentDiscoveryOptions): FSWatcher {
  const { agentsDir, registry, scaffoldOptions } = options;

  const watcher = watch(agentsDir, { recursive: false }, (_event, filename) => {
    if (!filename?.endsWith('.yaml')) return;

    debounced(filename, () => {
      const filePath = resolve(join(agentsDir, filename));

      if (existsSync(filePath)) {
        processAgentFile(filePath, registry, scaffoldOptions).catch((err) => {
          console.error(`[herald] Error processing agent file ${filename}:`, err);
        });
      } else {
        handleAgentDeletion(filename, registry);
      }
    });
  });

  return watcher;
}
