/**
 * VibeCord - Permissions Bitfield Engine & OAuth2 Invite Generator
 */

export const DiscordPermissions = {
  CREATE_INSTANT_INVITE: 1n << 0n,
  KICK_MEMBERS: 1n << 1n,
  BAN_MEMBERS: 1n << 2n,
  ADMINISTRATOR: 1n << 3n,
  MANAGE_CHANNELS: 1n << 4n,
  MANAGE_GUILD: 1n << 5n,
  ADD_REACTIONS: 1n << 6n,
  VIEW_AUDIT_LOG: 1n << 7n,
  PRIORITY_SPEAKER: 1n << 8n,
  STREAM: 1n << 9n,
  VIEW_CHANNEL: 1n << 10n,
  SEND_MESSAGES: 1n << 11n,
  SEND_TTS_MESSAGES: 1n << 12n,
  MANAGE_MESSAGES: 1n << 13n,
  EMBED_LINKS: 1n << 14n,
  ATTACH_FILES: 1n << 15n,
  READ_MESSAGE_HISTORY: 1n << 16n,
  MENTION_EVERYONE: 1n << 17n,
  USE_EXTERNAL_EMOJIS: 1n << 18n,
  VIEW_GUILD_INSIGHTS: 1n << 19n,
  CONNECT: 1n << 20n,
  SPEAK: 1n << 21n,
  MUTE_MEMBERS: 1n << 22n,
  DEAFEN_MEMBERS: 1n << 23n,
  MOVE_MEMBERS: 1n << 24n,
  USE_VAD: 1n << 25n,
  CHANGE_NICKNAME: 1n << 26n,
  MANAGE_NICKNAMES: 1n << 27n,
  MANAGE_ROLES: 1n << 28n,
  MANAGE_WEBHOOKS: 1n << 29n,
  MANAGE_GUILD_EXPRESSIONS: 1n << 30n,
  USE_APPLICATION_COMMANDS: 1n << 31n,
  REQUEST_TO_SPEAK: 1n << 32n,
  MANAGE_EVENTS: 1n << 33n,
  MANAGE_THREADS: 1n << 34n,
  CREATE_PUBLIC_THREADS: 1n << 35n,
  CREATE_PRIVATE_THREADS: 1n << 36n,
  USE_EXTERNAL_STICKERS: 1n << 37n,
  SEND_MESSAGES_IN_THREADS: 1n << 38n,
  USE_EMBEDDED_ACTIVITIES: 1n << 39n,
  MODERATE_MEMBERS: 1n << 40n,
} as const;

export type PermissionName = keyof typeof DiscordPermissions;

export const PERMISSION_DESCRIPTIONS: Record<PermissionName, string> = {
  CREATE_INSTANT_INVITE: 'Allows creation of server invites',
  KICK_MEMBERS: 'Allows kicking members from the server',
  BAN_MEMBERS: 'Allows banning members from the server',
  ADMINISTRATOR: 'Explicitly grants all permissions (bypasses channel overwrites)',
  MANAGE_CHANNELS: 'Allows creating, editing, and deleting channels & categories',
  MANAGE_GUILD: 'Allows modifying server name, region, icon, and basic settings',
  ADD_REACTIONS: 'Allows adding new emoji reactions to messages',
  VIEW_AUDIT_LOG: 'Allows viewing server audit log history',
  PRIORITY_SPEAKER: 'Allows speaker priority in voice channels',
  STREAM: 'Allows video streaming in voice channels',
  VIEW_CHANNEL: 'Allows viewing text/voice channels',
  SEND_MESSAGES: 'Allows sending messages in text channels',
  SEND_TTS_MESSAGES: 'Allows sending Text-To-Speech messages',
  MANAGE_MESSAGES: 'Allows deleting other users messages and pinning messages',
  EMBED_LINKS: 'Allows rendering rich embeds and link previews',
  ATTACH_FILES: 'Allows uploading images and attachments',
  READ_MESSAGE_HISTORY: 'Allows reading past messages in channels',
  MENTION_EVERYONE: 'Allows using @everyone and @here mentions',
  USE_EXTERNAL_EMOJIS: 'Allows using custom emojis from other servers',
  VIEW_GUILD_INSIGHTS: 'Allows viewing server analytics and insights',
  CONNECT: 'Allows joining voice channels',
  SPEAK: 'Allows speaking in voice channels',
  MUTE_MEMBERS: 'Allows muting members in voice channels',
  DEAFEN_MEMBERS: 'Allows deafening members in voice channels',
  MOVE_MEMBERS: 'Allows moving members between voice channels',
  USE_VAD: 'Allows using voice-activity detection instead of Push-to-Talk',
  CHANGE_NICKNAME: 'Allows changing own nickname',
  MANAGE_NICKNAMES: 'Allows modifying other members nicknames',
  MANAGE_ROLES: 'Allows creating, editing, and deleting roles below bot highest role',
  MANAGE_WEBHOOKS: 'Allows creating, editing, and deleting webhooks',
  MANAGE_GUILD_EXPRESSIONS: 'Allows managing emojis, stickers, and soundboard sounds',
  USE_APPLICATION_COMMANDS: 'Allows using slash commands',
  REQUEST_TO_SPEAK: 'Allows requesting to speak in stage channels',
  MANAGE_EVENTS: 'Allows creating, editing, and deleting scheduled events',
  MANAGE_THREADS: 'Allows deleting and archiving threads',
  CREATE_PUBLIC_THREADS: 'Allows creating public threads',
  CREATE_PRIVATE_THREADS: 'Allows creating private threads',
  USE_EXTERNAL_STICKERS: 'Allows using stickers from other servers',
  SEND_MESSAGES_IN_THREADS: 'Allows sending messages inside threads',
  USE_EMBEDDED_ACTIVITIES: 'Allows launching activities in voice channels',
  MODERATE_MEMBERS: 'Allows timing out (muting) members',
};

