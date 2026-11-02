import { z } from 'zod';

export const ConfigSchema = z.object({
  token: z.string().default(''),
  applicationId: z.string().optional(),
  defaultGuildId: z.string().optional(),
  readOnly: z.boolean().default(false),
  logLevel: z.enum(['debug', 'info', 'warn', 'error', 'silent']).default('info'),
  harnesses: z.record(z.string(), z.object({
    enabled: z.boolean().default(true),
    installedAt: z.string().optional(),
    configPath: z.string().optional(),
  })).default({}),
  rateLimitMaxRetries: z.number().int().min(0).max(10).default(3),
  rateLimitBaseDelayMs: z.number().int().min(100).max(10000).default(1000),
});

export type DiscordBridgeConfig = z.infer<typeof ConfigSchema>;

export interface PartialConfig {
  token?: string;
  applicationId?: string;
  defaultGuildId?: string;
  readOnly?: boolean;
  logLevel?: 'debug' | 'info' | 'warn' | 'error' | 'silent';
  harnesses?: Record<string, { enabled: boolean; installedAt?: string; configPath?: string }>;
  rateLimitMaxRetries?: number;
  rateLimitBaseDelayMs?: number;
}
