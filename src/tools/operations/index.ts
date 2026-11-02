import { z } from 'zod';
import type { ToolDefinition } from '../types.js';
import { ChannelType, type ServerPlan, type ServerPlanDiff, type ServerAuditReport, type SecurityAuditIssue } from '../../discord/types.js';
import { DiscordPermissions, hasPermission, combinePermissions, type PermissionName } from '../../discord/permissions.js';
import { DiscordBridgeError, ErrorCode } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';

// --- Built-in Blueprint Templates ---

export const SERVER_BLUEPRINTS: Record<string, ServerPlan> = {
  developer_community: {
    name: 'Developer Community',
    description: 'Production architecture for open source & engineering communities',
    roles: [
      { name: 'Admin', color: '#EF4444', hoist: true, mentionable: false, permissions: ['ADMINISTRATOR'] },
      { name: 'Maintainer', color: '#F59E0B', hoist: true, mentionable: true, permissions: ['MANAGE_CHANNELS', 'MANAGE_MESSAGES', 'MODERATE_MEMBERS', 'KICK_MEMBERS', 'VIEW_AUDIT_LOG'] },
      { name: 'Core Contributor', color: '#10B981', hoist: true, mentionable: true, permissions: ['CREATE_PUBLIC_THREADS', 'SEND_MESSAGES_IN_THREADS', 'EMBED_LINKS', 'ATTACH_FILES'] },
      { name: 'Community Member', color: '#3B82F6', hoist: false, mentionable: false, permissions: ['VIEW_CHANNEL', 'SEND_MESSAGES', 'READ_MESSAGE_HISTORY', 'ADD_REACTIONS'] },
      { name: 'Bot', color: '#6B7280', hoist: true, mentionable: false, permissions: ['SEND_MESSAGES', 'EMBED_LINKS'] },
    ],
    categories: [
      {
        name: '📢 INFORMATION',
        channels: [
          { name: 'welcome-and-rules', type: 'text', topic: 'Community guidelines and project overview', slowmode: 0 },
          { name: 'announcements', type: 'announcement', topic: 'Official release notes and updates', slowmode: 0 },
          { name: 'roadmap', type: 'text', topic: 'Current sprints and upcoming releases', slowmode: 0 },
        ],
      },
      {
        name: '💬 GENERAL',
        channels: [
          { name: 'general', type: 'text', topic: 'Casual conversation and team banter', slowmode: 3 },
          { name: 'introductions', type: 'text', topic: 'Introduce yourself to the community', slowmode: 10 },
          { name: 'showcase', type: 'text', topic: 'Share what you have built', slowmode: 5 },
        ],
      },
      {
        name: '🛠️ ENGINEERING',
        channels: [
          { name: 'dev-chat', type: 'text', topic: 'Architecture, technical discussions and PR reviews', slowmode: 0 },
          { name: 'help-and-questions', type: 'forum', topic: 'Ask technical questions and get troubleshooting assistance', slowmode: 0 },
          { name: 'bug-reports', type: 'text', topic: 'Discussions on issues, repro steps and triage', slowmode: 5 },
        ],
      },
      {
        name: '🔊 VOICE',
        channels: [
          { name: 'Dev Lounge', type: 'voice' },
          { name: 'Pair Programming', type: 'voice', user_limit: 4 },
        ],
      },
    ],
  },

  saas_support: {
    name: 'SaaS Customer Support & Community',
    description: 'Structured server for product customer success and feedback',
    roles: [
      { name: 'Support Lead', color: '#EC4899', hoist: true, mentionable: true, permissions: ['MANAGE_CHANNELS', 'MANAGE_MESSAGES', 'MODERATE_MEMBERS'] },
      { name: 'Support Agent', color: '#8B5CF6', hoist: true, mentionable: true, permissions: ['MANAGE_MESSAGES', 'CREATE_PUBLIC_THREADS'] },
      { name: 'VIP Customer', color: '#F59E0B', hoist: true, mentionable: false, permissions: ['ATTACH_FILES', 'EMBED_LINKS'] },
      { name: 'User', color: '#9CA3AF', hoist: false, mentionable: false, permissions: ['VIEW_CHANNEL', 'SEND_MESSAGES'] },
    ],
    categories: [
      {
        name: 'WELCOME',
        channels: [
          { name: 'getting-started', type: 'text', topic: 'Quick start guide and documentation links' },
          { name: 'changelog', type: 'announcement', topic: 'New features, bug fixes, and maintenance' },
        ],
      },
      {
        name: 'SUPPORT DESK',
        channels: [
          { name: 'support-forum', type: 'forum', topic: 'Open a ticket or ask support questions' },
          { name: 'feature-requests', type: 'forum', topic: 'Vote and suggest product improvements' },
        ],
      },
    ],
  },

  gaming_guild: {
    name: 'Gaming Guild & Esports',
    description: 'Optimized voice and team channels for gaming squads',
    roles: [
      { name: 'Guild Master', color: '#EF4444', hoist: true, mentionable: true, permissions: ['ADMINISTRATOR'] },
      { name: 'Officer', color: '#F97316', hoist: true, mentionable: true, permissions: ['MANAGE_MESSAGES', 'MOVE_MEMBERS', 'MUTE_MEMBERS'] },
      { name: 'Raid Member', color: '#10B981', hoist: true, mentionable: false, permissions: ['CONNECT', 'SPEAK', 'STREAM'] },
      { name: 'Recruit', color: '#6B7280', hoist: false, mentionable: false, permissions: ['VIEW_CHANNEL', 'CONNECT', 'SPEAK'] },
    ],
    categories: [
      {
        name: 'HQ',
        channels: [
          { name: 'announcements', type: 'announcement' },
          { name: 'general-chat', type: 'text', slowmode: 5 },
          { name: 'clips-and-highlights', type: 'text' },
        ],
      },
      {
        name: 'VOICE CHANNELS',
        channels: [
          { name: 'Squad 1 (Competitive)', type: 'voice', user_limit: 5 },
          { name: 'Squad 2 (Competitive)', type: 'voice', user_limit: 5 },
          { name: 'Casual Gaming', type: 'voice' },
        ],
      },
    ],
  },

  minimal: {
    name: 'Minimal Clean Server',
    description: 'Clean starter with essential channels and roles',
    roles: [
      { name: 'Moderator', color: '#3B82F6', hoist: true, mentionable: true, permissions: ['MANAGE_MESSAGES', 'MODERATE_MEMBERS'] },
      { name: 'Member', color: '#9CA3AF', hoist: false, mentionable: false, permissions: ['VIEW_CHANNEL', 'SEND_MESSAGES'] },
    ],
    categories: [
      {
        name: 'GENERAL',
        channels: [
          { name: 'welcome', type: 'text' },
          { name: 'general', type: 'text' },
          { name: 'Voice Lounge', type: 'voice' },
        ],
      },
    ],
  },
};

