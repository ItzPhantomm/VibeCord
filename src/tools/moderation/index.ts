import { z } from 'zod';
import type { ToolDefinition } from '../types.js';
import { DiscordBridgeError, ErrorCode } from '../../utils/errors.js';

export const timeoutMemberTool: ToolDefinition = {
  name: 'discord_timeout_member',
  description: 'Place a member in timeout (temporary mute) or clear an existing timeout.',
  category: 'moderation',
  parameters: z.object({
    guild_id: z.string().describe('The Discord server ID'),
    user_id: z.string().describe('User ID to timeout'),
    duration_seconds: z.number().int().min(0).max(2419200).nullable().describe('Timeout duration in seconds (max 28 days = 2419200s). Set to 0 or null to remove timeout.'),
    reason: z.string().optional().describe('Reason for audit log'),
  }),
  requiredPermissions: ['MODERATE_MEMBERS'],
  isDestructive: false,
  execute: async (client, { guild_id, user_id, duration_seconds, reason }) => {
    const updated = await client.timeoutMember(guild_id, user_id, duration_seconds, reason);
    return {
      success: true,
      user_id,
      communication_disabled_until: updated.communication_disabled_until,
      timed_out: Boolean(updated.communication_disabled_until),
    };
  },
};

export const kickMemberTool: ToolDefinition = {
  name: 'discord_kick_member',
  description: 'Kick a member from the Discord server.',
  category: 'moderation',
  parameters: z.object({
    guild_id: z.string().describe('The Discord server ID'),
    user_id: z.string().describe('User ID to kick'),
    reason: z.string().optional().describe('Reason for audit log'),
    confirm: z.boolean().describe('Safety confirmation. Must be explicitly set to true.'),
  }),
  requiredPermissions: ['KICK_MEMBERS'],
  isDestructive: true,
  execute: async (client, { guild_id, user_id, reason, confirm }) => {
    if (!confirm) {
      throw new DiscordBridgeError(
        'Kick aborted: "confirm" must be true to kick a member.',
        ErrorCode.OPERATION_ABORTED
      );
    }
    await client.kickMember(guild_id, user_id, reason);
    return { kicked: true, user_id, guild_id };
  },
};

export const banMemberTool: ToolDefinition = {
  name: 'discord_ban_member',
  description: 'Permanently ban a user from the Discord server and optionally delete their recent messages.',
  category: 'moderation',
  parameters: z.object({
    guild_id: z.string().describe('The Discord server ID'),
    user_id: z.string().describe('User ID to ban'),
    delete_message_days: z.number().int().min(0).max(7).default(0).describe('Number of days of messages to delete (0-7)'),
    reason: z.string().optional().describe('Reason for audit log'),
    confirm: z.boolean().describe('Safety confirmation. Must be explicitly set to true.'),
  }),
  requiredPermissions: ['BAN_MEMBERS'],
  isDestructive: true,
  execute: async (client, { guild_id, user_id, delete_message_days, reason, confirm }) => {
    if (!confirm) {
      throw new DiscordBridgeError(
        'Ban aborted: "confirm" must be true to ban a member.',
        ErrorCode.OPERATION_ABORTED
      );
    }
    const seconds = delete_message_days * 86400;
    await client.banMember(guild_id, user_id, { delete_message_seconds: seconds, reason });
    return { banned: true, user_id, guild_id };
  },
};

export const unbanMemberTool: ToolDefinition = {
  name: 'discord_unban_member',
  description: 'Remove a ban for a user in the server.',
  category: 'moderation',
  parameters: z.object({
    guild_id: z.string().describe('The Discord server ID'),
    user_id: z.string().describe('User ID to unban'),
    reason: z.string().optional().describe('Reason for audit log'),
  }),
  requiredPermissions: ['BAN_MEMBERS'],
  isDestructive: false,
  execute: async (client, { guild_id, user_id, reason }) => {
    await client.unbanMember(guild_id, user_id, reason);
    return { unbanned: true, user_id, guild_id };
  },
};

export const getAuditLogsTool: ToolDefinition = {
  name: 'discord_get_audit_logs',
  description: 'Fetch server audit log entries to inspect administrative and moderation actions.',
  category: 'moderation',
  parameters: z.object({
    guild_id: z.string().describe('The Discord server ID'),
    limit: z.number().int().min(1).max(100).default(50).describe('Number of entries to fetch (1-100)'),
    action_type: z.number().int().optional().describe('Filter by Discord audit log event type ID'),
    user_id: z.string().optional().describe('Filter by responsible user ID'),
  }),
  requiredPermissions: ['VIEW_AUDIT_LOG'],
  isDestructive: false,
  execute: async (client, { guild_id, limit, action_type, user_id }) => {
    const raw = await client.getGuildAuditLogs(guild_id, { limit, action_type, user_id });
    const userMap = new Map((raw.users || []).map((u: any) => [u.id, u.username]));

    return (raw.audit_log_entries || []).map((entry: any) => ({
      id: entry.id,
      action_type: entry.action_type,
      user: entry.user_id ? userMap.get(entry.user_id) || entry.user_id : 'Unknown',
      target_id: entry.target_id,
      reason: entry.reason,
      changes: entry.changes?.map((c: any) => ({
        key: c.key,
        old_value: c.old_value,
        new_value: c.new_value,
      })),
    }));
  },
};

export const listMembersTool: ToolDefinition = {
  name: 'discord_list_members',
  description: 'List members of the Discord server, including their roles and join dates.',
  category: 'moderation',
  parameters: z.object({
    guild_id: z.string().describe('The Discord server ID'),
    limit: z.number().int().min(1).max(1000).default(100).describe('Number of members to fetch (1-1000)'),
    after: z.string().optional().describe('Fetch members after this user ID (for pagination)'),
  }),
  requiredPermissions: [],
  isDestructive: false,
  execute: async (client, { guild_id, limit, after }) => {
    const members = await client.listGuildMembers(guild_id, { limit, after });
    return members.map(m => ({
      id: m.user?.id,
      username: m.user?.username,
      nickname: m.nick,
      roles: m.roles,
      joined_at: m.joined_at,
      timed_out: Boolean(m.communication_disabled_until),
    }));
  },
};

export const moderationTools = [
  timeoutMemberTool,
  kickMemberTool,
  banMemberTool,
  unbanMemberTool,
  getAuditLogsTool,
  listMembersTool,
];
