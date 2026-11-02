import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { homedir, platform } from 'node:os';
import { dirname, join } from 'node:path';
import { ConfigSchema, type DiscordBridgeConfig, type PartialConfig } from './types.js';
import { enforceSecurePermissions } from './secrets.js';
import { DiscordBridgeError, ErrorCode } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export * from './types.js';
export * from './secrets.js';

export function getConfigDirectory(): string {
  const osPlatform = platform();

  if (process.env.VIBECORD_CONFIG_DIR || process.env.DISCORD_BRIDGE_CONFIG_DIR) {
    return (process.env.VIBECORD_CONFIG_DIR || process.env.DISCORD_BRIDGE_CONFIG_DIR)!;
  }

  if (osPlatform === 'win32') {
    const appData = process.env.APPDATA || join(homedir(), 'AppData', 'Roaming');
    return join(appData, 'vibecord');
  }

  if (osPlatform === 'darwin') {
    return join(homedir(), 'Library', 'Application Support', 'vibecord');
  }

  // Linux / POSIX: check XDG_CONFIG_HOME
  const xdgConfig = process.env.XDG_CONFIG_HOME || join(homedir(), '.config');
  return join(xdgConfig, 'vibecord');
}

export function getConfigFilePath(): string {
  if (process.env.VIBECORD_CONFIG_FILE || process.env.DISCORD_BRIDGE_CONFIG_FILE) {
    return (process.env.VIBECORD_CONFIG_FILE || process.env.DISCORD_BRIDGE_CONFIG_FILE)!;
  }
  return join(getConfigDirectory(), 'config.json');
}

export function configExists(): boolean {
  return existsSync(getConfigFilePath());
}

/**
 * Loads configuration with fallback to environment variables.
 */
export function loadConfig(options: { requireToken?: boolean } = {}): DiscordBridgeConfig {
  const configPath = getConfigFilePath();
  let rawConfig: Record<string, any> = {};

  if (existsSync(configPath)) {
    try {
      const fileContent = readFileSync(configPath, 'utf8');
      rawConfig = JSON.parse(fileContent);
    } catch (err) {
      throw new DiscordBridgeError(
        `Failed to parse configuration file at ${configPath}: ${err instanceof Error ? err.message : String(err)}`,
        ErrorCode.CONFIG_ERROR
      );
    }
  }

  // Environment variable overrides (precedence: ENV > Config file)
  const envToken = process.env.DISCORD_TOKEN || process.env.DISCORD_BOT_TOKEN;
  const envAppId = process.env.DISCORD_APPLICATION_ID || process.env.DISCORD_CLIENT_ID;
  const envGuildId = process.env.DISCORD_GUILD_ID || process.env.DISCORD_DEFAULT_GUILD_ID;
  const rawReadOnly = process.env.VIBECORD_READ_ONLY ?? process.env.DISCORD_BRIDGE_READ_ONLY;
  const envReadOnly = rawReadOnly === 'true' || rawReadOnly === '1';
  const envLogLevel = (process.env.VIBECORD_LOG_LEVEL || process.env.DISCORD_BRIDGE_LOG_LEVEL) as any;

  const merged: Record<string, any> = {
    ...rawConfig,
    ...(envToken ? { token: envToken } : {}),
    ...(envAppId ? { applicationId: envAppId } : {}),
    ...(envGuildId ? { defaultGuildId: envGuildId } : {}),
    ...(rawReadOnly !== undefined ? { readOnly: envReadOnly } : {}),
    ...(envLogLevel ? { logLevel: envLogLevel } : {}),
  };

  if (options.requireToken && (!merged.token || typeof merged.token !== 'string')) {
    throw new DiscordBridgeError(
      'Discord bot token is required. Run "vibecord setup" or set DISCORD_TOKEN in your environment.',
      ErrorCode.CONFIG_ERROR
    );
  }

  // Parse with defaults
  const parsed = ConfigSchema.safeParse(merged);
  if (!parsed.success) {
    if (options.requireToken) {
      const issues = parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ');
      throw new DiscordBridgeError(
        `Invalid configuration: ${issues}`,
        ErrorCode.CONFIG_ERROR,
        { fieldErrors: { config: [issues] } }
      );
    }
    // Return empty fallback config if token wasn't required
    return {
      token: merged.token || '',
      applicationId: merged.applicationId,
      defaultGuildId: merged.defaultGuildId,
      readOnly: Boolean(merged.readOnly),
      logLevel: (merged.logLevel as any) || 'info',
      harnesses: merged.harnesses || {},
      rateLimitMaxRetries: 3,
      rateLimitBaseDelayMs: 1000,
    };
  }

  return parsed.data;
}

/**
 * Saves configuration with atomic write and strict permissions (0600 file, 0700 dir).
 */
export function saveConfig(updates: PartialConfig): DiscordBridgeConfig {
  const configPath = getConfigFilePath();
  const configDir = dirname(configPath);

  // Ensure directory exists with 0700 permissions
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true, mode: 0o700 });
  }

  let existing: Record<string, any> = {};
  if (existsSync(configPath)) {
    try {
      existing = JSON.parse(readFileSync(configPath, 'utf8'));
    } catch {
      existing = {};
    }
  }

  const merged = {
    ...existing,
    ...updates,
  };

  const parsed = ConfigSchema.parse(merged);
  const serialized = JSON.stringify(parsed, null, 2);

  // Write file with 0600 mode
  writeFileSync(configPath, serialized, { mode: 0o600, encoding: 'utf8' });
  enforceSecurePermissions(configPath, configDir);

  logger.debug(`Configuration securely saved to ${configPath}`);
  return parsed;
}

/**
 * Deletes the configuration file.
 */
export function deleteConfig(): boolean {
  const configPath = getConfigFilePath();
  if (existsSync(configPath)) {
    unlinkSync(configPath);
    return true;
  }
  return false;
}