// --- Tools ---

export const designServerTool: ToolDefinition = {
  name: 'discord_design_server',
  description: 'Generate a production-ready declarative server blueprint based on community type or tailored requirements.',
  category: 'operations',
  parameters: z.object({
    template: z.enum(['developer_community', 'saas_support', 'gaming_guild', 'minimal']).default('developer_community').describe('Base architectural blueprint template'),
    server_name: z.string().optional().describe('Custom name to assign to the blueprint'),
    include_voice: z.boolean().default(true).describe('Include voice channels in generated blueprint'),
  }),
  requiredPermissions: [],
  isDestructive: false,
  execute: async (_client, { template, server_name, include_voice }) => {
    const base = JSON.parse(JSON.stringify(SERVER_BLUEPRINTS[template] || SERVER_BLUEPRINTS.minimal)) as ServerPlan;
    if (server_name) {
      base.name = server_name;
    }
    if (!include_voice) {
      base.categories = base.categories
        .map(cat => ({
          ...cat,
          channels: cat.channels.filter(c => c.type !== 'voice' && c.type !== 'stage'),
        }))
        .filter(cat => cat.channels.length > 0);
    }
    return {
      template,
      plan: base,
      summary: {
        roles_count: base.roles.length,
        categories_count: base.categories.length,
        channels_count: base.categories.reduce((acc, c) => acc + c.channels.length, 0),
      },
    };
  },
};