/**
 * Standard Permission Presets
 */
export const PERMISSION_PRESETS: Record<string, bigint> = {
  // Full Administrator: Recommended for dedicated server administration bot
  admin: DiscordPermissions.ADMINISTRATOR,

  // Granular Recommended: High capability for automation without granting global ADMINISTRATOR
  recommended:
    DiscordPermissions.MANAGE_CHANNELS |
    DiscordPermissions.MANAGE_ROLES |
    DiscordPermissions.MANAGE_GUILD |
    DiscordPermissions.VIEW_AUDIT_LOG |
    DiscordPermissions.VIEW_CHANNEL |
    DiscordPermissions.SEND_MESSAGES |
    DiscordPermissions.SEND_MESSAGES_IN_THREADS |
    DiscordPermissions.MANAGE_MESSAGES |
    DiscordPermissions.EMBED_LINKS |
    DiscordPermissions.ATTACH_FILES |
    DiscordPermissions.READ_MESSAGE_HISTORY |
    DiscordPermissions.ADD_REACTIONS |
    DiscordPermissions.USE_EXTERNAL_EMOJIS |
    DiscordPermissions.MANAGE_THREADS |
    DiscordPermissions.CREATE_PUBLIC_THREADS |
    DiscordPermissions.CREATE_PRIVATE_THREADS |
    DiscordPermissions.MANAGE_WEBHOOKS |
    DiscordPermissions.MODERATE_MEMBERS |
    DiscordPermissions.KICK_MEMBERS |
    DiscordPermissions.BAN_MEMBERS |
    DiscordPermissions.USE_APPLICATION_COMMANDS,

  // Read-only inspection preset
  read_only:
    DiscordPermissions.VIEW_CHANNEL |
    DiscordPermissions.READ_MESSAGE_HISTORY |
    DiscordPermissions.VIEW_AUDIT_LOG |
    DiscordPermissions.VIEW_GUILD_INSIGHTS,
};

/**
 * Combines an array of permission names into a BigInt bitfield.
 */
export function combinePermissions(names: PermissionName[]): bigint {
  let bitfield = 0n;
  for (const name of names) {
    if (DiscordPermissions[name]) {
      bitfield |= DiscordPermissions[name];
    }
  }
  return bitfield;
}

/**
 * Checks if a bitfield has a specific permission.
 */
export function hasPermission(bitfield: bigint | string | number, permission: PermissionName): boolean {
  const b = typeof bitfield === 'bigint' ? bitfield : BigInt(bitfield);
  // Administrator grants all permissions
  if ((b & DiscordPermissions.ADMINISTRATOR) === DiscordPermissions.ADMINISTRATOR) {
    return true;
  }
  const flag = DiscordPermissions[permission];
  return (b & flag) === flag;
}

/**
 * Explains a permission bitfield by listing which permissions are enabled.
 */
export function explainPermissions(bitfield: bigint | string | number): Array<{
  name: PermissionName;
  description: string;
  granted: boolean;
}> {
  const b = typeof bitfield === 'bigint' ? bitfield : BigInt(bitfield);
  const isAdmin = (b & DiscordPermissions.ADMINISTRATOR) === DiscordPermissions.ADMINISTRATOR;

  return (Object.keys(DiscordPermissions) as PermissionName[]).map(name => {
    const flag = DiscordPermissions[name];
    const granted = isAdmin || (b & flag) === flag;
    return {
      name,
      description: PERMISSION_DESCRIPTIONS[name],
      granted,
    };
  });
}

/**
 * Generates an OAuth2 invite URL for the bot.
 */
export function generateInviteUrl(
  applicationId: string,
  presetOrPermissions: 'admin' | 'recommended' | 'read_only' | bigint | string = 'recommended'
): string {
  let perms: bigint;
  if (typeof presetOrPermissions === 'string' && PERMISSION_PRESETS[presetOrPermissions]) {
    perms = PERMISSION_PRESETS[presetOrPermissions];
  } else if (typeof presetOrPermissions === 'bigint') {
    perms = presetOrPermissions;
  } else {
    perms = BigInt(presetOrPermissions);
  }

  const permissionsInteger = perms.toString();
  // Request bot and applications.commands scopes
  return `https://discord.com/oauth2/authorize?client_id=${applicationId}&permissions=${permissionsInteger}&scope=bot%20applications.commands`;
}
