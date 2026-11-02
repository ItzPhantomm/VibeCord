import { z } from 'zod';
import type { ToolDefinition } from '../types.js';
import {
  combinePermissions,
  explainPermissions,
  type PermissionName,
} from '../../discord/permissions.js';
import { DiscordBridgeError, ErrorCode } from '../../utils/errors.js';

export const listRolesTool: ToolDefinition = {
  name: 'discord_list_roles',
  description: 'List all roles in a Discord server, ordered from highest to lowest in hierarchy.',
  category: 'roles',
  parameters: z.object({
    guild_id: z.string().describe('The Discord server ID'),
  }),
  requiredPermissions: ['MANAGE_ROLES'],
  isDestructive: false,
  execute: async (client, { guild_id }) => {
    const roles = await client.listGuildRoles(guild_id);
    return roles
      .sort((a, b) => b.position - a.position)
      .map(r => ({
        id: r.id,
        name: r.name,
        color: `#${r.color.toString(16).padStart(6, '0')}`,
        position: r.position,
        hoist: r.hoist,
        managed: r.managed,
        mentionable: r.mentionable,
        permissions: r.permissions,
      }));
  },
};

export const getRoleTool: ToolDefinition = {
  name: 'discord_get_role',
  description: 'Get detailed information about a role, including human-readable permission breakdowns.',
  category: 'roles',
  parameters: z.object({
    guild_id: z.string().describe('The Discord server ID'),
    role_id: z.string().describe('The Discord role ID'),
  }),
  requiredPermissions: ['MANAGE_ROLES'],
  isDestructive: false,
  execute: async (client, { guild_id, role_id }) => {
    const roles = await client.listGuildRoles(guild_id);
    const role = roles.find(r => r.id === role_id);
    if (!role) {
      throw new DiscordBridgeError(`Role with ID "${role_id}" not found in guild.`, ErrorCode.NOT_FOUND);
    }

    const explained = explainPermissions(role.permissions);
    const grantedPermissions = explained.filter(p => p.granted).map(p => p.name);

    return {
      id: role.id,
      name: role.name,
      color: `#${role.color.toString(16).padStart(6, '0')}`,
      position: role.position,
      hoist: role.hoist,
      managed: role.managed,
      mentionable: role.mentionable,
      raw_permissions: role.permissions,
      granted_permissions: grantedPermissions,
    };
  },
};

export const createRoleTool: ToolDefinition = {
  name: 'discord_create_role',
  description: 'Create a new role with custom name, color, hoist status, mentionable flag, and permissions.',
  category: 'roles',
  parameters: z.object({
    guild_id: z.string().describe('The Discord server ID'),
    name: z.string().min(1).max(100).describe('Role name'),
    color: z.string().optional().describe('Role hex color code (e.g. "#5865F2" or "5865F2") or numeric color'),
    hoist: z.boolean().default(false).describe('Whether to display this role separately in the member list'),
    mentionable: z.boolean().default(false).describe('Whether this role can be mentioned by anyone'),
    permissions: z.array(z.string()).optional().describe('List of permission names to grant (e.g. ["SEND_MESSAGES", "VIEW_CHANNEL"])'),
    reason: z.string().optional().describe('Reason for audit log'),
  }),
  requiredPermissions: ['MANAGE_ROLES'],
  isDestructive: false,
  execute: async (client, { guild_id, name, color, hoist, mentionable, permissions, reason }) => {
    let colorNumber = 0;
    if (color) {
      const cleanHex = color.replace('#', '');
      colorNumber = parseInt(cleanHex, 16) || 0;
    }

    let permissionsBitfield: string | undefined;
    if (permissions && permissions.length > 0) {
      permissionsBitfield = combinePermissions(permissions as PermissionName[]).toString();
    }

    const role = await client.createRole(guild_id, {
      name,
      color: colorNumber,
      hoist,
      mentionable,
      permissions: permissionsBitfield,
    }, reason);

    return {
      id: role.id,
      name: role.name,
      color: `#${role.color.toString(16).padStart(6, '0')}`,
      position: role.position,
      permissions: role.permissions,
    };
  },
};

export const modifyRoleTool: ToolDefinition = {
  name: 'discord_modify_role',
  description: 'Modify settings of an existing role (name, color, hoist, mentionable, or permissions).',
  category: 'roles',
  parameters: z.object({
    guild_id: z.string().describe('The Discord server ID'),
    role_id: z.string().describe('The Discord role ID to modify'),
    name: z.string().min(1).max(100).optional().describe('New role name'),
    color: z.string().optional().describe('New hex color code'),
    hoist: z.boolean().optional().describe('Display separately in member list'),
    mentionable: z.boolean().optional().describe('Allow anyone to mention this role'),
    permissions: z.array(z.string()).optional().describe('Updated permission names array'),
    reason: z.string().optional().describe('Reason for audit log'),
  }),
  requiredPermissions: ['MANAGE_ROLES'],
  isDestructive: false,
  execute: async (client, { guild_id, role_id, name, color, hoist, mentionable, permissions, reason }) => {
    const data: Record<string, any> = {};
    if (name !== undefined) data.name = name;
    if (hoist !== undefined) data.hoist = hoist;
    if (mentionable !== undefined) data.mentionable = mentionable;
    if (color !== undefined) {
      data.color = parseInt(color.replace('#', ''), 16) || 0;
    }
    if (permissions !== undefined) {
      data.permissions = combinePermissions(permissions as PermissionName[]).toString();
    }

    const updated = await client.modifyRole(guild_id, role_id, data, reason);
    return {
      id: updated.id,
      name: updated.name,
      color: `#${updated.color.toString(16).padStart(6, '0')}`,
      hoist: updated.hoist,
      mentionable: updated.mentionable,
      permissions: updated.permissions,
    };
  },
};

