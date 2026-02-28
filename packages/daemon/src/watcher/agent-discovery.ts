import type { FSWatcher } from 'node:fs';
import { existsSync, watch } from 'node:fs';
import { join, resolve } from 'node:path';
import type { HeraldConfig } from '@herald/shared';
import { Glob } from 'bun';
import type { AgentRegistry } from '../agent-loader/agent-registry.ts';
import type { ScaffoldOptions } from '../agent-loader/scaffolder.ts';
import { scaffoldAgentDirs } from '../agent-loader/scaffolder.ts';
import { parseAgentYaml } from '../agent-loader/yaml-parser.ts';
import type { ScheduleRegistry } from '../scheduler/schedule-registry.ts';
import { executeRun } from '../session/run-executor.ts';
import type { SessionManager } from '../session/session-manager.ts';

export interface ScheduleContext {
  scheduleRegistry: ScheduleRegistry;
  sessionManager: SessionManager;
  heraldConfig: HeraldConfig;
}

export interface AgentDiscoveryOptions {
  agentsDir: string;
  registry: AgentRegistry;
  scaffoldOptions: ScaffoldOptions;
  scheduleContext?: ScheduleContext;
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
  scheduleContext?: ScheduleContext,
): Promise<void> {
  const result = await parseAgentYaml(filePath);
  if (!result.success) {
    console.warn(`[herald] ${result.error}`);
    return;
  }

  const { config } = result;
  const name = config.name;

  // Capture the old schedule before updating the registry
  const oldAgent = registry.get(name);
  const oldSchedule = oldAgent?.config.schedule;

  if (registry.has(name)) {
    registry.update(name, config);
    console.log(`[herald] Agent updated: ${name}`);
  } else {
    registry.register(name, config);
    console.log(`[herald] Agent registered: ${name}`);
  }

  // Update schedule if schedule context is available
  if (scheduleContext) {
    const { scheduleRegistry, sessionManager, heraldConfig } = scheduleContext;
    const newSchedule = config.schedule;

    if (oldSchedule !== newSchedule) {
      if (!newSchedule) {
        // Schedule removed
        scheduleRegistry.remove(name);
      } else {
        // Schedule added or changed
        const callback = () => {
          console.log(`[herald] Scheduled run: ${name} (cron: ${config.schedule})`);
          executeRun(name, config, heraldConfig, sessionManager).catch((err) => {
            console.error(`[herald] Scheduled run failed for ${name}:`, err);
          });
        };

        if (oldSchedule) {
          scheduleRegistry.update(name, newSchedule, callback);
        } else {
          scheduleRegistry.register(name, newSchedule, callback);
        }
      }
    }
  }

  try {
    await scaffoldAgentDirs(name, config, scaffoldOptions);
  } catch (err) {
    console.error(`[herald] Failed to scaffold directories for ${name}:`, err);
  }
}

function handleAgentDeletion(
  filename: string,
  registry: AgentRegistry,
  scheduleContext?: ScheduleContext,
): void {
  // Derive agent name from filename: "ml-researcher.yaml" -> need to check registry
  // Since we can't know the name from filename alone (the name field inside YAML could differ),
  // we look for agents whose config might match. But simplest approach: use filename stem as lookup.
  const stem = filename.replace(/\.yaml$/, '');

  // Check all registered agents to find one from this file
  // For simplicity, use the filename stem — convention is filename matches agent name
  if (registry.has(stem)) {
    registry.remove(stem);
    if (scheduleContext) {
      scheduleContext.scheduleRegistry.remove(stem);
    }
    console.log(`[herald] Agent removed: ${stem}`);
  }
}

export async function initialScan(options: AgentDiscoveryOptions): Promise<void> {
  const { agentsDir, registry, scaffoldOptions, scheduleContext } = options;

  if (!existsSync(agentsDir)) {
    console.warn(`[herald] Agents directory not found: ${agentsDir}`);
    return;
  }

  const glob = new Glob('*.yaml');
  for await (const file of glob.scan(agentsDir)) {
    const filePath = resolve(join(agentsDir, file));
    await processAgentFile(filePath, registry, scaffoldOptions, scheduleContext);
  }
}

export function watchAgentsDir(options: AgentDiscoveryOptions): FSWatcher {
  const { agentsDir, registry, scaffoldOptions, scheduleContext } = options;

  const watcher = watch(agentsDir, { recursive: false }, (_event, filename) => {
    if (!filename?.endsWith('.yaml')) return;

    debounced(filename, () => {
      const filePath = resolve(join(agentsDir, filename));

      if (existsSync(filePath)) {
        processAgentFile(filePath, registry, scaffoldOptions, scheduleContext).catch((err) => {
          console.error(`[herald] Error processing agent file ${filename}:`, err);
        });
      } else {
        handleAgentDeletion(filename, registry, scheduleContext);
      }
    });
  });

  return watcher;
}
