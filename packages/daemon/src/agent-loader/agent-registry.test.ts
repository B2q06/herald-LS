import type { AgentConfig } from '@herald/shared';
import { beforeEach, describe, expect, it } from 'vitest';
import { AgentRegistry } from './agent-registry.ts';

describe('AgentRegistry', () => {
  let registry: AgentRegistry;

  const makeConfig = (name: string): AgentConfig => ({
    name,
    persona: `personas/${name}.md`,
    output_dir: `reports/${name}`,
    session_limit: 10,
    notify_policy: 'failures',
    team_eligible: false,
  });

  beforeEach(() => {
    registry = new AgentRegistry();
  });

  describe('register', () => {
    it('registers a new agent', () => {
      const config = makeConfig('test-agent');
      registry.register('test-agent', config);

      expect(registry.has('test-agent')).toBe(true);
      expect(registry.size).toBe(1);
    });

    it('stores config and metadata', () => {
      const config = makeConfig('test-agent');
      registry.register('test-agent', config);

      const agent = registry.get('test-agent');
      expect(agent).toBeDefined();
      expect(agent?.config.name).toBe('test-agent');
      expect(agent?.status).toBe('active');
      expect(agent?.registeredAt).toBeTruthy();
    });

    it('overwrites existing agent on re-register', () => {
      const config1 = makeConfig('test-agent');
      registry.register('test-agent', config1);

      const config2 = makeConfig('test-agent');
      config2.session_limit = 20;
      registry.register('test-agent', config2);

      expect(registry.size).toBe(1);
      expect(registry.get('test-agent')?.config.session_limit).toBe(20);
    });
  });

  describe('update', () => {
    it('updates an existing agent config', () => {
      const config = makeConfig('test-agent');
      registry.register('test-agent', config);

      const updatedConfig = makeConfig('test-agent');
      updatedConfig.session_limit = 25;

      const result = registry.update('test-agent', updatedConfig);
      expect(result).toBe(true);
      expect(registry.get('test-agent')?.config.session_limit).toBe(25);
    });

    it('returns false for non-existent agent', () => {
      const config = makeConfig('nonexistent');
      const result = registry.update('nonexistent', config);
      expect(result).toBe(false);
    });

    it('clears previous error on successful update', () => {
      const config = makeConfig('test-agent');
      registry.register('test-agent', config);

      // Simulate an error state
      const agent = registry.get('test-agent');
      if (agent) {
        agent.status = 'error';
        agent.lastError = 'some error';
      }

      const updatedConfig = makeConfig('test-agent');
      registry.update('test-agent', updatedConfig);

      const updated = registry.get('test-agent');
      expect(updated?.status).toBe('active');
      expect(updated?.lastError).toBeUndefined();
    });
  });

  describe('remove', () => {
    it('removes an existing agent', () => {
      registry.register('test-agent', makeConfig('test-agent'));
      const result = registry.remove('test-agent');

      expect(result).toBe(true);
      expect(registry.has('test-agent')).toBe(false);
      expect(registry.size).toBe(0);
    });

    it('returns false when removing non-existent agent', () => {
      const result = registry.remove('nonexistent');
      expect(result).toBe(false);
    });
  });

  describe('get', () => {
    it('returns agent data for existing agent', () => {
      registry.register('test-agent', makeConfig('test-agent'));
      const agent = registry.get('test-agent');

      expect(agent).toBeDefined();
      expect(agent?.config.name).toBe('test-agent');
    });

    it('returns undefined for non-existent agent', () => {
      const agent = registry.get('nonexistent');
      expect(agent).toBeUndefined();
    });
  });

  describe('getAll', () => {
    it('returns empty map when no agents registered', () => {
      const all = registry.getAll();
      expect(all.size).toBe(0);
    });

    it('returns all registered agents', () => {
      registry.register('agent-a', makeConfig('agent-a'));
      registry.register('agent-b', makeConfig('agent-b'));

      const all = registry.getAll();
      expect(all.size).toBe(2);
      expect(all.has('agent-a')).toBe(true);
      expect(all.has('agent-b')).toBe(true);
    });

    it('returns a copy (modifying does not affect registry)', () => {
      registry.register('test-agent', makeConfig('test-agent'));
      const all = registry.getAll();
      all.delete('test-agent');

      expect(registry.has('test-agent')).toBe(true);
    });
  });
});
