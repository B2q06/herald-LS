import type { AgentConfig } from '@herald/shared';

export interface RegisteredAgent {
  config: AgentConfig;
  registeredAt: string;
  status: 'active' | 'error';
  lastError?: string;
}

export class AgentRegistry {
  private agents = new Map<string, RegisteredAgent>();

  register(name: string, config: AgentConfig): void {
    this.agents.set(name, {
      config,
      registeredAt: new Date().toISOString(),
      status: 'active',
    });
  }

  update(name: string, config: AgentConfig): boolean {
    const existing = this.agents.get(name);
    if (!existing) {
      return false;
    }
    existing.config = config;
    existing.status = 'active';
    existing.lastError = undefined;
    return true;
  }

  remove(name: string): boolean {
    return this.agents.delete(name);
  }

  get(name: string): RegisteredAgent | undefined {
    return this.agents.get(name);
  }

  getAll(): Map<string, RegisteredAgent> {
    return new Map(this.agents);
  }

  has(name: string): boolean {
    return this.agents.has(name);
  }

  get size(): number {
    return this.agents.size;
  }
}
