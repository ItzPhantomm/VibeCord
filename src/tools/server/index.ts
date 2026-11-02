import { z } from 'zod';
import type { ToolDefinition } from '../types.js';

export const listServersTool: ToolDefinition = {
  name: 'discord_list_servers',
  description: 'List all Discord servers (guilds) the bot currently has access to, including IDs, names, and member counts.',
  category: 'server',
  parameters: z.object({}),
  requiredPermissions: [],
  isDestructive: false,
  execute: async (client) => {
    const guilds = await client.listGuilds();
    return guilds.map(g => ({
      id: g.id,
      name: g.name,
      icon: g.icon,
      owner: g.owner_id,
      approximate_member_count: g.approximate_member_count,
    }));
  },
};

export const getServerTool: ToolDefinition = {
  name: 'discord_get_server',
  description: 'Retrieve detailed configuration and statistics for a specific Discord server.',
  category: 'server',
  parameters: z.object({
    guild_id: z.string().describe('The Discord server ID (guild ID)'),
  }),
  requiredPermissions: [],
  isDestructive: false,
  execute: async (client, { guild_id }) => {
    const guild = await client.getGuild(guild_id);
    const channels = await client.listGuildChannels(guild_id);
    const roles = await client.listGuildRoles(guild_id);

    return {
      id: guild.id,
      name: guild.name,
      description: guild.description,
      owner_id: guild.owner_id,
      approximate_member_count: guild.approximate_member_count,
      approximate_presence_count: guild.approximate_presence_count,
      verification_level: guild.verification_level,
      features: guild.features,
      system_channel_id: guild.system_channel_id,
      rules_channel_id: guild.rules_channel_id,
      afk_channel_id: guild.afk_channel_id,
      afk_timeout: guild.afk_timeout,
      channels_count: channels.length,
      roles_count: roles.length,
    };
  },
};

export const modifyServerTool: ToolDefinition = {
  name: 'discord_modify_server',
  description: 'Modify settings of a Discord server such as name, description, verification level, or system channel.',
  category: 'server',
  parameters: z.object({
    guild_id: z.string().describe('The Discord server ID'),
    name: z.string().min(2).max(100).optional().describe('New server name'),
    description: z.string().max(120).optional().describe('Server description'),
    verification_level: z.number().int().min(0).max(4).optional().describe('Verification level: 0=None, 1=Low, 2=Medium, 3=High, 4=Very High'),
    system_channel_id: z.string().optional().describe('Channel ID where system messages are sent'),
    afk_channel_id: z.string().optional().describe('Voice channel ID for AFK members'),
    afk_timeout: z.number().int().optional().describe('AFK timeout in seconds (60, 300, 900, 1800, 3600)'),
    reason: z.string().optional().describe('Reason for audit log'),
  }),
  requiredPermissions: ['MANAGE_GUILD'],
  isDestructive: false,
  execute: async (client, { guild_id, reason, ...data }) => {
    return await client.modifyGuild(guild_id, data, reason);
  },
};

export const serverTools = [listServersTool, getServerTool, modifyServerTool];
