import { z } from 'zod';
import type { ToolDefinition } from '../types.js';

export const createThreadTool: ToolDefinition = {
  name: 'discord_create_thread',
  description: 'Create a new public or private thread, either attached to a message or standalone.',
  category: 'threads',
  parameters: z.object({
    channel_id: z.string().describe('The channel ID where the thread will be created'),
    name: z.string().min(1).max(100).describe('Thread title / name'),
    auto_archive_duration: z.enum(['60', '1440', '4320', '10080']).default('1440').describe('Duration in minutes before automatic archiving (60, 1440=1d, 4320=3d, 10080=7d)'),
    message_id: z.string().optional().describe('Optional message ID to start a thread directly on that message'),
    type: z.enum(['public', 'private']).default('public').describe('Public thread (11) or private thread (12)'),
    reason: z.string().optional().describe('Reason for audit log'),
  }),
  requiredPermissions: ['CREATE_PUBLIC_THREADS', 'SEND_MESSAGES_IN_THREADS'],
  isDestructive: false,
  execute: async (client, { channel_id, name, auto_archive_duration, message_id, type, reason }) => {
    const thread = await client.createThread(channel_id, {
      name,
      auto_archive_duration: parseInt(auto_archive_duration, 10),
      type: type === 'private' ? 12 : 11,
      message_id,
      reason,
    });

    return {
      id: thread.id,
      name: thread.name,
      parent_id: thread.parent_id,
    };
  },
};

export const listThreadsTool: ToolDefinition = {
  name: 'discord_list_threads',
  description: 'List active threads in a Discord server.',
  category: 'threads',
  parameters: z.object({
    guild_id: z.string().describe('The Discord server ID'),
  }),
  requiredPermissions: ['READ_MESSAGE_HISTORY'],
  isDestructive: false,
  execute: async (client, { guild_id }) => {
    const result = await client.listActiveThreads(guild_id);
    return (result.threads || []).map(t => ({
      id: t.id,
      name: t.name,
      parent_id: t.parent_id,
      rate_limit_per_user: t.rate_limit_per_user,
    }));
  },
};

export const createForumPostTool: ToolDefinition = {
  name: 'discord_create_forum_post',
  description: 'Create a new forum post/thread with a title and starter message inside a Forum channel.',
  category: 'threads',
  parameters: z.object({
    channel_id: z.string().describe('The Forum channel ID'),
    title: z.string().min(1).max(100).describe('Forum post title'),
    content: z.string().min(1).max(4000).describe('Initial post content'),
    auto_archive_duration: z.enum(['60', '1440', '4320', '10080']).default('1440').describe('Auto archive duration in minutes'),
    reason: z.string().optional().describe('Reason for audit log'),
  }),
  requiredPermissions: ['CREATE_PUBLIC_THREADS', 'SEND_MESSAGES'],
  isDestructive: false,
  execute: async (client, { channel_id, title, content, auto_archive_duration, reason }) => {
    // In Discord API, creating a forum thread takes a message object inside the thread payload
    const thread = await client.createThread(channel_id, {
      name: title,
      auto_archive_duration: parseInt(auto_archive_duration, 10),
      reason,
      ...({ message: { content } } as any),
    });

    return {
      id: thread.id,
      title: thread.name,
      channel_id: thread.parent_id,
    };
  },
};

export const threadTools = [createThreadTool, listThreadsTool, createForumPostTool];