export const deleteRoleTool: ToolDefinition = {
  name: 'discord_delete_role',
  description: 'Permanently delete a role from the server. Requires confirmation.',
  category: 'roles',
  parameters: z.object({
    guild_id: z.string().describe('The Discord server ID'),
    role_id: z.string().describe('The Discord role ID to delete'),
    confirm: z.boolean().describe('Must be set to true to confirm deletion'),
    reason: z.string().optional().describe('Reason for audit log'),
  }),
  requiredPermissions: ['MANAGE_ROLES'],
  isDestructive: true,
  execute: async (client, { guild_id, role_id, confirm, reason }) => {
    if (!confirm) {
      throw new DiscordBridgeError(
        'Deletion aborted: "confirm" must be set to true to permanently delete a role.',
        ErrorCode.OPERATION_ABORTED
      );
    }
    await client.deleteRole(guild_id, role_id, reason);
    return { deleted: true, role_id };
  },
};

export const setChannelPermissionTool: ToolDefinition = {
  name: 'discord_set_channel_permission',
  description: 'Set explicit permission allow/deny overwrites for a specific role or member in a channel.',
  category: 'roles',
  parameters: z.object({
    channel_id: z.string().describe('The channel ID'),
    target_id: z.string().describe('The Role ID or Member User ID to grant/deny permissions for'),
    type: z.enum(['role', 'member']).default('role').describe('Whether the target is a role (0) or a member (1)'),
    allow: z.array(z.string()).default([]).describe('Permissions to explicitly ALLOW for this target'),
    deny: z.array(z.string()).default([]).describe('Permissions to explicitly DENY for this target'),
    reason: z.string().optional().describe('Reason for audit log'),
  }),
  requiredPermissions: ['MANAGE_ROLES', 'MANAGE_CHANNELS'],
  isDestructive: false,
  execute: async (client, { channel_id, target_id, type, allow, deny, reason }) => {
    const allowBits = combinePermissions(allow as PermissionName[]).toString();
    const denyBits = combinePermissions(deny as PermissionName[]).toString();

    await client.setChannelPermission(
      channel_id,
      target_id,
      {
        type: type === 'member' ? 1 : 0,
        allow: allowBits,
        deny: denyBits,
      },
      reason
    );

    return {
      success: true,
      channel_id,
      target_id,
      type,
      allow,
      deny,
    };
  },
};

export const removeChannelPermissionTool: ToolDefinition = {
  name: 'discord_remove_channel_permission',
  description: 'Remove a custom permission overwrite for a role or member from a channel, returning it to synced/default state.',
  category: 'roles',
  parameters: z.object({
    channel_id: z.string().describe('The channel ID'),
    overwrite_id: z.string().describe('The Role ID or Member User ID whose overwrite should be removed'),
    reason: z.string().optional().describe('Reason for audit log'),
  }),
  requiredPermissions: ['MANAGE_ROLES', 'MANAGE_CHANNELS'],
  isDestructive: false,
  execute: async (client, { channel_id, overwrite_id, reason }) => {
    await client.deleteChannelPermission(channel_id, overwrite_id, reason);
    return {
      removed: true,
      channel_id,
      overwrite_id,
    };
  },
};

export const assignRoleTool: ToolDefinition = {
  name: 'discord_assign_role',
  description: 'Assign a role to a server member.',
  category: 'roles',
  parameters: z.object({
    guild_id: z.string().describe('The Discord server ID'),
    user_id: z.string().describe('The user ID of the member'),
    role_id: z.string().describe('The role ID to assign'),
    reason: z.string().optional().describe('Reason for audit log'),
  }),
  requiredPermissions: ['MANAGE_ROLES'],
  isDestructive: false,
  execute: async (client, { guild_id, user_id, role_id, reason }) => {
    await client.assignRoleToMember(guild_id, user_id, role_id, reason);
    return { assigned: true, guild_id, user_id, role_id };
  },
};

export const removeRoleTool: ToolDefinition = {
  name: 'discord_remove_role',
  description: 'Remove a role from a server member.',
  category: 'roles',
  parameters: z.object({
    guild_id: z.string().describe('The Discord server ID'),
    user_id: z.string().describe('The user ID of the member'),
    role_id: z.string().describe('The role ID to remove'),
    reason: z.string().optional().describe('Reason for audit log'),
  }),
  requiredPermissions: ['MANAGE_ROLES'],
  isDestructive: false,
  execute: async (client, { guild_id, user_id, role_id, reason }) => {
    await client.removeRoleFromMember(guild_id, user_id, role_id, reason);
    return { removed: true, guild_id, user_id, role_id };
  },
};

export const roleTools = [
  listRolesTool,
  getRoleTool,
  createRoleTool,
  modifyRoleTool,
  deleteRoleTool,
  setChannelPermissionTool,
  removeChannelPermissionTool,
  assignRoleTool,
  removeRoleTool,
];
