import type { HeraldConfig } from '@herald/shared';
import type { AgentRegistry } from '../agent-loader/agent-registry.ts';
import { executeRun } from '../session/run-executor.ts';
import type { SessionManager } from '../session/session-manager.ts';
import { ScheduleRegistry } from './schedule-registry.ts';

export { ScheduleRegistry } from './schedule-registry.ts';

export function initScheduler(
  agentRegistry: AgentRegistry,
  sessionManager: SessionManager,
  heraldConfig: HeraldConfig,
): ScheduleRegistry {
  const scheduleRegistry = new ScheduleRegistry();

  for (const [name, agent] of agentRegistry.getAll()) {
    if (agent.config.schedule) {
      scheduleRegistry.register(name, agent.config.schedule, () => {
        console.log(`[herald] Scheduled run: ${name} (cron: ${agent.config.schedule})`);
        executeRun(name, agent.config, heraldConfig, sessionManager).catch((err) => {
          console.error(`[herald] Scheduled run failed for ${name}:`, err);
        });
      });
    }
  }

  return scheduleRegistry;
}
