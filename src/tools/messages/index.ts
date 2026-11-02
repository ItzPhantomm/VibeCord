import { z } from 'zod';
import type { ToolDefinition } from '../types.js';

export const EmbedSchema = z.object({
  title: z.string().max(256).optional(),
  description: z.string().max(4096).optional(),
  color: z.string().optional().describe('Hex color code (e.g. "#10B981" or "10B981") or numeric color'),
  url: z.string().url().optional(),
  timestamp: z.string().optional(),
  footer: z.object({
    text: z.string().max(2048),
    icon_url: z.string().url().optional(),
  }).optional(),
  author: z.object({
    name: z.string().max(256),
    url: z.string().url().optional(),
    icon_url: z.string().url().optional(),
  }).optional(),
  fields: z.array(z.object({
    name: z.string().max(256),
    value: z.string().max(1024),
    inline: z.boolean().optional(),
  })).max(25).optional(),
});

export const sendMessageTool: ToolDefinition = {
  name: 'discord_send_message',
  description: 'Send a message to a Discord channel, optionally including rich embeds, replies, and link buttons.',
  category: 'messages',
  parameters: z.object({
    channel_id: z.string().describe('The destination channel ID'),
    content: z.string().max(2000).optional().describe('The plain text message content'),
    embed: EmbedSchema.optional().describe('Rich embed object'),
    reply_to_message_id: z.string().optional().describe('Message ID to reply to'),
    buttons: z.array(z.object({
      label: z.string().max(80),
      url: z.string().url(),
      emoji: z.string().optional(),
    })).max(5).optional().describe('Interactive link buttons (type 5) attached to message'),
  }),
  requiredPermissions: ['SEND_MESSAGES'],
  isDestructive: false,
  execute: async (client, { channel_id, content, embed, reply_to_message_id, buttons }) => {
    let embedsPayload: any[] | undefined;
    if (embed) {
      let colorInt: number | undefined;
      if (embed.color) {
        colorInt = parseInt(embed.color.replace('#', ''), 16) || 0;
      }
      embedsPayload = [{
        ...embed,
        color: colorInt,
      }];
    }

    let componentsPayload: any[] | undefined;
    if (buttons && buttons.length > 0) {
      componentsPayload = [{
        type: 1, // Action Row
        components: buttons.map((b: any) => ({
          type: 2, // Button
          style: 5, // Link button
          label: b.label,
          url: b.url,
          emoji: b.emoji ? { name: b.emoji } : undefined,
        })),
      }];
    }

    const payload: Record<string, any> = {};
    if (content) payload.content = content;
    if (embedsPayload) payload.embeds = embedsPayload;
    if (componentsPayload) payload.components = componentsPayload;
    if (reply_to_message_id) {
      payload.message_reference = { message_id: reply_to_message_id };
    }

    const message = await client.sendMessage(channel_id, payload);
    return {
      id: message.id,
      channel_id: message.channel_id,
      content: message.content,
      timestamp: message.timestamp,
    };
  },
};

export const getMessageTool: ToolDefinition = {
  name: 'discord_get_message',
  description: 'Retrieve a specific message by its channel ID and message ID.',
  category: 'messages',
  parameters: z.object({
    channel_id: z.string().describe('The channel ID'),
    message_id: z.string().describe('The message ID'),
  }),
  requiredPermissions: ['READ_MESSAGE_HISTORY'],
  isDestructive: false,
  execute: async (client, { channel_id, message_id }) => {
    const msg = await client.getMessage(channel_id, message_id);
    return {
      id: msg.id,
      channel_id: msg.channel_id,
      author: {
        id: msg.author.id,
        username: msg.author.username,
        bot: msg.author.bot,
      },
      content: msg.content,
      timestamp: msg.timestamp,
      pinned: msg.pinned,
      embeds_count: msg.embeds?.length ?? 0,
      attachments_count: msg.attachments?.length ?? 0,
    };
  },
};

export const listMessagesTool: ToolDefinition = {
  name: 'discord_list_messages',
  description: 'Read recent messages from a channel with pagination support.',
  category: 'messages',
  parameters: z.object({
    channel_id: z.string().describe('The channel ID'),
    limit: z.number().int().min(1).max(100).default(50).describe('Max messages to return (1-100)'),
    before: z.string().optional().describe('Get messages before this message ID'),
    after: z.string().optional().describe('Get messages after this message ID'),
  }),
  requiredPermissions: ['READ_MESSAGE_HISTORY'],
  isDestructive: false,
  execute: async (client, { channel_id, limit, before, after }) => {
    const msgs = await client.listMessages(channel_id, { limit, before, after });
    return msgs.map(m => ({
      id: m.id,
      author: `${m.author.username}${m.author.bot ? ' [BOT]' : ''}`,
      author_id: m.author.id,
      content: m.content,
      timestamp: m.timestamp,
      pinned: m.pinned,
      has_attachments: (m.attachments?.length ?? 0) > 0,
    }));
  },
};

