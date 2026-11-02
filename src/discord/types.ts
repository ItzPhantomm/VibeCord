/**
 * VibeCord - Discord Domain & Operation Types
 */

export enum ChannelType {
  GUILD_TEXT = 0,
  DM = 1,
  GUILD_VOICE = 2,
  GROUP_DM = 3,
  GUILD_CATEGORY = 4,
  GUILD_ANNOUNCEMENT = 5,
  ANNOUNCEMENT_THREAD = 10,
  PUBLIC_THREAD = 11,
  PRIVATE_THREAD = 12,
  GUILD_STAGE_VOICE = 13,
  GUILD_DIRECTORY = 14,
  GUILD_FORUM = 15,
  GUILD_MEDIA = 16,
}

export interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  global_name?: string | null;
  avatar?: string | null;
  bot?: boolean;
}

export interface DiscordGuild {
  id: string;
  name: string;
  icon?: string | null;
  description?: string | null;
  owner_id?: string;
  permissions?: string;
  approximate_member_count?: number;
  approximate_presence_count?: number;
  features?: string[];
  verification_level?: number;
  system_channel_id?: string | null;
  rules_channel_id?: string | null;
  afk_channel_id?: string | null;
  afk_timeout?: number;
}

export interface PermissionOverwrite {
  id: string; // role or member ID
  type: 0 | 1; // 0 = role, 1 = member
  allow: string; // bitfield string
  deny: string; // bitfield string
}

export interface DiscordChannel {
  id: string;
  type: ChannelType;
  guild_id?: string;
  position?: number;
  permission_overwrites?: PermissionOverwrite[];
  name?: string;
  topic?: string | null;
  nsfw?: boolean;
  last_message_id?: string | null;
  bitrate?: number;
  user_limit?: number;
  rate_limit_per_user?: number; // slowmode in seconds
  parent_id?: string | null; // category ID
  default_auto_archive_duration?: number;
}

export interface DiscordRole {
  id: string;
  name: string;
  color: number;
  hoist: boolean;
  position: number;
  permissions: string;
  managed: boolean;
  mentionable: boolean;
  description?: string | null;
}

export interface DiscordMember {
  user?: DiscordUser;
  nick?: string | null;
  avatar?: string | null;
  roles: string[];
  joined_at: string;
  premium_since?: string | null;
  deaf?: boolean;
  mute?: boolean;
  pending?: boolean;
  communication_disabled_until?: string | null; // timeout
}

export interface EmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

export interface DiscordEmbed {
  title?: string;
  description?: string;
  url?: string;
  timestamp?: string;
  color?: number;
  footer?: { text: string; icon_url?: string };
  image?: { url: string };
  thumbnail?: { url: string };
  author?: { name: string; url?: string; icon_url?: string };
  fields?: EmbedField[];
}

export interface DiscordMessage {
  id: string;
  channel_id: string;
  author: DiscordUser;
  content: string;
  timestamp: string;
  edited_timestamp?: string | null;
  tts?: boolean;
  mention_everyone?: boolean;
  mentions?: DiscordUser[];
  mention_roles?: string[];
  attachments?: Array<{ id: string; filename: string; url: string; size: number }>;
  embeds?: DiscordEmbed[];
  pinned?: boolean;
  type?: number;
}

export interface DiscordWebhook {
  id: string;
  type: number;
  guild_id?: string;
  channel_id: string;
  user?: DiscordUser;
  name: string | null;
  avatar: string | null;
  token?: string;
  url?: string;
}

export interface DiscordAuditLogEntry {
  id: string;
  action_type: number;
  user_id?: string | null;
  target_id?: string | null;
  reason?: string | null;
  changes?: Array<{
    key: string;
    new_value?: unknown;
    old_value?: unknown;
  }>;
  options?: Record<string, unknown>;
}

/**
 * Declarative Server Blueprint Plans
 */
export interface RolePlan {
  name: string;
  color?: string | number; // hex or int
  hoist?: boolean;
  mentionable?: boolean;
  permissions?: string[]; // Array of PermissionName keys or bitfield
}

export interface ChannelPlan {
  name: string;
  type: 'text' | 'voice' | 'announcement' | 'forum' | 'stage';
  topic?: string;
  nsfw?: boolean;
  slowmode?: number;
  user_limit?: number;
  bitrate?: number;
  category?: string; // Parent category name
  permissionOverwrites?: Array<{
    roleOrMemberName: string; // role name (e.g. '@everyone', 'Moderator')
    allow?: string[];
    deny?: string[];
  }>;
}

export interface CategoryPlan {
  name: string;
  channels: ChannelPlan[];
  permissionOverwrites?: Array<{
    roleOrMemberName: string;
    allow?: string[];
    deny?: string[];
  }>;
}

export interface ServerPlan {
  name?: string;
  description?: string;
  roles: RolePlan[];
  categories: CategoryPlan[];
  standaloneChannels?: ChannelPlan[];
}

export interface ServerPlanDiff {
  rolesToCreate: RolePlan[];
  rolesToUpdate: Array<{ existingRole: DiscordRole; plan: RolePlan }>;
  rolesUnchanged: string[];
  categoriesToCreate: string[];
  channelsToCreate: Array<ChannelPlan & { targetCategoryName?: string }>;
  channelsToUpdate: Array<{ existingChannel: DiscordChannel; plan: ChannelPlan }>;
  summary: {
    totalRolesToCreate: number;
    totalCategoriesToCreate: number;
    totalChannelsToCreate: number;
    destructiveWarnings: string[];
  };
}

export interface SecurityAuditIssue {
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  title: string;
  description: string;
  recommendation: string;
  affectedEntity?: {
    type: 'role' | 'channel' | 'server';
    id: string;
    name: string;
  };
}

export interface ServerAuditReport {
  guildId: string;
  guildName: string;
  auditedAt: string;
  overallScore: number; // 0 to 100
  securityIssues: SecurityAuditIssue[];
  metrics: {
    totalRoles: number;
    totalChannels: number;
    adminRoles: number;
    dangerousEveryonePermissions: string[];
    unprotectedVoiceChannels: number;
    channelsWithoutSlowmode: number;
  };
}
