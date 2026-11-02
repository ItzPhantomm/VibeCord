/**
 * VibeCord - MCP (Model Context Protocol) Server
 */

import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ALL_TOOLS, executeTool } from '../tools/registry.js';
import { DiscordClientWrapper } from '../discord/client.js';
import { loadConfig } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { redactToken } from '../config/secrets.js';

export interface CreateMcpServerOptions {
  client?: DiscordClientWrapper;
  defaultGuildId?: string;
  name?: string;
  version?: string;
}

export function createDiscordMcpServer(options: CreateMcpServerOptions = {}): McpServer {
  const server = new McpServer({
    name: options.name || 'vibecord',
    version: options.version || '1.0.0',
  });

  // Client resolution: use provided client or lazy load from config
  let clientInstance = options.client;

  const getClient = (): DiscordClientWrapper => {
    if (!clientInstance) {
      const config = loadConfig({ requireToken: true });
      clientInstance = new DiscordClientWrapper({
        token: config.token,
        readOnly: config.readOnly,
        maxRetries: config.rateLimitMaxRetries,
        baseDelayMs: config.rateLimitBaseDelayMs,
      });
    }
    return clientInstance;
  };

  // Register each universal tool into MCP
  for (const tool of ALL_TOOLS) {
    const shape = (tool.parameters as any).shape || {};

    server.tool(
      tool.name,
      tool.description,
      shape,
      async (args: any) => {
        try {
          const client = getClient();
          const context = {
            defaultGuildId: options.defaultGuildId || process.env.DISCORD_GUILD_ID,
          };

          const result = await executeTool(tool.name, client, args, context);

          if (!result.success) {
            return {
              isError: true,
              content: [
                {
                  type: 'text' as const,
                  text: JSON.stringify(
                    {
                      error: result.error,
                      metadata: result.metadata,
                    },
                    null,
                    2
                  ),
                },
              ],
            };
          }

          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(result.data, null, 2),
              },
            ],
          };
        } catch (err: unknown) {
          return {
            isError: true,
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(
                  {
                    error: {
                      code: 'INTERNAL_ERROR',
                      message: err instanceof Error ? err.message : String(err),
                    },
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }
      }
    );
  }

  // Register Resources
  server.resource(
    'discord-status',
    'discord://status',
    async (uri) => {
      try {
        const client = getClient();
        const testRes = await client.testConnection();
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'application/json',
              text: JSON.stringify({
                status: 'connected',
                botUser: testRes.botUser,
                latencyMs: testRes.latencyMs,
                guildsCount: testRes.guildsCount,
                readOnly: client.readOnly,
              }, null, 2),
            },
          ],
        };
      } catch (err: unknown) {
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'application/json',
              text: JSON.stringify({
                status: 'error',
                error: err instanceof Error ? err.message : String(err),
              }, null, 2),
            },
          ],
        };
      }
    }
  );

  server.resource(
    'discord-servers',
    'discord://servers',
    async (uri) => {
      const client = getClient();
      const guilds = await client.listGuilds();
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify(guilds, null, 2),
          },
        ],
      };
    }
  );

  return server;
}

/**
 * Runs the MCP server communicating over stdio.
 */
export async function startMcpStdioServer(): Promise<void> {
  logger.bridge('Starting VibeCord MCP stdio server...');
  try {
    const config = loadConfig({ requireToken: true });
    logger.info(`Loaded configuration for token ${redactToken(config.token)} (readOnly: ${config.readOnly})`);

    const server = createDiscordMcpServer({
      defaultGuildId: config.defaultGuildId,
    });

    const transport = new StdioServerTransport();
    await server.connect(transport);
    logger.success('Discord Bridge MCP server connected and listening on stdio.');
  } catch (err: unknown) {
    logger.error('Failed to start MCP server:', err);
    process.exit(1);
  }
}
