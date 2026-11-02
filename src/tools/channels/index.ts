import { z } from 'zod';
import type { ToolDefinition } from '../types.js';
import { ChannelType } from '../../discord/types.js';
import { DiscordBridgeError, ErrorCode } from '../../utils/errors.js';

export const listChannelsTool: ToolDefinition = {
  name: 'discord_list_channels',
  description: 'List all channels in a Discord server, optionally grouped by parent category.',
  category: 'channels',
  parameters: z.object({
    guild_id: z.string().describe('The Discord server ID'),
    group_by_category: z.boolean().default(true).describe('Whether to organize output under parent categories'),
  }),
  requiredPermissions: ['VIEW_CHANNEL'],
  isDestructive: false,
  execute: async (client, { guild_id, group_by_category }) => {
    const rawChannels = await client.listGuildChannels(guild_id);

    // Sort channels by position
    const sorted = [...rawChannels].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

    if (!group_by_category) {
      return sorted.map(c => ({
        id: c.id,
        name: c.name,
        type: ChannelType[c.type] || c.type,
        parent_id: c.parent_id,
        position: c.position,
        topic: c.topic,
        rate_limit_per_user: c.rate_limit_per_user,
      }));
    }

    const categories = sorted.filter(c => c.type === ChannelType.GUILD_CATEGORY);
    const nonCategories = sorted.filter(c => c.type !== ChannelType.GUILD_CATEGORY);

    const resultCategories = categories.map(cat => ({
      id: cat.id,
      name: cat.name,
      position: cat.position,
      channels: nonCategories
        .filter(c => c.parent_id === cat.id)
        .map(c => ({
          id: c.id,
          name: c.name,
          type: ChannelType[c.type] || c.type,
          position: c.position,
          topic: c.topic,
          slowmode: c.rate_limit_per_user,
        })),
    }));

    const uncategorized = nonCategories
      .filter(c => !c.parent_id)
      .map(c => ({
        id: c.id,
        name: c.name,
        type: ChannelType[c.type] || c.type,
        position: c.position,
        topic: c.topic,
        slowmode: c.rate_limit_per_user,
      }));

    return {
      categories: resultCategories,
      uncategorized,
      total_channels: sorted.length,
    };
  },
};

export const getChannelTool: ToolDefinition = {
  name: 'discord_get_channel',
  description: 'Retrieve detailed properties of a specific channel, including permissions, slowmode, and topic.',
  category: 'channels',
  parameters: z.object({
    channel_id: z.string().describe('The Discord channel ID'),
  }),
  requiredPermissions: ['VIEW_CHANNEL'],
  isDestructive: false,
  execute: async (client, { channel_id }) => {
    const c = await client.getChannel(channel_id);
    return {
      id: c.id,
      name: c.name,
      type: ChannelType[c.type] || c.type,
      guild_id: c.guild_id,
      parent_id: c.parent_id,
      position: c.position,
      topic: c.topic,
      nsfw: c.nsfw,
      bitrate: c.bitrate,
      user_limit: c.user_limit,
      rate_limit_per_user: c.rate_limit_per_user,
      permission_overwrites_count: c.permission_overwrites?.length ?? 0,
      permission_overwrites: c.permission_overwrites,
    };
  },
};