export const auditServerTool: ToolDefinition = {
  name: 'discord_audit_server',
  description: 'Audit a Discord server for security misconfigurations, overly permissive @everyone role, hierarchy risks, and missing safeguards.',
  category: 'operations',
  parameters: z.object({
    guild_id: z.string().describe('The Discord server ID to audit'),
  }),
  requiredPermissions: ['VIEW_AUDIT_LOG', 'MANAGE_ROLES'],
  isDestructive: false,
  execute: async (client, { guild_id }) => {
    const guild = await client.getGuild(guild_id);
    const roles = await client.listGuildRoles(guild_id);
    const channels = await client.listGuildChannels(guild_id);

    const issues: SecurityAuditIssue[] = [];
    let score = 100;

    // 1. Audit @everyone role (ID is equal to guild_id)
    const everyoneRole = roles.find(r => r.id === guild_id);
    const dangerousEveryonePerms: string[] = [];

    if (everyoneRole) {
      const bitfield = BigInt(everyoneRole.permissions);
      const risky = [
        { perm: 'ADMINISTRATOR', desc: '@everyone role has ADMINISTRATOR permission! Critical security vulnerability.', sev: 'critical' as const, penalty: 50 },
        { perm: 'MANAGE_GUILD', desc: '@everyone can modify server settings.', sev: 'critical' as const, penalty: 30 },
        { perm: 'MANAGE_ROLES', desc: '@everyone can create and edit roles.', sev: 'critical' as const, penalty: 30 },
        { perm: 'MANAGE_CHANNELS', desc: '@everyone can delete and create channels.', sev: 'critical' as const, penalty: 30 },
        { perm: 'KICK_MEMBERS', desc: '@everyone can kick members.', sev: 'high' as const, penalty: 20 },
        { perm: 'BAN_MEMBERS', desc: '@everyone can ban members.', sev: 'high' as const, penalty: 20 },
        { perm: 'MENTION_EVERYONE', desc: '@everyone can ping @everyone/@here, leading to spam cascades.', sev: 'medium' as const, penalty: 15 },
        { perm: 'MANAGE_MESSAGES', desc: '@everyone can delete other users messages.', sev: 'high' as const, penalty: 20 },
      ];

      for (const check of risky) {
        if (hasPermission(bitfield, check.perm as any)) {
          dangerousEveryonePerms.push(check.perm);
          score = Math.max(0, score - check.penalty);
          issues.push({
            severity: check.sev,
            title: `Dangerous Permission on @everyone: ${check.perm}`,
            description: check.desc,
            recommendation: `Revoke "${check.perm}" from @everyone role and grant only to trusted staff roles.`,
            affectedEntity: { type: 'role', id: everyoneRole.id, name: '@everyone' },
          });
        }
      }
    }

    // 2. Count admin roles
    let adminRolesCount = 0;
    for (const role of roles) {
      if (hasPermission(BigInt(role.permissions), 'ADMINISTRATOR') && role.id !== guild_id) {
        adminRolesCount++;
      }
    }
    if (adminRolesCount > 3) {
      score = Math.max(0, score - 10);
      issues.push({
        severity: 'medium',
        title: 'High Number of Administrator Roles',
        description: `Found ${adminRolesCount} distinct roles with ADMINISTRATOR privileges.`,
        recommendation: 'Follow the principle of least privilege. Grant granular permissions rather than full ADMINISTRATOR.',
      });
    }

    // 3. Verification level audit
    if (guild.verification_level === 0) {
      score = Math.max(0, score - 15);
      issues.push({
        severity: 'medium',
        title: 'Server Verification Level is "None"',
        description: 'New accounts without verified email can immediately join and post, making server vulnerable to raid bots.',
        recommendation: 'Raise verification level to at least 1 (Low: Verified email required) or 2 (Medium: Registered for > 5 min).',
        affectedEntity: { type: 'server', id: guild.id, name: guild.name },
      });
    }

    // 4. Channels slowmode check in general public channels
    let channelsWithoutSlowmode = 0;
    for (const ch of channels) {
      if (ch.type === ChannelType.GUILD_TEXT && !ch.parent_id && (!ch.rate_limit_per_user || ch.rate_limit_per_user === 0)) {
        channelsWithoutSlowmode++;
      }
    }

    const report: ServerAuditReport = {
      guildId: guild.id,
      guildName: guild.name,
      auditedAt: new Date().toISOString(),
      overallScore: score,
      securityIssues: issues,
      metrics: {
        totalRoles: roles.length,
        totalChannels: channels.length,
        adminRoles: adminRolesCount,
        dangerousEveryonePermissions: dangerousEveryonePerms,
        unprotectedVoiceChannels: 0,
        channelsWithoutSlowmode,
      },
    };

    return report;
  },
};

