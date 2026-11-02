import { z } from 'zod';
import type { ToolDefinition, ToolCategory, ToolContext, ToolExecutionResult } from './types.js';
import { serverTools } from './server/index.js';
import { channelTools } from './channels/index.js';
import { roleTools } from './roles/index.js';
import { messageTools } from './messages/index.js';
import { threadTools } from './threads/index.js';
import { webhookTools } from './webhooks/index.js';
import { moderationTools } from './moderation/index.js';
import { operationsTools } from './operations/index.js';
import type { DiscordClientWrapper } from '../discord/client.js';
import { classifyError, DiscordBridgeError, ErrorCode } from '../utils/errors.js';

export * from './types.js';

export const ALL_TOOLS: ToolDefinition[] = [
  ...serverTools,
  ...channelTools,
  ...roleTools,
  ...messageTools,
  ...threadTools,
  ...webhookTools,
  ...moderationTools,
  ...operationsTools,
];

const toolsMap = new Map<string, ToolDefinition>();
for (const tool of ALL_TOOLS) {
  toolsMap.set(tool.name, tool);
}

export function getAllTools(): ToolDefinition[] {
  return ALL_TOOLS;
}

export function getTool(name: string): ToolDefinition | undefined {
  return toolsMap.get(name);
}

export function getToolsByCategory(category: ToolCategory): ToolDefinition[] {
  return ALL_TOOLS.filter(t => t.category === category);
}

/**
 * Executes a tool with input validation, error handling, and performance timing.
 */
export async function executeTool(
  name: string,
  client: DiscordClientWrapper,
  rawParams: unknown = {},
  context?: ToolContext
): Promise<ToolExecutionResult> {
  const startTime = Date.now();
  const tool = getTool(name);

  if (!tool) {
    return {
      success: false,
      error: {
        code: ErrorCode.NOT_FOUND,
        message: `Unknown Discord bridge tool: "${name}"`,
      },
      metadata: {
        executionTimeMs: Date.now() - startTime,
        toolName: name,
      },
    };
  }

  // Pre-fill default guild if parameter is omitted and context has defaultGuildId
  const paramsObj = (rawParams && typeof rawParams === 'object') ? { ...(rawParams as Record<string, any>) } : {};
  if (!paramsObj.guild_id && context?.defaultGuildId) {
    paramsObj.guild_id = context.defaultGuildId;
  }

  // Destructive check
  if (tool.isDestructive && tool.parameters.shape?.confirm && paramsObj.confirm !== true) {
    return {
      success: false,
      error: {
        code: ErrorCode.OPERATION_ABORTED,
        message: `Tool "${name}" is a destructive operation and requires explicit confirmation. Please set "confirm: true" to proceed.`,
      },
      metadata: {
        executionTimeMs: Date.now() - startTime,
        toolName: name,
      },
    };
  }

  // Validate parameters with Zod
  const parseResult = tool.parameters.safeParse(paramsObj);
  if (!parseResult.success) {
    const issues = parseResult.error.issues.map((i: any) => `${i.path.join('.')}: ${i.message}`).join('; ');
    return {
      success: false,
      error: {
        code: ErrorCode.INVALID_INPUT,
        message: `Parameter validation failed for "${name}": ${issues}`,
        details: parseResult.error.format(),
      },
      metadata: {
        executionTimeMs: Date.now() - startTime,
        toolName: name,
      },
    };
  }

  try {
    const data = await tool.execute(client, parseResult.data, context);
    return {
      success: true,
      data,
      metadata: {
        executionTimeMs: Date.now() - startTime,
        toolName: name,
      },
    };
  } catch (err: unknown) {
    const bridgeErr = classifyError(err);
    return {
      success: false,
      error: {
        code: bridgeErr.code,
        message: bridgeErr.message,
        statusCode: bridgeErr.statusCode,
        retryAfterMs: bridgeErr.retryAfterMs,
        details: bridgeErr.details,
      },
      metadata: {
        executionTimeMs: Date.now() - startTime,
        toolName: name,
      },
    };
  }
}

/**
 * Converts a Zod Schema to standard JSON Schema (Draft 7 / OpenAPI) for MCP.
 * Fully compatible with both Zod v3 and Zod v4.
 */
export function zodToJsonSchema(schema: z.ZodTypeAny): Record<string, any> {
  if (!schema) return { type: 'object' };

  let current: any = schema;
  let description: string | undefined = current.description;
  let defaultValue: any = undefined;

  // Unwrap wrappers: optional, default, nullable
  while (current) {
    if (current.description && !description) {
      description = current.description;
    }

    const t = (current._def?.type || current._def?.typeName || '').replace(/^Zod/, '').toLowerCase();
    if (t === 'optional') {
      current = current._def.innerType;
    } else if (t === 'default') {
      defaultValue = typeof current._def.defaultValue === 'function' ? current._def.defaultValue() : current._def.defaultValue;
      current = current._def.innerType;
    } else if (t === 'nullable') {
      current = current._def.innerType;
    } else {
      break;
    }
  }

  const rawType = (current._def?.type || current._def?.typeName || current.constructor?.name || '').replace(/^Zod/, '').toLowerCase();

  let jsonSchema: Record<string, any> = {};

  switch (rawType) {
    case 'string':
      jsonSchema.type = 'string';
      break;
    case 'number':
      jsonSchema.type = current._def?.checks?.some((c: any) => c.kind === 'int' || c.kind === 'integer') ? 'integer' : 'number';
      break;
    case 'boolean':
      jsonSchema.type = 'boolean';
      break;
    case 'enum':
      jsonSchema.type = 'string';
      jsonSchema.enum = current._def.values || (current._def.entries ? Object.keys(current._def.entries) : undefined);
      break;
    case 'array':
      jsonSchema.type = 'array';
      jsonSchema.items = zodToJsonSchema(current._def.type || current._def.element);
      break;
    case 'object': {
      jsonSchema.type = 'object';
      const shape = typeof current._def.shape === 'function' ? current._def.shape() : (current._def.shape || current.shape || {});
      const properties: Record<string, any> = {};
      const required: string[] = [];

      for (const [key, propSchema] of Object.entries(shape)) {
        properties[key] = zodToJsonSchema(propSchema as z.ZodTypeAny);

        let inner: any = propSchema;
        let isOptional = false;
        while (inner) {
          const it = (inner._def?.type || inner._def?.typeName || '').replace(/^Zod/, '').toLowerCase();
          if (it === 'optional' || it === 'default') {
            isOptional = true;
            break;
          }
          if (inner._def?.innerType) {
            inner = inner._def.innerType;
          } else {
            break;
          }
        }
        if (!isOptional) {
          required.push(key);
        }
      }

      jsonSchema.properties = properties;
      if (required.length > 0) {
        jsonSchema.required = required;
      }
      break;
    }
    case 'record':
      jsonSchema.type = 'object';
      break;
    default:
      jsonSchema.type = 'string';
  }

  if (description) {
    jsonSchema.description = description;
  }
  if (defaultValue !== undefined) {
    jsonSchema.default = defaultValue;
  }

  return jsonSchema;
}
