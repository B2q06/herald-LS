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
    if (!agent.config.schedule) continue;

    if (name === 'newspaper') {
      // Newspaper agent uses the team orchestration pipeline
      scheduleRegistry.register(`newspaper:${agent.config.schedule}`, agent.config.schedule, () => {
        console.log('[herald] Newspaper synthesis firing');
        import('../newspaper/newspaper-executor.ts')
          .then(({ executeNewspaperRun }) =>
            executeNewspaperRun(agentRegistry, sessionManager, heraldConfig),
          )
          .catch((err) => {
            console.error('[herald] Newspaper synthesis error:', err);
          });
      });
    } else {
      // Standard patrol agent
      scheduleRegistry.register(name, agent.config.schedule, () => {
        console.log(`[herald] Scheduled run: ${name} (cron: ${agent.config.schedule})`);
        executeRun(name, agent.config, heraldConfig, sessionManager).catch((err) => {
          console.error(`[herald] Scheduled run failed for ${name}:`, err);
        });
      });
    }
  }

  // Weekly synthesis cron — Friday 5 PM
  scheduleRegistry.register('newspaper-weekly', '0 17 * * 5', () => {
    console.log('[herald] Weekly newspaper synthesis firing');
    import('../newspaper/newspaper-executor.ts')
      .then(({ executeNewspaperRun }) =>
        executeNewspaperRun(agentRegistry, sessionManager, heraldConfig, undefined, 'weekly'),
      )
      .then((result) => {
        return import('../newspaper/git-versioner.ts').then(({ commitWeekly }) =>
          commitWeekly(result.editionDir, `Weekly synthesis: ${result.editionDate}`),
        );
      })
      .catch((err) => {
        console.error('[herald] Weekly synthesis error:', err);
      });
  });

  return scheduleRegistry;
}