export const createChannelTool: ToolDefinition = {
  name: 'discord_create_channel',
  description: 'Create a new text, voice, announcement, forum, stage, or category channel.',
  category: 'channels',
  parameters: z.object({
    guild_id: z.string().describe('The Discord server ID'),
    name: z.string().min(1).max(100).describe('Channel name (will be slugified by Discord for text channels)'),
    type: z.enum(['text', 'voice', 'category', 'announcement', 'forum', 'stage']).default('text').describe('Channel type'),
    parent_id: z.string().optional().describe('Parent category ID to place the channel under'),
    topic: z.string().max(1024).optional().describe('Channel topic / description'),
    nsfw: z.boolean().optional().describe('Whether channel is Age-Restricted (NSFW)'),
    rate_limit_per_user: z.number().int().min(0).max(21600).optional().describe('Slowmode in seconds (0 = off, max 21600s/6hrs)'),
    bitrate: z.number().int().min(8000).max(384000).optional().describe('Bitrate in bits (for voice channels)'),
    user_limit: z.number().int().min(0).max(99).optional().describe('Max users (for voice channels, 0 = unlimited)'),
    reason: z.string().optional().describe('Reason for audit log'),
  }),
  requiredPermissions: ['MANAGE_CHANNELS'],
  isDestructive: false,
  execute: async (client, { guild_id, type, reason, ...rest }) => {
    const typeMap: Record<string, number> = {
      text: ChannelType.GUILD_TEXT,
      voice: ChannelType.GUILD_VOICE,
      category: ChannelType.GUILD_CATEGORY,
      announcement: ChannelType.GUILD_ANNOUNCEMENT,
      forum: ChannelType.GUILD_FORUM,
      stage: ChannelType.GUILD_STAGE_VOICE,
    };

    const channelType = typeMap[type] ?? ChannelType.GUILD_TEXT;
    const channel = await client.createChannel(guild_id, {
      ...rest,
      type: channelType,
    }, reason);

    return {
      id: channel.id,
      name: channel.name,
      type: ChannelType[channel.type] || channel.type,
      parent_id: channel.parent_id,
      position: channel.position,
    };
  },
};

export const modifyChannelTool: ToolDefinition = {
  name: 'discord_modify_channel',
  description: 'Update properties of an existing channel (name, topic, slowmode, category parent, etc.).',
  category: 'channels',
  parameters: z.object({
    channel_id: z.string().describe('The channel ID to modify'),
    name: z.string().min(1).max(100).optional().describe('New channel name'),
    topic: z.string().max(1024).optional().describe('New channel topic'),
    nsfw: z.boolean().optional().describe('Whether channel is Age-Restricted'),
    rate_limit_per_user: z.number().int().min(0).max(21600).optional().describe('Slowmode duration in seconds'),
    parent_id: z.string().nullable().optional().describe('Move to parent category ID, or null to detach'),
    position: z.number().int().optional().describe('Channel position in list'),
    reason: z.string().optional().describe('Reason for audit log'),
  }),
  requiredPermissions: ['MANAGE_CHANNELS'],
  isDestructive: false,
  execute: async (client, { channel_id, reason, ...data }) => {
    const updated = await client.modifyChannel(channel_id, data, reason);
    return {
      id: updated.id,
      name: updated.name,
      type: ChannelType[updated.type] || updated.type,
      topic: updated.topic,
      parent_id: updated.parent_id,
      rate_limit_per_user: updated.rate_limit_per_user,
    };
  },
};

export const deleteChannelTool: ToolDefinition = {
  name: 'discord_delete_channel',
  description: 'Permanently delete a channel or category. Requires confirmation.',
  category: 'channels',
  parameters: z.object({
    channel_id: z.string().describe('The channel ID to delete'),
    confirm: z.boolean().describe('Safety confirmation. Must be explicitly set to true to proceed with deletion.'),
    reason: z.string().optional().describe('Reason for audit log'),
  }),
  requiredPermissions: ['MANAGE_CHANNELS'],
  isDestructive: true,
  execute: async (client, { channel_id, confirm, reason }) => {
    if (!confirm) {
      throw new DiscordBridgeError(
        'Deletion aborted: "confirm" must be set to true to permanently delete a channel.',
        ErrorCode.OPERATION_ABORTED
      );
    }
    const deleted = await client.deleteChannel(channel_id, reason);
    return {
      deleted: true,
      id: deleted.id,
      name: deleted.name,
    };
  },
};

export const channelTools = [
  listChannelsTool,
  getChannelTool,
  createChannelTool,
  modifyChannelTool,
  deleteChannelTool,
];
