import cron from 'node-cron';

export interface ScheduledAgent {
  agentName: string;
  cronExpression: string;
  task: cron.ScheduledTask;
}

export class ScheduleRegistry {
  private schedules = new Map<string, ScheduledAgent>();

  register(name: string, cronExpr: string, callback: () => void): void {
    if (!cron.validate(cronExpr)) {
      console.warn(`[herald] Invalid cron expression for ${name}: "${cronExpr}" — skipping`);
      return;
    }

    const task = cron.schedule(cronExpr, callback);
    this.schedules.set(name, {
      agentName: name,
      cronExpression: cronExpr,
      task,
    });
  }

  update(name: string, cronExpr: string, callback: () => void): void {
    this.remove(name);
    this.register(name, cronExpr, callback);
  }

  remove(name: string): void {
    const entry = this.schedules.get(name);
    if (entry) {
      entry.task.stop();
      this.schedules.delete(name);
    }
  }

  getAll(): Array<{ agentName: string; cronExpression: string }> {
    return Array.from(this.schedules.values()).map((s) => ({
      agentName: s.agentName,
      cronExpression: s.cronExpression,
    }));
  }

  stop(): void {
    for (const entry of this.schedules.values()) {
      entry.task.stop();
    }
    this.schedules.clear();
  }
}
