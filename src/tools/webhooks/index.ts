import { z } from 'zod';
import type { ToolDefinition } from '../types.js';
import { EmbedSchema } from '../messages/index.js';

export const listWebhooksTool: ToolDefinition = {
  name: 'discord_list_webhooks',
  description: 'List webhooks configured in a channel or an entire server.',
  category: 'webhooks',
  parameters: z.object({
    guild_id: z.string().optional().describe('Discord server ID to list all webhooks in guild'),
    channel_id: z.string().optional().describe('Channel ID to list webhooks for specific channel'),
  }),
  requiredPermissions: ['MANAGE_WEBHOOKS'],
  isDestructive: false,
  execute: async (client, { guild_id, channel_id }) => {
    let hooks: any[] = [];
    if (channel_id) {
      hooks = await client.listChannelWebhooks(channel_id);
    } else if (guild_id) {
      hooks = await client.listGuildWebhooks(guild_id);
    } else {
      throw new Error('Either "guild_id" or "channel_id" must be provided to list webhooks.');
    }

    return hooks.map(h => ({
      id: h.id,
      name: h.name,
      channel_id: h.channel_id,
      url: h.url || (h.token ? `https://discord.com/api/webhooks/${h.id}/${h.token}` : undefined),
    }));
  },
};

export const createWebhookTool: ToolDefinition = {
  name: 'discord_create_webhook',
  description: 'Create a new incoming webhook in a channel.',
  category: 'webhooks',
  parameters: z.object({
    channel_id: z.string().describe('Channel ID where the webhook will post'),
    name: z.string().min(1).max(80).describe('Name of the webhook'),
    avatar: z.string().optional().describe('Optional image data URI or avatar URL'),
    reason: z.string().optional().describe('Reason for audit log'),
  }),
  requiredPermissions: ['MANAGE_WEBHOOKS'],
  isDestructive: false,
  execute: async (client, { channel_id, name, avatar, reason }) => {
    const webhook = await client.createWebhook(channel_id, { name, avatar, reason });
    return {
      id: webhook.id,
      name: webhook.name,
      channel_id: webhook.channel_id,
      url: webhook.url || `https://discord.com/api/webhooks/${webhook.id}/${webhook.token}`,
    };
  },
};

export const executeWebhookTool: ToolDefinition = {
  name: 'discord_execute_webhook',
  description: 'Send a message or embed using a webhook URL or webhook ID + token.',
  category: 'webhooks',
  parameters: z.object({
    webhook_url: z.string().url().optional().describe('Full Discord webhook URL'),
    webhook_id: z.string().optional().describe('Webhook ID (if URL not provided)'),
    webhook_token: z.string().optional().describe('Webhook token (if URL not provided)'),
    content: z.string().max(2000).optional().describe('Message text'),
    username: z.string().max(80).optional().describe('Override username for this message'),
    avatar_url: z.string().url().optional().describe('Override avatar URL for this message'),
    embed: EmbedSchema.optional().describe('Rich embed object'),
  }),
  requiredPermissions: [],
  isDestructive: false,
  execute: async (client, { webhook_url, webhook_id, webhook_token, content, username, avatar_url, embed }) => {
    let id = webhook_id;
    let token = webhook_token;

    if (webhook_url) {
      const match = webhook_url.match(/discord(?:app)?\.com\/api\/webhooks\/([^\/]+)\/([^\/]+)/);
      if (match) {
        id = match[1];
        token = match[2];
      }
    }

    if (!id || !token) {
      throw new Error('Valid webhook URL or both webhook_id and webhook_token must be supplied.');
    }

    let embedsPayload: any[] | undefined;
    if (embed) {
      let colorInt: number | undefined;
      if (embed.color) colorInt = parseInt(embed.color.replace('#', ''), 16) || 0;
      embedsPayload = [{ ...embed, color: colorInt }];
    }

    const res = await client.executeWebhook(id, token, {
      content,
      username,
      avatar_url,
      embeds: embedsPayload,
    });

    return {
      success: true,
      message_id: res?.id,
    };
  },
};

export const deleteWebhookTool: ToolDefinition = {
  name: 'discord_delete_webhook',
  description: 'Delete a webhook.',
  category: 'webhooks',
  parameters: z.object({
    webhook_id: z.string().describe('Webhook ID to delete'),
    reason: z.string().optional().describe('Reason for audit log'),
  }),
  requiredPermissions: ['MANAGE_WEBHOOKS'],
  isDestructive: true,
  execute: async (client, { webhook_id, reason }) => {
    await client.deleteWebhook(webhook_id, reason);
    return { deleted: true, webhook_id };
  },
};

export const webhookTools = [listWebhooksTool, createWebhookTool, executeWebhookTool, deleteWebhookTool];
