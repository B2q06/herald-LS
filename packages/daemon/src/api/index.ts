import { Hono } from 'hono';
import type { AgentRegistry } from '../agent-loader/agent-registry.ts';
import type { SessionManager } from '../session/session-manager.ts';
import { createAgentRoutes } from './agents.ts';
import { createRunRoutes } from './runs.ts';
import { systemRoutes } from './system.ts';

export interface AppDeps {
  registry?: AgentRegistry;
  sessionManager?: SessionManager;
  heraldConfig?: { memory_dir: string; personas_dir: string } & Record<string, unknown>;
  sdkConfigured?: boolean;
}

export function createApp(registryOrDeps?: AgentRegistry | AppDeps) {
  const app = new Hono();

  app.onError((_err, c) => {
    console.error('Unhandled error in request handler');
    return c.json({ error: 'Internal server error' }, 500);
  });

  app.route('/', systemRoutes);

  // Support both old signature (registry only) and new signature (deps object)
  let registry: AgentRegistry | undefined;
  let sessionManager: SessionManager | undefined;
  let heraldConfig: AppDeps['heraldConfig'];
  let sdkConfigured = false;

  if (registryOrDeps && 'has' in registryOrDeps) {
    // Old-style: just a registry
    registry = registryOrDeps;
  } else if (registryOrDeps) {
    // New-style: deps object
    registry = registryOrDeps.registry;
    sessionManager = registryOrDeps.sessionManager;
    heraldConfig = registryOrDeps.heraldConfig;
    sdkConfigured = registryOrDeps.sdkConfigured ?? false;
  }

  if (registry) {
    app.route('/', createAgentRoutes(registry));
  }

  if (registry && sessionManager && heraldConfig) {
    app.route(
      '/',
      createRunRoutes({
        registry,
        sessionManager,
        heraldConfig,
        sdkConfigured,
      }),
    );
  }

  return app;
}
