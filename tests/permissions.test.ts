import { describe, it, expect } from 'vitest';
import {
  DiscordPermissions,
  PERMISSION_PRESETS,
  combinePermissions,
  hasPermission,
  explainPermissions,
  generateInviteUrl,
} from '../src/discord/permissions.js';

describe('Discord Permissions Engine', () => {
  it('combines permissions correctly', () => {
    const combined = combinePermissions(['SEND_MESSAGES', 'VIEW_CHANNEL', 'EMBED_LINKS']);
    const expected = DiscordPermissions.SEND_MESSAGES | DiscordPermissions.VIEW_CHANNEL | DiscordPermissions.EMBED_LINKS;
    expect(combined).toBe(expected);
  });

  it('checks permissions accurately via hasPermission', () => {
    const bitfield = DiscordPermissions.MANAGE_CHANNELS | DiscordPermissions.VIEW_AUDIT_LOG;
    expect(hasPermission(bitfield, 'MANAGE_CHANNELS')).toBe(true);
    expect(hasPermission(bitfield, 'VIEW_AUDIT_LOG')).toBe(true);
    expect(hasPermission(bitfield, 'ADMINISTRATOR')).toBe(false);
    expect(hasPermission(bitfield, 'BAN_MEMBERS')).toBe(false);
  });

  it('ADMINISTRATOR permission satisfies all permissions checks', () => {
    const adminBit = DiscordPermissions.ADMINISTRATOR;
    expect(hasPermission(adminBit, 'BAN_MEMBERS')).toBe(true);
    expect(hasPermission(adminBit, 'MANAGE_GUILD')).toBe(true);
    expect(hasPermission(adminBit, 'SEND_MESSAGES')).toBe(true);
  });

  it('explains permissions with granted status', () => {
    const bitfield = DiscordPermissions.VIEW_CHANNEL | DiscordPermissions.SEND_MESSAGES;
    const explained = explainPermissions(bitfield);

    const viewChannel = explained.find(p => p.name === 'VIEW_CHANNEL');
    const sendMessages = explained.find(p => p.name === 'SEND_MESSAGES');
    const banMembers = explained.find(p => p.name === 'BAN_MEMBERS');

    expect(viewChannel?.granted).toBe(true);
    expect(sendMessages?.granted).toBe(true);
    expect(banMembers?.granted).toBe(false);
  });

  it('generates valid OAuth2 invite URLs', () => {
    const url = generateInviteUrl('123456789012345678', 'recommended');
    expect(url).toContain('https://discord.com/oauth2/authorize');
    expect(url).toContain('client_id=123456789012345678');
    expect(url).toContain(`permissions=${PERMISSION_PRESETS.recommended.toString()}`);
    expect(url).toContain('scope=bot%20applications.commands');

    const adminUrl = generateInviteUrl('123456789012345678', 'admin');
    expect(adminUrl).toContain(`permissions=${DiscordPermissions.ADMINISTRATOR.toString()}`);
  });
});
