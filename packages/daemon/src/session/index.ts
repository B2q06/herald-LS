export type { PersonaContext } from './persona-loader.ts';
export { loadPersonaContext } from './persona-loader.ts';
export type { PostRunContext, RunResult } from './run-executor.ts';
export { executeRun, generateRunId } from './run-executor.ts';
export type {
  AgentSdkOptions,
  SdkAdapter,
  SendMessageParams,
  SendMessageResult,
} from './sdk-adapter.ts';
export { AgentSdkAdapter, NullAdapter } from './sdk-adapter.ts';
export type { SessionState } from './session-manager.ts';
export { SessionManager } from './session-manager.ts';

import type { SdkAdapter } from './sdk-adapter.ts';
import { SessionManager } from './session-manager.ts';

export function initSessionManager(sdkAdapter: SdkAdapter): SessionManager {
  return new SessionManager(sdkAdapter);
}
