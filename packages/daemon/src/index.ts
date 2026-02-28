import { initAgentLoader } from './agent-loader/index.ts';
import { createApp } from './api/index.ts';
import { loadConfig } from './config.ts';

const config = await loadConfig();

const { registry, watcher } = await initAgentLoader(config);
const app = createApp(registry);

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