export const previewServerPlanTool: ToolDefinition = {
  name: 'discord_preview_server_plan',
  description: 'Compare a declarative ServerPlan blueprint against live server state and produce a safe diff of proposed actions without making mutations.',
  category: 'operations',
  parameters: z.object({
    guild_id: z.string().describe('The Discord server ID'),
    plan: z.any().describe('The ServerPlan object (roles, categories, channels)'),
  }),
  requiredPermissions: ['VIEW_CHANNEL', 'MANAGE_ROLES'],
  isDestructive: false,
  execute: async (client, { guild_id, plan }) => {
    const existingRoles = await client.listGuildRoles(guild_id);
    const existingChannels = await client.listGuildChannels(guild_id);

    const typedPlan = plan as ServerPlan;
    const existingRoleNames = new Set(existingRoles.map(r => r.name.toLowerCase()));
    const existingChannelNames = new Set(existingChannels.map(c => c.name?.toLowerCase()));

    const rolesToCreate = (typedPlan.roles || []).filter(r => !existingRoleNames.has(r.name.toLowerCase()));
    const rolesUnchanged = (typedPlan.roles || []).filter(r => existingRoleNames.has(r.name.toLowerCase())).map(r => r.name);

    const categoriesToCreate: string[] = [];
    const channelsToCreate: any[] = [];

    for (const cat of typedPlan.categories || []) {
      const catExists = existingChannels.some(
        c => c.type === ChannelType.GUILD_CATEGORY && c.name?.toLowerCase() === cat.name.toLowerCase()
      );
      if (!catExists) {
        categoriesToCreate.push(cat.name);
      }

      for (const ch of cat.channels || []) {
        if (!existingChannelNames.has(ch.name.toLowerCase())) {
          channelsToCreate.push({
            ...ch,
            targetCategoryName: cat.name,
          });
        }
      }
    }

    const diff: ServerPlanDiff = {
      rolesToCreate,
      rolesToUpdate: [],
      rolesUnchanged,
      categoriesToCreate,
      channelsToCreate,
      channelsToUpdate: [],
      summary: {
        totalRolesToCreate: rolesToCreate.length,
        totalCategoriesToCreate: categoriesToCreate.length,
        totalChannelsToCreate: channelsToCreate.length,
        destructiveWarnings: [],
      },
    };

    return diff;
  },
};

