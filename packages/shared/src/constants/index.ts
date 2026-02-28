export const EVENT_TYPES = {
  AGENT_STATUS: 'agent_status',
  TODO_CHANGE: 'todo_change',
  RUN_STARTED: 'run_started',
  RUN_COMPLETED: 'run_completed',
  RUN_FAILED: 'run_failed',
} as const;

export const RUN_STATUS = {
  PENDING: 'pending',
  RUNNING: 'running',
  SUCCESS: 'success',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
} as const;

export const DEFAULT_PORT = 3117;
export const MAX_SESSION_INTERACTIONS = 10;
