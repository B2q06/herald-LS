import type { HeraldConfig } from '@herald/shared';
import { Hono } from 'hono';
import type { AgentRegistry } from '../agent-loader/agent-registry.ts';
import type { MemoryLibrarian } from '../librarian/ask-librarian.ts';
import type { ScheduleRegistry } from '../scheduler/schedule-registry.ts';
import type { PostRunContext } from '../session/run-executor.ts';
import type { SessionManager } from '../session/session-manager.ts';
import { createAgentRoutes } from './agents.ts';
import { createLibrarianRoutes } from './librarian.ts';
import { createNewspaperRoutes } from './newspaper.ts';
import { createRunRoutes } from './runs.ts';
import { createScheduleRoutes } from './schedule.ts';
import { createSystemRoutes } from './system.ts';

export interface AppDeps {
  registry?: AgentRegistry;
  sessionManager?: SessionManager;
  heraldConfig?: HeraldConfig;
  sdkConfigured?: boolean;
  scheduleRegistry?: ScheduleRegistry;
  librarian?: MemoryLibrarian;
  postRunContext?: PostRunContext;
}

export function createApp(registryOrDeps?: AgentRegistry | AppDeps) {
  const app = new Hono();

  app.onError((_err, c) => {
    console.error('Unhandled error in request handler');
    return c.json({ error: 'Internal server error' }, 500);
  });

  app.route('/', createSystemRoutes());

  // Support both old signature (registry only) and new signature (deps object)
  let registry: AgentRegistry | undefined;
  let sessionManager: SessionManager | undefined;
  let heraldConfig: AppDeps['heraldConfig'];
  let sdkConfigured = false;
  let scheduleRegistry: ScheduleRegistry | undefined;
  let librarian: MemoryLibrarian | undefined;
  let postRunContext: PostRunContext | undefined;

  if (registryOrDeps && 'has' in registryOrDeps) {
    // Old-style: just a registry
    registry = registryOrDeps;
  } else if (registryOrDeps) {
    // New-style: deps object
    registry = registryOrDeps.registry;
    sessionManager = registryOrDeps.sessionManager;
    heraldConfig = registryOrDeps.heraldConfig;
    sdkConfigured = registryOrDeps.sdkConfigured ?? false;
    scheduleRegistry = registryOrDeps.scheduleRegistry;
    librarian = registryOrDeps.librarian;
    postRunContext = registryOrDeps.postRunContext;
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
        postRunContext,
      }),
    );
  }

  if (registry && sessionManager && heraldConfig) {
    app.route(
      '/',
      createNewspaperRoutes({
        registry,
        sessionManager,
        heraldConfig,
        sdkConfigured,
      }),
    );
  }

  if (scheduleRegistry) {
    app.route('/', createScheduleRoutes(scheduleRegistry));
  }

  if (librarian) {
    app.route('/', createLibrarianRoutes(librarian));
  }

  return app;
}