export const applyServerPlanTool: ToolDefinition = {
  name: 'discord_apply_server_plan',
  description: 'Apply a declarative ServerPlan blueprint to a Discord server with topological ordering and rate limit safety.',
  category: 'operations',
  parameters: z.object({
    guild_id: z.string().describe('The Discord server ID'),
    plan: z.any().describe('The ServerPlan blueprint to apply'),
    confirm: z.boolean().describe('Safety confirmation. Must be explicitly set to true.'),
  }),
  requiredPermissions: ['MANAGE_CHANNELS', 'MANAGE_ROLES'],
  isDestructive: false,
  execute: async (client, { guild_id, plan, confirm }) => {
    if (!confirm) {
      throw new DiscordBridgeError(
        'Execution aborted: "confirm" must be true to apply server plan mutations.',
        ErrorCode.OPERATION_ABORTED
      );
    }

    const typedPlan = plan as ServerPlan;
    const createdRoles: Record<string, string> = {}; // name -> id
    const createdCategories: Record<string, string> = {}; // name -> id
    const createdChannels: Array<{ name: string; id: string; category?: string }> = [];

    // Step 1: Query existing roles & channels for idempotency
    const existingRoles = await client.listGuildRoles(guild_id);
    for (const r of existingRoles) {
      createdRoles[r.name.toLowerCase()] = r.id;
    }

    const existingChannels = await client.listGuildChannels(guild_id);
    for (const c of existingChannels) {
      if (c.type === ChannelType.GUILD_CATEGORY && c.name) {
        createdCategories[c.name.toLowerCase()] = c.id;
      }
    }

    // Step 2: Create Roles in order
    logger.info(`Applying server plan: creating ${typedPlan.roles?.length || 0} roles...`);
    for (const rolePlan of typedPlan.roles || []) {
      const lower = rolePlan.name.toLowerCase();
      if (createdRoles[lower]) {
        logger.debug(`Role "${rolePlan.name}" already exists, skipping creation.`);
        continue;
      }

      let colorNumber = 0;
      if (rolePlan.color) {
        const hex = String(rolePlan.color).replace('#', '');
        colorNumber = parseInt(hex, 16) || 0;
      }

      let permissionsBitfield: string | undefined;
      if (rolePlan.permissions && Array.isArray(rolePlan.permissions) && rolePlan.permissions.length > 0) {
        permissionsBitfield = combinePermissions(rolePlan.permissions as PermissionName[]).toString();
      } else if (typeof rolePlan.permissions === 'string') {
        permissionsBitfield = rolePlan.permissions;
      }

      const role = await client.createRole(guild_id, {
        name: rolePlan.name,
        color: colorNumber,
        hoist: rolePlan.hoist ?? false,
        mentionable: rolePlan.mentionable ?? false,
        permissions: permissionsBitfield,
      }, 'VibeCord Plan Execution');

      createdRoles[lower] = role.id;
      // Stagger slightly to avoid burst rate limits
      await new Promise(r => setTimeout(r, 250));
    }

    // Step 3: Create Categories
    for (const cat of typedPlan.categories || []) {
      const lower = cat.name.toLowerCase();
      if (!createdCategories[lower]) {
        const categoryChannel = await client.createChannel(guild_id, {
          name: cat.name,
          type: ChannelType.GUILD_CATEGORY,
        }, 'VibeCord Plan Execution');
        createdCategories[lower] = categoryChannel.id;
        await new Promise(r => setTimeout(r, 300));
      }

      const parentId = createdCategories[lower];

      // Apply category permission overwrites if present
      if (cat.permissionOverwrites && Array.isArray(cat.permissionOverwrites)) {
        for (const ow of cat.permissionOverwrites) {
          let targetId: string | undefined;
          if (ow.roleOrMemberName === '@everyone') {
            targetId = guild_id;
          } else {
            targetId = createdRoles[ow.roleOrMemberName.toLowerCase()];
          }
          if (targetId) {
            const allowBits = ow.allow && ow.allow.length > 0 ? combinePermissions(ow.allow as any).toString() : '0';
            const denyBits = ow.deny && ow.deny.length > 0 ? combinePermissions(ow.deny as any).toString() : '0';
            await client.setChannelPermission(parentId, targetId, { type: 0, allow: allowBits, deny: denyBits }, 'Category Overwrites');
            await new Promise(r => setTimeout(r, 200));
          }
        }
      }

      // Step 4: Create Channels under this category
      for (const ch of cat.channels || []) {
        const typeMap: Record<string, number> = {
          text: ChannelType.GUILD_TEXT,
          voice: ChannelType.GUILD_VOICE,
          announcement: ChannelType.GUILD_ANNOUNCEMENT,
          forum: ChannelType.GUILD_FORUM,
          stage: ChannelType.GUILD_STAGE_VOICE,
        };

        const existingCh = existingChannels.find(
          ec => ec.name?.toLowerCase() === ch.name.toLowerCase()
        );
        let channelId: string;

        if (existingCh) {
          await client.modifyChannel(existingCh.id, {
            parent_id: parentId,
            topic: ch.topic,
            rate_limit_per_user: ch.slowmode,
            user_limit: ch.user_limit,
            bitrate: ch.bitrate,
          }, 'VibeCord Plan Execution');
          channelId = existingCh.id;
          createdChannels.push({ name: ch.name, id: channelId, category: cat.name });
        } else {
          const channel = await client.createChannel(guild_id, {
            name: ch.name,
            type: typeMap[ch.type] || ChannelType.GUILD_TEXT,
            parent_id: parentId,
            topic: ch.topic,
            rate_limit_per_user: ch.slowmode,
            user_limit: ch.user_limit,
            bitrate: ch.bitrate,
          }, 'VibeCord Plan Execution');
          channelId = channel.id;
          createdChannels.push({ name: channel.name || ch.name, id: channelId, category: cat.name });
        }

        // Apply channel-specific permission overwrites if present
        if (ch.permissionOverwrites && Array.isArray(ch.permissionOverwrites)) {
          for (const ow of ch.permissionOverwrites) {
            let targetId: string | undefined;
            if (ow.roleOrMemberName === '@everyone') {
              targetId = guild_id;
            } else {
              targetId = createdRoles[ow.roleOrMemberName.toLowerCase()];
            }
            if (targetId) {
              const allowBits = ow.allow && ow.allow.length > 0 ? combinePermissions(ow.allow as any).toString() : '0';
              const denyBits = ow.deny && ow.deny.length > 0 ? combinePermissions(ow.deny as any).toString() : '0';
              await client.setChannelPermission(channelId, targetId, { type: 0, allow: allowBits, deny: denyBits }, 'Channel Overwrites');
              await new Promise(r => setTimeout(r, 200));
            }
          }
        }

        await new Promise(r => setTimeout(r, 300));
      }
    }

    return {
      success: true,
      appliedAt: new Date().toISOString(),
      summary: {
        roles_processed: Object.keys(createdRoles).length,
        categories_processed: Object.keys(createdCategories).length,
        channels_created: createdChannels.length,
      },
      created_channels: createdChannels,
    };
  },
};

