import { initAgentLoader } from './agent-loader/index.ts';
import { createApp } from './api/index.ts';
import { loadConfig } from './config.ts';
import type { SdkAdapter } from './session/index.ts';
import { AnthropicAdapter, initSessionManager, NullAdapter } from './session/index.ts';

const config = await loadConfig();

const { registry, watcher } = await initAgentLoader(config);

// Check for API key — support both ANTHROPIC_API_KEY and CLAUDE_API_KEY
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

const app = createApp({
  registry,
  sessionManager,
  heraldConfig: config,
  sdkConfigured,
});

const server = Bun.serve({
  fetch: app.fetch,
  port: config.port,
  hostname: '127.0.0.1',
});

function shutdown() {
  console.log('Herald daemon shutting down...');
  watcher.close();
  server.stop();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

console.log(`Herald daemon listening on http://127.0.0.1:${server.port}`);
