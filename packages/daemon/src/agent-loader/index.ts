import type { FSWatcher } from 'node:fs';
import type { HeraldConfig } from '@herald/shared';
import type { ScheduleContext } from '../watcher/agent-discovery.ts';
import { initialScan, watchAgentsDir } from '../watcher/agent-discovery.ts';
import { AgentRegistry } from './agent-registry.ts';

export { AgentRegistry } from './agent-registry.ts';
export { scaffoldAgentDirs } from './scaffolder.ts';
export { parseAgentYaml } from './yaml-parser.ts';

export interface AgentLoaderResult {
  registry: AgentRegistry;
  watcher: FSWatcher;
}

export async function initAgentLoader(
  config: HeraldConfig,
  scheduleContext?: ScheduleContext,
): Promise<AgentLoaderResult> {
  const registry = new AgentRegistry();

  const discoveryOptions = {
    agentsDir: config.agents_dir,
    registry,
    scaffoldOptions: {
      memoryDir: config.memory_dir,
      reportsDir: config.reports_dir,
    },
    scheduleContext,
  };

  await initialScan(discoveryOptions);

  const watcher = watchAgentsDir(discoveryOptions);

  console.log(`[herald] Agent loader initialized — ${registry.size} agent(s) loaded`);

  return { registry, watcher };
}
