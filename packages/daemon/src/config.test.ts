import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { loadConfig } from './config.ts';

describe('loadConfig', () => {
  let tempDir: string;

  afterEach(async () => {
    // Clean up env vars
    delete process.env.HERALD_PORT;
    delete process.env.HERALD_DATA_DIR;
    delete process.env.HERALD_LOG_LEVEL;

    // Clean up temp dir
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  async function createTempConfig(content: string): Promise<string> {
    tempDir = await mkdtemp(join(tmpdir(), 'herald-test-'));
    const configPath = join(tempDir, 'herald.config.yaml');
    await writeFile(configPath, content, 'utf-8');
    return configPath;
  }

  it('loads and parses a valid config file', async () => {
    const configPath = await createTempConfig(`
port: 4000
data_dir: ./test-data
log_level: debug
`);

    const config = await loadConfig(configPath);
    expect(config.port).toBe(4000);
    expect(config.data_dir).toBe('./test-data');
    expect(config.log_level).toBe('debug');
  });

  it('applies schema defaults for missing fields', async () => {
    const configPath = await createTempConfig(`
port: 3117
`);

    const config = await loadConfig(configPath);
    expect(config.port).toBe(3117);
    expect(config.data_dir).toBe('./data');
    expect(config.agents_dir).toBe('./agents');
    expect(config.log_level).toBe('info');
  });

  it('applies HERALD_PORT env var override', async () => {
    const configPath = await createTempConfig(`
port: 3117
`);

    process.env.HERALD_PORT = '9999';
    const config = await loadConfig(configPath);
    expect(config.port).toBe(9999);
  });

  it('applies HERALD_DATA_DIR env var override', async () => {
    const configPath = await createTempConfig(`
port: 3117
`);

    process.env.HERALD_DATA_DIR = '/tmp/herald-data';
    const config = await loadConfig(configPath);
    expect(config.data_dir).toBe('/tmp/herald-data');
  });

  it('applies HERALD_LOG_LEVEL env var override', async () => {
    const configPath = await createTempConfig(`
port: 3117
`);

    process.env.HERALD_LOG_LEVEL = 'warn';
    const config = await loadConfig(configPath);
    expect(config.log_level).toBe('warn');
  });

  it('throws when config file is not found', async () => {
    await expect(loadConfig('/nonexistent/path/herald.config.yaml')).rejects.toThrow(
      'Config file not found',
    );
  });

  it('env vars override file values', async () => {
    const configPath = await createTempConfig(`
port: 3117
data_dir: ./data
log_level: info
`);

    process.env.HERALD_PORT = '5000';
    process.env.HERALD_DATA_DIR = '/custom/data';
    process.env.HERALD_LOG_LEVEL = 'error';

    const config = await loadConfig(configPath);
    expect(config.port).toBe(5000);
    expect(config.data_dir).toBe('/custom/data');
    expect(config.log_level).toBe('error');
  });
});
