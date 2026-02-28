import { AgentRegistry } from './agent-loader/agent-registry.ts';
import { createApp } from './api/index.ts';
import { loadConfig } from './config.ts';
import { initScheduler } from './scheduler/index.ts';
import type { SdkAdapter } from './session/index.ts';
import { AnthropicAdapter, initSessionManager, NullAdapter } from './session/index.ts';
import { initialScan, watchAgentsDir } from './watcher/agent-discovery.ts';

const config = await loadConfig();

// Phase 1: Initial scan to populate agent registry (no watcher yet)
const registry = new AgentRegistry();
const scaffoldOptions = {
  memoryDir: config.memory_dir,
  reportsDir: config.reports_dir,
};

await initialScan({
  agentsDir: config.agents_dir,
  registry,
  scaffoldOptions,
});

console.log(`[herald] Agent loader initialized — ${registry.size} agent(s) loaded`);

// Phase 2: Create session manager
const apiKey = process.env.ANTHROPIC_API_KEY ?? process.env.CLAUDE_API_KEY;
const sdkConfigured = Boolean(apiKey);

let sdkAdapter: SdkAdapter;
if (apiKey) {
  sdkAdapter = new AnthropicAdapter(apiKey);
  console.log('[herald] Claude SDK configured');
} else {
  sdkAdapter = new NullAdapter();
  console.warn(
    '[herald] Warning: No ANTHROPIC_API_KEY or CLAUDE_API_KEY set — SDK features disabled',
  );
}

const sessionManager = initSessionManager(sdkAdapter);

// Phase 3: Initialize scheduler (creates cron jobs for agents with schedule field)
const scheduleRegistry = initScheduler(registry, sessionManager, config);

// Phase 4: Start watcher with schedule context for hot-reload
const watcher = watchAgentsDir({
  agentsDir: config.agents_dir,
  registry,
  scaffoldOptions,
  scheduleContext: {
    scheduleRegistry,
    sessionManager,
    heraldConfig: config,
  },
});

const app = createApp({
  registry,
  sessionManager,
  heraldConfig: config,
  sdkConfigured,
  scheduleRegistry,
});

const server = Bun.serve({
  fetch: app.fetch,
  port: config.port,
  hostname: '127.0.0.1',
});

function shutdown() {
  console.log('Herald daemon shutting down...');
  scheduleRegistry.stop();
  watcher.close();
  server.stop();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

console.log(`Herald daemon listening on http://127.0.0.1:${server.port}`);
