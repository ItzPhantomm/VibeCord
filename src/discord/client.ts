import { REST, Routes } from 'discord.js';
import { DiscordBridgeError, ErrorCode, classifyError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import type {
  DiscordChannel,
  DiscordGuild,
  DiscordMember,
  DiscordMessage,
  DiscordRole,
  DiscordUser,
  DiscordWebhook,
  DiscordAuditLogEntry,
} from './types.js';

export interface ClientOptions {
  token: string;
  readOnly?: boolean;
  maxRetries?: number;
  baseDelayMs?: number;
}

export class DiscordClientWrapper {
  private rest: REST;
  private token: string;
  public readonly readOnly: boolean;
  private maxRetries: number;
  private baseDelayMs: number;
  private cachedUser?: DiscordUser;

  constructor(options: ClientOptions) {
    if (!options.token) {
      throw new DiscordBridgeError(
        'Discord token must be provided to initialize DiscordClientWrapper.',
        ErrorCode.AUTH_ERROR
      );
    }
    this.token = options.token.trim();
    this.readOnly = Boolean(options.readOnly);
    this.maxRetries = options.maxRetries ?? 3;
    this.baseDelayMs = options.baseDelayMs ?? 1000;

    this.rest = new REST({ version: '10', rejectOnRateLimit: () => false }).setToken(this.token);
  }

  private checkReadOnly(operationName: string) {
    if (this.readOnly) {
      throw new DiscordBridgeError(
        `Operation "${operationName}" rejected: Bridge is operating in read-only mode.`,
        ErrorCode.OPERATION_ABORTED
      );
    }
  }

  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    let attempts = 0;
    while (true) {
      attempts++;
      try {
        return await operation();
      } catch (err: unknown) {
        const classified = classifyError(err);

        // Check if rate limited and within retry limits
        if (classified.code === ErrorCode.RATE_LIMITED && attempts <= this.maxRetries) {
          const waitMs = classified.retryAfterMs || this.baseDelayMs * Math.pow(2, attempts - 1);
          logger.warn(`Rate limit hit on "${operationName}". Retrying in ${(waitMs / 1000).toFixed(1)}s (attempt ${attempts}/${this.maxRetries})...`);
          await new Promise(resolve => setTimeout(resolve, waitMs));
          continue;
        }

        logger.debug(`Discord API error on "${operationName}": ${classified.message}`);
        throw classified;
      }
    }
  }

  // --- Connection & Identity ---

  public async getBotUser(): Promise<DiscordUser> {
    if (this.cachedUser) return this.cachedUser;
    const user = await this.executeWithRetry(
      () => this.rest.get(Routes.user('@me')) as Promise<DiscordUser>,
      'getBotUser'
    );
    this.cachedUser = user;
    return user;
  }

  public async getApplication(): Promise<{ id: string; name: string; description: string; bot_public: boolean }> {
    return this.executeWithRetry(
      () => this.rest.get(Routes.oauth2CurrentApplication()) as Promise<any>,
      'getApplication'
    );
  }

  public async testConnection(): Promise<{
    ok: boolean;
    botUser: DiscordUser;
    latencyMs: number;
    guildsCount: number;
  }> {
    const start = Date.now();
    const botUser = await this.getBotUser();
    const guilds = await this.listGuilds();
    const latencyMs = Date.now() - start;

    return {
      ok: true,
      botUser,
      latencyMs,
      guildsCount: guilds.length,
    };
  }

  // --- Server / Guild Operations ---

  public async listGuilds(): Promise<DiscordGuild[]> {
    return this.executeWithRetry(
      () => this.rest.get(Routes.userGuilds()) as Promise<DiscordGuild[]>,
      'listGuilds'
    );
  }

  public async getGuild(guildId: string): Promise<DiscordGuild> {
    return this.executeWithRetry(
      () => this.rest.get(Routes.guild(guildId), { query: new URLSearchParams({ with_counts: 'true' }) }) as Promise<DiscordGuild>,
      `getGuild(${guildId})`
    );
  }

  public async modifyGuild(guildId: string, data: Partial<DiscordGuild>, reason?: string): Promise<DiscordGuild> {
    this.checkReadOnly('modifyGuild');
    return this.executeWithRetry(
      () => this.rest.patch(Routes.guild(guildId), {
        body: data,
        headers: reason ? { 'X-Audit-Log-Reason': encodeURIComponent(reason) } : undefined,
      }) as Promise<DiscordGuild>,
      `modifyGuild(${guildId})`
    );
  }

  public async getGuildAuditLogs(
    guildId: string,
    options: { action_type?: number; user_id?: string; limit?: number; before?: string } = {}
  ): Promise<{ audit_log_entries: DiscordAuditLogEntry[]; users: DiscordUser[] }> {
    const query = new URLSearchParams();
    if (options.action_type !== undefined) query.set('action_type', String(options.action_type));
    if (options.user_id) query.set('user_id', options.user_id);
    if (options.limit) query.set('limit', String(Math.min(options.limit, 100)));
    if (options.before) query.set('before', options.before);

    return this.executeWithRetry(
      () => this.rest.get(Routes.guildAuditLog(guildId), { query }) as Promise<any>,
      `getGuildAuditLogs(${guildId})`
    );
  }

  // --- Channel Operations ---

  public async listGuildChannels(guildId: string): Promise<DiscordChannel[]> {
    return this.executeWithRetry(
      () => this.rest.get(Routes.guildChannels(guildId)) as Promise<DiscordChannel[]>,
      `listGuildChannels(${guildId})`
    );
  }

  public async getChannel(channelId: string): Promise<DiscordChannel> {
    return this.executeWithRetry(
      () => this.rest.get(Routes.channel(channelId)) as Promise<DiscordChannel>,
      `getChannel(${channelId})`
    );
  }

  public async createChannel(guildId: string, data: Record<string, any>, reason?: string): Promise<DiscordChannel> {
    this.checkReadOnly('createChannel');
    return this.executeWithRetry(
      () => this.rest.post(Routes.guildChannels(guildId), {
        body: data,
        headers: reason ? { 'X-Audit-Log-Reason': encodeURIComponent(reason) } : undefined,
      }) as Promise<DiscordChannel>,
      `createChannel(${guildId}, ${data.name})`
    );
  }

  public async modifyChannel(channelId: string, data: Record<string, any>, reason?: string): Promise<DiscordChannel> {
    this.checkReadOnly('modifyChannel');
    return this.executeWithRetry(
      () => this.rest.patch(Routes.channel(channelId), {
        body: data,
        headers: reason ? { 'X-Audit-Log-Reason': encodeURIComponent(reason) } : undefined,
      }) as Promise<DiscordChannel>,
      `modifyChannel(${channelId})`
    );
  }

  public async deleteChannel(channelId: string, reason?: string): Promise<DiscordChannel> {
    this.checkReadOnly('deleteChannel');
    return this.executeWithRetry(
      () => this.rest.delete(Routes.channel(channelId), {
        headers: reason ? { 'X-Audit-Log-Reason': encodeURIComponent(reason) } : undefined,
      }) as Promise<DiscordChannel>,
      `deleteChannel(${channelId})`
    );
  }

  public async setChannelPermission(
    channelId: string,
    overwriteId: string,
    data: { type: 0 | 1; allow: string; deny: string },
    reason?: string
  ): Promise<void> {
    this.checkReadOnly('setChannelPermission');
    await this.executeWithRetry(
      () => this.rest.put(Routes.channelPermission(channelId, overwriteId), {
        body: data,
        headers: reason ? { 'X-Audit-Log-Reason': encodeURIComponent(reason) } : undefined,
      }),
      `setChannelPermission(${channelId}, ${overwriteId})`
    );
  }

  public async deleteChannelPermission(channelId: string, overwriteId: string, reason?: string): Promise<void> {
    this.checkReadOnly('deleteChannelPermission');
    await this.executeWithRetry(
      () => this.rest.delete(Routes.channelPermission(channelId, overwriteId), {
        headers: reason ? { 'X-Audit-Log-Reason': encodeURIComponent(reason) } : undefined,
      }),
      `deleteChannelPermission(${channelId}, ${overwriteId})`
    );
  }

  // --- Role Operations ---

  public async listGuildRoles(guildId: string): Promise<DiscordRole[]> {
    return this.executeWithRetry(
      () => this.rest.get(Routes.guildRoles(guildId)) as Promise<DiscordRole[]>,
      `listGuildRoles(${guildId})`
    );
  }

  public async createRole(guildId: string, data: Record<string, any>, reason?: string): Promise<DiscordRole> {
    this.checkReadOnly('createRole');
    return this.executeWithRetry(
      () => this.rest.post(Routes.guildRoles(guildId), {
        body: data,
        headers: reason ? { 'X-Audit-Log-Reason': encodeURIComponent(reason) } : undefined,
      }) as Promise<DiscordRole>,
      `createRole(${guildId}, ${data.name})`
    );
  }

  public async modifyRole(guildId: string, roleId: string, data: Record<string, any>, reason?: string): Promise<DiscordRole> {
    this.checkReadOnly('modifyRole');
    return this.executeWithRetry(
      () => this.rest.patch(Routes.guildRole(guildId, roleId), {
        body: data,
        headers: reason ? { 'X-Audit-Log-Reason': encodeURIComponent(reason) } : undefined,
      }) as Promise<DiscordRole>,
      `modifyRole(${guildId}, ${roleId})`
    );
  }

  public async deleteRole(guildId: string, roleId: string, reason?: string): Promise<void> {
    this.checkReadOnly('deleteRole');
    await this.executeWithRetry(
      () => this.rest.delete(Routes.guildRole(guildId, roleId), {
        headers: reason ? { 'X-Audit-Log-Reason': encodeURIComponent(reason) } : undefined,
      }),
      `deleteRole(${guildId}, ${roleId})`
    );
  }

  public async assignRoleToMember(guildId: string, userId: string, roleId: string, reason?: string): Promise<void> {
    this.checkReadOnly('assignRoleToMember');
    await this.executeWithRetry(
      () => this.rest.put(Routes.guildMemberRole(guildId, userId, roleId), {
        headers: reason ? { 'X-Audit-Log-Reason': encodeURIComponent(reason) } : undefined,
      }),
      `assignRoleToMember(${guildId}, ${userId}, ${roleId})`
    );
  }

  public async removeRoleFromMember(guildId: string, userId: string, roleId: string, reason?: string): Promise<void> {
    this.checkReadOnly('removeRoleFromMember');
    await this.executeWithRetry(
      () => this.rest.delete(Routes.guildMemberRole(guildId, userId, roleId), {
        headers: reason ? { 'X-Audit-Log-Reason': encodeURIComponent(reason) } : undefined,
      }),
      `removeRoleFromMember(${guildId}, ${userId}, ${roleId})`
    );
  }

  // --- Member Operations ---

  public async listGuildMembers(guildId: string, options: { limit?: number; after?: string } = {}): Promise<DiscordMember[]> {
    const query = new URLSearchParams();
    if (options.limit) query.set('limit', String(Math.min(options.limit, 1000)));
    if (options.after) query.set('after', options.after);

    return this.executeWithRetry(
      () => this.rest.get(Routes.guildMembers(guildId), { query }) as Promise<DiscordMember[]>,
      `listGuildMembers(${guildId})`
    );
  }

  public async getGuildMember(guildId: string, userId: string): Promise<DiscordMember> {
    return this.executeWithRetry(
      () => this.rest.get(Routes.guildMember(guildId, userId)) as Promise<DiscordMember>,
      `getGuildMember(${guildId}, ${userId})`
    );
  }

  public async timeoutMember(guildId: string, userId: string, durationSeconds: number | null, reason?: string): Promise<DiscordMember> {
    this.checkReadOnly('timeoutMember');
    const communication_disabled_until = durationSeconds && durationSeconds > 0
      ? new Date(Date.now() + durationSeconds * 1000).toISOString()
      : null;

    return this.executeWithRetry(
      () => this.rest.patch(Routes.guildMember(guildId, userId), {
        body: { communication_disabled_until },
        headers: reason ? { 'X-Audit-Log-Reason': encodeURIComponent(reason) } : undefined,
      }) as Promise<DiscordMember>,
      `timeoutMember(${guildId}, ${userId})`
    );
  }

  public async kickMember(guildId: string, userId: string, reason?: string): Promise<void> {
    this.checkReadOnly('kickMember');
    await this.executeWithRetry(
      () => this.rest.delete(Routes.guildMember(guildId, userId), {
        headers: reason ? { 'X-Audit-Log-Reason': encodeURIComponent(reason) } : undefined,
      }),
      `kickMember(${guildId}, ${userId})`
    );
  }

  public async banMember(
    guildId: string,
    userId: string,
    options: { delete_message_seconds?: number; reason?: string } = {}
  ): Promise<void> {
    this.checkReadOnly('banMember');
    await this.executeWithRetry(
      () => this.rest.put(Routes.guildBan(guildId, userId), {
        body: { delete_message_seconds: options.delete_message_seconds ?? 0 },
        headers: options.reason ? { 'X-Audit-Log-Reason': encodeURIComponent(options.reason) } : undefined,
      }),
      `banMember(${guildId}, ${userId})`
    );
  }

  public async unbanMember(guildId: string, userId: string, reason?: string): Promise<void> {
    this.checkReadOnly('unbanMember');
    await this.executeWithRetry(
      () => this.rest.delete(Routes.guildBan(guildId, userId), {
        headers: reason ? { 'X-Audit-Log-Reason': encodeURIComponent(reason) } : undefined,
      }),
      `unbanMember(${guildId}, ${userId})`
    );
  }

  // --- Message Operations ---

  public async listMessages(channelId: string, options: { limit?: number; before?: string; after?: string; around?: string } = {}): Promise<DiscordMessage[]> {
    const query = new URLSearchParams();
    if (options.limit) query.set('limit', String(Math.min(options.limit, 100)));
    if (options.before) query.set('before', options.before);
    if (options.after) query.set('after', options.after);
    if (options.around) query.set('around', options.around);

    return this.executeWithRetry(
      () => this.rest.get(Routes.channelMessages(channelId), { query }) as Promise<DiscordMessage[]>,
      `listMessages(${channelId})`
    );
  }

  public async getMessage(channelId: string, messageId: string): Promise<DiscordMessage> {
    return this.executeWithRetry(
      () => this.rest.get(Routes.channelMessage(channelId, messageId)) as Promise<DiscordMessage>,
      `getMessage(${channelId}, ${messageId})`
    );
  }

  public async sendMessage(channelId: string, data: { content?: string; embeds?: any[]; message_reference?: any; components?: any[] }): Promise<DiscordMessage> {
    this.checkReadOnly('sendMessage');
    return this.executeWithRetry(
      () => this.rest.post(Routes.channelMessages(channelId), { body: data }) as Promise<DiscordMessage>,
      `sendMessage(${channelId})`
    );
  }

  public async editMessage(channelId: string, messageId: string, data: { content?: string; embeds?: any[]; components?: any[] }): Promise<DiscordMessage> {
    this.checkReadOnly('editMessage');
    return this.executeWithRetry(
      () => this.rest.patch(Routes.channelMessage(channelId, messageId), { body: data }) as Promise<DiscordMessage>,
      `editMessage(${channelId}, ${messageId})`
    );
  }

  public async deleteMessage(channelId: string, messageId: string, reason?: string): Promise<void> {
    this.checkReadOnly('deleteMessage');
    await this.executeWithRetry(
      () => this.rest.delete(Routes.channelMessage(channelId, messageId), {
        headers: reason ? { 'X-Audit-Log-Reason': encodeURIComponent(reason) } : undefined,
      }),
      `deleteMessage(${channelId}, ${messageId})`
    );
  }

  public async pinMessage(channelId: string, messageId: string, reason?: string): Promise<void> {
    this.checkReadOnly('pinMessage');
    await this.executeWithRetry(
      () => this.rest.put(Routes.channelPin(channelId, messageId), {
        headers: reason ? { 'X-Audit-Log-Reason': encodeURIComponent(reason) } : undefined,
      }),
      `pinMessage(${channelId}, ${messageId})`
    );
  }

  public async unpinMessage(channelId: string, messageId: string, reason?: string): Promise<void> {
    this.checkReadOnly('unpinMessage');
    await this.executeWithRetry(
      () => this.rest.delete(Routes.channelPin(channelId, messageId), {
        headers: reason ? { 'X-Audit-Log-Reason': encodeURIComponent(reason) } : undefined,
      }),
      `unpinMessage(${channelId}, ${messageId})`
    );
  }

  public async addReaction(channelId: string, messageId: string, emoji: string): Promise<void> {
    this.checkReadOnly('addReaction');
    await this.executeWithRetry(
      () => this.rest.put(Routes.channelMessageOwnReaction(channelId, messageId, encodeURIComponent(emoji))),
      `addReaction(${channelId}, ${messageId}, ${emoji})`
    );
  }

  public async removeReaction(channelId: string, messageId: string, emoji: string, userId: string = '@me'): Promise<void> {
    this.checkReadOnly('removeReaction');
    await this.executeWithRetry(
      () => this.rest.delete(Routes.channelMessageUserReaction(channelId, messageId, encodeURIComponent(emoji), userId)),
      `removeReaction(${channelId}, ${messageId}, ${emoji})`
    );
  }

  // --- Thread & Forum Operations ---

  public async createThread(
    channelId: string,
    data: { name: string; auto_archive_duration?: number; type?: number; message_id?: string; reason?: string }
  ): Promise<DiscordChannel> {
    this.checkReadOnly('createThread');
    const { message_id, reason, ...body } = data;
    const endpoint = message_id
      ? Routes.threads(channelId, message_id)
      : Routes.threads(channelId);

    return this.executeWithRetry(
      () => this.rest.post(endpoint, {
        body,
        headers: reason ? { 'X-Audit-Log-Reason': encodeURIComponent(reason) } : undefined,
      }) as Promise<DiscordChannel>,
      `createThread(${channelId}, ${data.name})`
    );
  }

  public async listActiveThreads(guildId: string): Promise<{ threads: DiscordChannel[]; members: any[] }> {
    return this.executeWithRetry(
      () => this.rest.get(Routes.guildActiveThreads(guildId)) as Promise<any>,
      `listActiveThreads(${guildId})`
    );
  }

  // --- Webhook Operations ---

  public async listChannelWebhooks(channelId: string): Promise<DiscordWebhook[]> {
    return this.executeWithRetry(
      () => this.rest.get(Routes.channelWebhooks(channelId)) as Promise<DiscordWebhook[]>,
      `listChannelWebhooks(${channelId})`
    );
  }

  public async listGuildWebhooks(guildId: string): Promise<DiscordWebhook[]> {
    return this.executeWithRetry(
      () => this.rest.get(Routes.guildWebhooks(guildId)) as Promise<DiscordWebhook[]>,
      `listGuildWebhooks(${guildId})`
    );
  }

  public async createWebhook(channelId: string, data: { name: string; avatar?: string; reason?: string }): Promise<DiscordWebhook> {
    this.checkReadOnly('createWebhook');
    const { reason, ...body } = data;
    return this.executeWithRetry(
      () => this.rest.post(Routes.channelWebhooks(channelId), {
        body,
        headers: reason ? { 'X-Audit-Log-Reason': encodeURIComponent(reason) } : undefined,
      }) as Promise<DiscordWebhook>,
      `createWebhook(${channelId}, ${data.name})`
    );
  }

  public async executeWebhook(
    webhookId: string,
    webhookToken: string,
    data: { content?: string; embeds?: any[]; username?: string; avatar_url?: string }
  ): Promise<DiscordMessage | null> {
    this.checkReadOnly('executeWebhook');
    return this.executeWithRetry(
      () => this.rest.post(Routes.webhook(webhookId, webhookToken), {
        body: data,
        query: new URLSearchParams({ wait: 'true' }),
      }) as Promise<DiscordMessage>,
      `executeWebhook(${webhookId})`
    );
  }

  public async deleteWebhook(webhookId: string, reason?: string): Promise<void> {
    this.checkReadOnly('deleteWebhook');
    await this.executeWithRetry(
      () => this.rest.delete(Routes.webhook(webhookId), {
        headers: reason ? { 'X-Audit-Log-Reason': encodeURIComponent(reason) } : undefined,
      }),
      `deleteWebhook(${webhookId})`
    );
  }
}
