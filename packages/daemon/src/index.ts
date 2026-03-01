import { AgentRegistry } from './agent-loader/agent-registry.ts';
import { createApp } from './api/index.ts';
import { loadConfig } from './config.ts';
import { initDatabase } from './db/index.ts';
import { OllamaEmbedder } from './embedding/index.ts';
import { MemoryLibrarian } from './librarian/ask-librarian.ts';
import { runDepreciation } from './memory/depreciation.ts';
import { initScheduler } from './scheduler/index.ts';
import type { SdkAdapter } from './session/index.ts';
import { AgentSdkAdapter, initSessionManager, NullAdapter } from './session/index.ts';
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
// Detect Agent SDK auth availability
const hasApiKey = !!process.env.ANTHROPIC_API_KEY;
const hasOAuthToken = !!process.env.CLAUDE_CODE_OAUTH_TOKEN;
let hasClaude = false;
try {
  const proc = Bun.spawnSync(['which', 'claude']);
  hasClaude = proc.exitCode === 0;
} catch {
  // CLI detection failed
}
const sdkConfigured = hasApiKey || hasOAuthToken || hasClaude;

let sdkAdapter: SdkAdapter;
if (sdkConfigured) {
  sdkAdapter = new AgentSdkAdapter();
  const authMethod = hasApiKey ? 'API key' : hasOAuthToken ? 'OAuth token' : 'CLI credentials';
  console.log(`[herald] Agent SDK configured (${authMethod})`);
} else {
  sdkAdapter = new NullAdapter();
  console.warn(
    '[herald] Warning: No auth configured — set ANTHROPIC_API_KEY or run claude setup-token',
  );
}

const sessionManager = initSessionManager(sdkAdapter);

// Phase 2.5: Initialize database and embeddings
const heraldDb = await initDatabase(config);
const embedder = new OllamaEmbedder(config.ollama_url);
if (await embedder.isAvailable()) {
  console.log('[herald] Ollama embeddings available');
} else {
  console.log('[herald] Ollama not available — vector search disabled, FTS5 still active');
}

const librarian = new MemoryLibrarian(heraldDb, embedder);
sessionManager.setLibrarian(librarian);

// Phase 3: Initialize scheduler (groups agents by schedule, concurrent patrol cycles)
const { scheduleRegistry } = initScheduler(registry, sessionManager, config, {
  db: heraldDb,
  embedder,
});

// Register knowledge depreciation cron (daily at 3 AM)
scheduleRegistry.register('knowledge-depreciation', '0 3 * * *', () => {
  console.log('[herald] Running knowledge depreciation...');
  const affected = runDepreciation(heraldDb);
  console.log(`[herald] Depreciation complete — ${affected} item(s) decayed`);
});

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

const postRunContext = { db: heraldDb, embedder };
const app = createApp({
  registry,
  sessionManager,
  heraldConfig: config,
  sdkConfigured,
  scheduleRegistry,
  librarian,
  postRunContext,
});

const server = Bun.serve({
  fetch: app.fetch,
  port: config.port,
  hostname: '127.0.0.1',
  idleTimeout: 0,
});

function shutdown() {
  console.log('Herald daemon shutting down...');
  scheduleRegistry.stop();
  watcher.close();
  heraldDb.close();
  server.stop();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

console.log(`Herald daemon listening on http://127.0.0.1:${server.port}`);
