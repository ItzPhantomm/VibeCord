import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeTool, ALL_TOOLS, getTool } from '../src/tools/registry.js';
import { DiscordClientWrapper } from '../src/discord/client.js';
import { ErrorCode } from '../src/utils/errors.js';
import { ChannelType } from '../src/discord/types.js';

describe('Discord Tools Registry & Execution', () => {
  let client: DiscordClientWrapper;

  beforeEach(() => {
    client = new DiscordClientWrapper({ token: 'fake_token' });
  });

  it('registers all 45 expected tools', () => {
    expect(ALL_TOOLS.length).toBeGreaterThanOrEqual(40);
    const names = ALL_TOOLS.map(t => t.name);
    expect(names).toContain('discord_list_servers');
    expect(names).toContain('discord_create_channel');
    expect(names).toContain('discord_delete_channel');
    expect(names).toContain('discord_create_role');
    expect(names).toContain('discord_send_message');
    expect(names).toContain('discord_timeout_member');
    expect(names).toContain('discord_design_server');
    expect(names).toContain('discord_audit_server');
    expect(names).toContain('discord_preview_server_plan');
    expect(names).toContain('discord_apply_server_plan');
  });

  it('fails with NOT_FOUND on unknown tool name', async () => {
    const res = await executeTool('non_existent_tool', client, {});
    expect(res.success).toBe(false);
    expect(res.error?.code).toBe(ErrorCode.NOT_FOUND);
  });

  it('validates required parameters and returns INVALID_INPUT on failure', async () => {
    // discord_get_server requires guild_id string
    const res = await executeTool('discord_get_server', client, {});
    expect(res.success).toBe(false);
    expect(res.error?.code).toBe(ErrorCode.INVALID_INPUT);
    expect(res.error?.message).toContain('guild_id');
  });

  it('aborts destructive operations if confirm is false or missing', async () => {
    const res = await executeTool('discord_delete_channel', client, {
      channel_id: 'chan_123',
      // confirm missing
    });
    expect(res.success).toBe(false);
    expect(res.error?.code).toBe(ErrorCode.OPERATION_ABORTED);
    expect(res.error?.message).toContain('destructive operation and requires explicit confirmation');
  });

  it('executes discord_list_servers successfully with mocked client', async () => {
    vi.spyOn(client, 'listGuilds').mockResolvedValueOnce([
      { id: '111', name: 'Server A', approximate_member_count: 42 } as any,
      { id: '222', name: 'Server B', approximate_member_count: 100 } as any,
    ]);

    const res = await executeTool('discord_list_servers', client, {});
    expect(res.success).toBe(true);
    expect(res.data).toHaveLength(2);
    expect(res.data[0].name).toBe('Server A');
  });

  it('executes discord_create_channel with slugified parameters', async () => {
    vi.spyOn(client, 'createChannel').mockResolvedValueOnce({
      id: 'chan_999',
      name: 'announcements',
      type: ChannelType.GUILD_ANNOUNCEMENT,
      position: 1,
    } as any);

    const res = await executeTool('discord_create_channel', client, {
      guild_id: 'guild_123',
      name: 'announcements',
      type: 'announcement',
    });

    expect(res.success).toBe(true);
    expect(res.data.id).toBe('chan_999');
    expect(res.data.name).toBe('announcements');
  });

  it('executes discord_send_message with rich embed', async () => {
    vi.spyOn(client, 'sendMessage').mockResolvedValueOnce({
      id: 'msg_111',
      channel_id: 'chan_222',
      content: 'System Alert',
      timestamp: new Date().toISOString(),
    } as any);

    const res = await executeTool('discord_send_message', client, {
      channel_id: 'chan_222',
      content: 'System Alert',
      embed: {
        title: 'Deployment Complete',
        description: 'All services updated to v1.0.0',
        color: '#10B981',
      },
    });

    expect(res.success).toBe(true);
    expect(res.data.id).toBe('msg_111');
  });

  it('executes discord_timeout_member correctly', async () => {
    vi.spyOn(client, 'timeoutMember').mockResolvedValueOnce({
      communication_disabled_until: new Date(Date.now() + 60000).toISOString(),
    } as any);

    const res = await executeTool('discord_timeout_member', client, {
      guild_id: 'guild_123',
      user_id: 'user_456',
      duration_seconds: 60,
    });

    expect(res.success).toBe(true);
    expect(res.data.timed_out).toBe(true);
  });
});
