import type { AgentConfig, HeraldConfig } from '@herald/shared';
import type { AgentRegistry } from '../agent-loader/agent-registry.ts';
import { executeRun, generateRunId, type PostRunContext, type RunResult } from '../session/run-executor.ts';
import type { SessionManager } from '../session/session-manager.ts';

export interface AgentCycleResult {
  name: string;
  status: 'success' | 'failed';
  runId: string;
  durationMs: number;
  error?: string;
}

export interface PatrolCycleResult {
  cycleId: string;
  schedule: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  agents: AgentCycleResult[];
}

export class PatrolCycleManager {
  private lastCycleResult: PatrolCycleResult | null = null;
  private activeCycle: Promise<PatrolCycleResult> | null = null;

  async executeCycle(
    agents: Array<{ name: string; config: AgentConfig }>,
    heraldConfig: HeraldConfig,
    sessionManager: SessionManager,
    registry: AgentRegistry,
    postRunContext?: PostRunContext,
  ): Promise<PatrolCycleResult> {
    const cyclePromise = this._executeCycleInner(agents, heraldConfig, sessionManager, registry, postRunContext);
    this.activeCycle = cyclePromise;
    try {
      return await cyclePromise;
    } finally {
      this.activeCycle = null;
    }
  }

  private async _executeCycleInner(
    agents: Array<{ name: string; config: AgentConfig }>,
    heraldConfig: HeraldConfig,
    sessionManager: SessionManager,
    registry: AgentRegistry,
    postRunContext?: PostRunContext,
  ): Promise<PatrolCycleResult> {
    const cycleId = generateRunId();
    const startedAt = new Date().toISOString();
    const startMs = Date.now();

    // Launch all agents concurrently — allSettled ensures one failure doesn't abort others
    const results = await Promise.allSettled(
      agents.map(({ name, config }) =>
        executeRun(name, config, heraldConfig, sessionManager, registry, undefined, postRunContext),
      ),
    );

    const finishedAt = new Date().toISOString();
    const durationMs = Date.now() - startMs;

    const agentResults: AgentCycleResult[] = results.map((result, i) => {
      const agent = agents[i];
      if (result.status === 'fulfilled') {
        const run: RunResult = result.value;
        return {
          name: agent.name,
          status: run.status,
          runId: run.runId,
          durationMs: new Date(run.finishedAt).getTime() - new Date(run.startedAt).getTime(),
        };
      }
      return {
        name: agent.name,
        status: 'failed' as const,
        runId: 'unknown',
        durationMs: 0,
        error: result.reason instanceof Error ? result.reason.message : String(result.reason),
      };
    });

    const cycleResult: PatrolCycleResult = {
      cycleId,
      schedule: agents[0]?.config.schedule ?? 'manual',
      startedAt,
      finishedAt,
      durationMs,
      agents: agentResults,
    };

    this.lastCycleResult = cycleResult;

    const successCount = agentResults.filter((a) => a.status === 'success').length;
    console.log(
      `[herald] Patrol cycle ${cycleId}: ${successCount}/${agents.length} succeeded in ${durationMs}ms`,
    );

    return cycleResult;
  }

  getLastCycleResult(): PatrolCycleResult | null {
    return this.lastCycleResult;
  }

  isRunning(): boolean {
    return this.activeCycle !== null;
  }
}