export const editMessageTool: ToolDefinition = {
  name: 'discord_edit_message',
  description: 'Edit a message previously sent by the bot in a channel.',
  category: 'messages',
  parameters: z.object({
    channel_id: z.string().describe('The channel ID'),
    message_id: z.string().describe('The message ID to edit'),
    content: z.string().max(2000).optional().describe('Updated text content'),
    embed: EmbedSchema.optional().describe('Updated embed object'),
  }),
  requiredPermissions: ['SEND_MESSAGES'],
  isDestructive: false,
  execute: async (client, { channel_id, message_id, content, embed }) => {
    const payload: Record<string, any> = {};
    if (content !== undefined) payload.content = content;
    if (embed) {
      let colorInt: number | undefined;
      if (embed.color) colorInt = parseInt(embed.color.replace('#', ''), 16) || 0;
      payload.embeds = [{ ...embed, color: colorInt }];
    }

    const updated = await client.editMessage(channel_id, message_id, payload);
    return {
      id: updated.id,
      channel_id: updated.channel_id,
      content: updated.content,
      edited_timestamp: updated.edited_timestamp,
    };
  },
};

export const deleteMessageTool: ToolDefinition = {
  name: 'discord_delete_message',
  description: 'Delete a message from a channel.',
  category: 'messages',
  parameters: z.object({
    channel_id: z.string().describe('The channel ID'),
    message_id: z.string().describe('The message ID to delete'),
    reason: z.string().optional().describe('Reason for audit log'),
  }),
  requiredPermissions: ['MANAGE_MESSAGES'],
  isDestructive: true,
  execute: async (client, { channel_id, message_id, reason }) => {
    await client.deleteMessage(channel_id, message_id, reason);
    return { deleted: true, channel_id, message_id };
  },
};

export const pinMessageTool: ToolDefinition = {
  name: 'discord_pin_message',
  description: 'Pin a message to a channel.',
  category: 'messages',
  parameters: z.object({
    channel_id: z.string().describe('The channel ID'),
    message_id: z.string().describe('The message ID to pin'),
    reason: z.string().optional().describe('Reason for audit log'),
  }),
  requiredPermissions: ['MANAGE_MESSAGES'],
  isDestructive: false,
  execute: async (client, { channel_id, message_id, reason }) => {
    await client.pinMessage(channel_id, message_id, reason);
    return { pinned: true, channel_id, message_id };
  },
};

export const unpinMessageTool: ToolDefinition = {
  name: 'discord_unpin_message',
  description: 'Unpin a message from a channel.',
  category: 'messages',
  parameters: z.object({
    channel_id: z.string().describe('The channel ID'),
    message_id: z.string().describe('The message ID to unpin'),
    reason: z.string().optional().describe('Reason for audit log'),
  }),
  requiredPermissions: ['MANAGE_MESSAGES'],
  isDestructive: false,
  execute: async (client, { channel_id, message_id, reason }) => {
    await client.unpinMessage(channel_id, message_id, reason);
    return { unpinned: true, channel_id, message_id };
  },
};

export const addReactionTool: ToolDefinition = {
  name: 'discord_add_reaction',
  description: 'Add an emoji reaction to a message.',
  category: 'messages',
  parameters: z.object({
    channel_id: z.string().describe('The channel ID'),
    message_id: z.string().describe('The message ID'),
    emoji: z.string().describe('Emoji character (e.g. "👍", "🚀") or custom emoji name:id (e.g. "customEmoji:123456789")'),
  }),
  requiredPermissions: ['ADD_REACTIONS'],
  isDestructive: false,
  execute: async (client, { channel_id, message_id, emoji }) => {
    await client.addReaction(channel_id, message_id, emoji);
    return { reacted: true, channel_id, message_id, emoji };
  },
};

export const removeReactionTool: ToolDefinition = {
  name: 'discord_remove_reaction',
  description: 'Remove an emoji reaction from a message.',
  category: 'messages',
  parameters: z.object({
    channel_id: z.string().describe('The channel ID'),
    message_id: z.string().describe('The message ID'),
    emoji: z.string().describe('Emoji to remove'),
    user_id: z.string().default('@me').describe('User ID whose reaction to remove, or "@me" for bot reaction'),
  }),
  requiredPermissions: ['MANAGE_MESSAGES'],
  isDestructive: false,
  execute: async (client, { channel_id, message_id, emoji, user_id }) => {
    await client.removeReaction(channel_id, message_id, emoji, user_id);
    return { removed: true, channel_id, message_id, emoji, user_id };
  },
};

export const messageTools = [
  sendMessageTool,
  getMessageTool,
  listMessagesTool,
  editMessageTool,
  deleteMessageTool,
  pinMessageTool,
  unpinMessageTool,
  addReactionTool,
  removeReactionTool,
];
