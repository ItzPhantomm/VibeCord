import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DiscordClientWrapper } from '../src/discord/client.js';
import {
  designServerTool,
  auditServerTool,
  previewServerPlanTool,
  applyServerPlanTool,
  verifyChangesTool,
} from '../src/tools/operations/index.js';
import { ChannelType } from '../src/discord/types.js';
import { DiscordPermissions } from '../src/discord/permissions.js';

describe('Declarative Server Operations & Planning', () => {
  let client: DiscordClientWrapper;

  beforeEach(() => {
    client = new DiscordClientWrapper({ token: 'fake_token' });
  });

  it('designs servers with correct blueprint structures', async () => {
    const devBlueprint = await designServerTool.execute(client, {
      template: 'developer_community',
      server_name: 'Antigravity Dev Hub',
      include_voice: true,
    });

    expect(devBlueprint.plan.name).toBe('Antigravity Dev Hub');
    expect(devBlueprint.plan.roles.length).toBeGreaterThanOrEqual(4);
    expect(devBlueprint.plan.categories.length).toBeGreaterThanOrEqual(3);

    const voiceCategory = devBlueprint.plan.categories.find(c => c.name.includes('VOICE'));
    expect(voiceCategory).toBeDefined();

    // Check without voice
    const noVoice = await designServerTool.execute(client, {
      template: 'developer_community',
      include_voice: false,
    });
    const hasVoice = noVoice.plan.categories.some(cat => cat.channels.some(ch => ch.type === 'voice'));
    expect(hasVoice).toBe(false);
  });

  it('audits server security and flags critical @everyone permissions', async () => {
    const guildId = 'guild_123';
    vi.spyOn(client, 'getGuild').mockResolvedValueOnce({
      id: guildId,
      name: 'Vulnerable Server',
      verification_level: 0, // None
    } as any);

    vi.spyOn(client, 'listGuildRoles').mockResolvedValueOnce([
      {
        id: guildId, // @everyone role ID
        name: '@everyone',
        permissions: (DiscordPermissions.ADMINISTRATOR | DiscordPermissions.MENTION_EVERYONE).toString(),
        color: 0,
        hoist: false,
        position: 0,
        managed: false,
        mentionable: false,
      },
      {
        id: 'role_admin_1',
        name: 'Admin 1',
        permissions: DiscordPermissions.ADMINISTRATOR.toString(),
        color: 0,
        hoist: true,
        position: 1,
        managed: false,
        mentionable: false,
      },
    ]);

    vi.spyOn(client, 'listGuildChannels').mockResolvedValueOnce([
      { id: 'chan_1', name: 'general', type: ChannelType.GUILD_TEXT, rate_limit_per_user: 0 },
    ]);

    const report = await auditServerTool.execute(client, { guild_id: guildId });

    expect(report.overallScore).toBeLessThan(50);
    const criticalIssue = report.securityIssues.find(i => i.severity === 'critical');
    expect(criticalIssue).toBeDefined();
    expect(criticalIssue?.title).toContain('@everyone');
    expect(report.metrics.dangerousEveryonePermissions).toContain('ADMINISTRATOR');
  });

  it('previews server plan and generates accurate creation diffs', async () => {
    const guildId = 'guild_123';

    vi.spyOn(client, 'listGuildRoles').mockResolvedValueOnce([
      { id: guildId, name: '@everyone', permissions: '0', color: 0, hoist: false, position: 0, managed: false, mentionable: false },
      { id: 'role_existing', name: 'Admin', permissions: '8', color: 0, hoist: true, position: 1, managed: false, mentionable: false },
    ]);

    vi.spyOn(client, 'listGuildChannels').mockResolvedValueOnce([
      { id: 'cat_info', name: 'INFORMATION', type: ChannelType.GUILD_CATEGORY, position: 0 },
      { id: 'chan_ann', name: 'announcements', type: ChannelType.GUILD_ANNOUNCEMENT, parent_id: 'cat_info', position: 1 },
    ]);

    const plan = {
      roles: [
        { name: 'Admin', permissions: ['ADMINISTRATOR'] }, // already exists
        { name: 'Moderator', permissions: ['MANAGE_MESSAGES'] }, // new
      ],
      categories: [
        {
          name: 'INFORMATION', // already exists
          channels: [
            { name: 'announcements', type: 'announcement' as const }, // already exists
            { name: 'rules', type: 'text' as const }, // new
          ],
        },
        {
          name: 'COMMUNITY', // new
          channels: [
            { name: 'general', type: 'text' as const }, // new
          ],
        },
      ],
    };

    const diff = await previewServerPlanTool.execute(client, { guild_id: guildId, plan });

    expect(diff.rolesToCreate).toHaveLength(1);
    expect(diff.rolesToCreate[0].name).toBe('Moderator');
    expect(diff.rolesUnchanged).toContain('Admin');

    expect(diff.categoriesToCreate).toHaveLength(1);
    expect(diff.categoriesToCreate[0]).toBe('COMMUNITY');

    expect(diff.channelsToCreate).toHaveLength(2); // rules and general
  });

  it('verifies server compliance and detects configuration drift', async () => {
    const guildId = 'guild_123';

    vi.spyOn(client, 'listGuildRoles').mockResolvedValueOnce([
      { id: 'r1', name: 'Admin', permissions: '8', color: 0, hoist: true, position: 1, managed: false, mentionable: false },
    ]);

    vi.spyOn(client, 'listGuildChannels').mockResolvedValueOnce([
      { id: 'c1', name: 'general', type: ChannelType.GUILD_TEXT, position: 1 },
    ]);

    const targetPlan = {
      roles: [
        { name: 'Admin' },
        { name: 'Moderator' }, // missing
      ],
      categories: [
        {
          name: 'CHAT',
          channels: [
            { name: 'general', type: 'text' as const },
            { name: 'introductions', type: 'text' as const }, // missing
          ],
        },
      ],
    };

    const verify = await verifyChangesTool.execute(client, { guild_id: guildId, expected_plan: targetPlan });

    expect(verify.compliant).toBe(false);
    expect(verify.missing_roles).toContain('Moderator');
    expect(verify.missing_channels.some(c => c.includes('introductions'))).toBe(true);
  });
});
