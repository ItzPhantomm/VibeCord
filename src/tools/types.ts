import type { z } from 'zod';
import type { DiscordClientWrapper } from '../discord/client.js';

export type ToolCategory =
  | 'server'
  | 'channels'
  | 'roles'
  | 'messages'
  | 'threads'
  | 'webhooks'
  | 'moderation'
  | 'operations';

export interface ToolContext {
  defaultGuildId?: string;
  confirmDestructive?: boolean;
}

export interface ToolExecutionResult<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    statusCode?: number;
    retryAfterMs?: number;
    details?: any;
  };
  metadata?: {
    executionTimeMs: number;
    toolName: string;
  };
}

export interface ToolDefinition<TSchema extends z.ZodTypeAny = any, TResult = any> {
  name: string;
  description: string;
  category: ToolCategory;
  parameters: TSchema;
  requiredPermissions: string[];
  isDestructive: boolean;
  execute: (
    client: DiscordClientWrapper,
    params: z.infer<TSchema>,
    context?: ToolContext
  ) => Promise<TResult>;
}
