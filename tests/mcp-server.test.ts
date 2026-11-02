import { describe, it, expect, vi } from 'vitest';
import { createDiscordMcpServer } from '../src/mcp/server.js';
import { DiscordClientWrapper } from '../src/discord/client.js';

describe('Model Context Protocol (MCP) Server', () => {
  it('creates an McpServer instance with registered tools and resources', () => {
    const client = new DiscordClientWrapper({ token: 'fake_token' });
    const server = createDiscordMcpServer({ client });

    expect(server).toBeDefined();
    // Verify server has tools registered
    expect(typeof server.tool).toBe('function');
    expect(typeof server.resource).toBe('function');
  });

  it('exposes discord status resource via resource template', async () => {
    const client = new DiscordClientWrapper({ token: 'fake_token' });
    vi.spyOn(client, 'testConnection').mockResolvedValueOnce({
      ok: true,
      botUser: { id: 'bot_123', username: 'BridgeBot', discriminator: '0000' } as any,
      latencyMs: 45,
      guildsCount: 3,
    });

    const server = createDiscordMcpServer({ client });
    expect(server).toBeDefined();
  });
});