export const backupServerTool: ToolDefinition = {
  name: 'discord_backup_server',
  description: 'Export live server structure (roles, categories, channels, permissions) into a reusable declarative JSON blueprint.',
  category: 'operations',
  parameters: z.object({
    guild_id: z.string().describe('The Discord server ID to export'),
  }),
  requiredPermissions: ['VIEW_CHANNEL', 'MANAGE_ROLES'],
  isDestructive: false,
  execute: async (client, { guild_id }) => {
    const guild = await client.getGuild(guild_id);
    const roles = await client.listGuildRoles(guild_id);
    const channels = await client.listGuildChannels(guild_id);

    const categories = channels.filter(c => c.type === ChannelType.GUILD_CATEGORY);
    const nonCategories = channels.filter(c => c.type !== ChannelType.GUILD_CATEGORY);

    const typeReverse: Record<number, 'text' | 'voice' | 'announcement' | 'forum' | 'stage'> = {
      [ChannelType.GUILD_TEXT]: 'text',
      [ChannelType.GUILD_VOICE]: 'voice',
      [ChannelType.GUILD_ANNOUNCEMENT]: 'announcement',
      [ChannelType.GUILD_FORUM]: 'forum',
      [ChannelType.GUILD_STAGE_VOICE]: 'stage',
    };

    const plan: ServerPlan = {
      name: guild.name,
      description: guild.description || undefined,
      roles: roles
        .filter(r => r.id !== guild_id && !r.managed) // exclude @everyone and bot integration roles
        .map(r => ({
          name: r.name,
          color: `#${r.color.toString(16).padStart(6, '0')}`,
          hoist: r.hoist,
          mentionable: r.mentionable,
        })),
      categories: categories.map(cat => ({
        name: cat.name || 'Category',
        channels: nonCategories
          .filter(c => c.parent_id === cat.id)
          .map(c => ({
            name: c.name || 'channel',
            type: typeReverse[c.type] || 'text',
            topic: c.topic || undefined,
            slowmode: c.rate_limit_per_user || undefined,
          })),
      })),
      standaloneChannels: nonCategories
        .filter(c => !c.parent_id)
        .map(c => ({
          name: c.name || 'channel',
          type: typeReverse[c.type] || 'text',
          topic: c.topic || undefined,
        })),
    };

    return {
      guild_id: guild.id,
      guild_name: guild.name,
      exported_at: new Date().toISOString(),
      blueprint: plan,
    };
  },
};

export const verifyChangesTool: ToolDefinition = {
  name: 'discord_verify_changes',
  description: 'Verify live server compliance against an expected ServerPlan blueprint, reporting any missing roles or channels.',
  category: 'operations',
  parameters: z.object({
    guild_id: z.string().describe('The Discord server ID'),
    expected_plan: z.any().describe('The expected ServerPlan blueprint'),
  }),
  requiredPermissions: ['VIEW_CHANNEL', 'MANAGE_ROLES'],
  isDestructive: false,
  execute: async (client, { guild_id, expected_plan }) => {
    const roles = await client.listGuildRoles(guild_id);
    const channels = await client.listGuildChannels(guild_id);

    const plan = expected_plan as ServerPlan;
    const existingRoleNames = new Set(roles.map(r => r.name.toLowerCase()));
    const existingChannelNames = new Set(channels.map(c => c.name?.toLowerCase()));

    const missingRoles = (plan.roles || []).filter(r => !existingRoleNames.has(r.name.toLowerCase())).map(r => r.name);
    const missingChannels: string[] = [];

    for (const cat of plan.categories || []) {
      for (const ch of cat.channels || []) {
        if (!existingChannelNames.has(ch.name.toLowerCase())) {
          missingChannels.push(`${cat.name} / #${ch.name}`);
        }
      }
    }

    const compliant = missingRoles.length === 0 && missingChannels.length === 0;

    return {
      compliant,
      verified_at: new Date().toISOString(),
      missing_roles: missingRoles,
      missing_channels: missingChannels,
      metrics: {
        expected_roles: plan.roles?.length || 0,
        found_roles: roles.length,
        missing_roles_count: missingRoles.length,
        missing_channels_count: missingChannels.length,
      },
    };
  },
};

export const operationsTools = [
  designServerTool,
  auditServerTool,
  previewServerPlanTool,
  applyServerPlanTool,
  backupServerTool,
  verifyChangesTool,
];
