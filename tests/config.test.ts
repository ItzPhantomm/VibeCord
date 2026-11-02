import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, unlinkSync, mkdirSync, rmdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  loadConfig,
  saveConfig,
  redactToken,
  redactSecretsInObject,
  checkFilePermissions,
  ConfigSchema,
} from '../src/config/index.js';

describe('Configuration & Security Module', () => {
  const testDir = join(tmpdir(), `vibecord-test-${Date.now()}`);
  const testConfigFile = join(testDir, 'config.json');

  beforeEach(() => {
    process.env.VIBECORD_CONFIG_DIR = testDir;
    process.env.VIBECORD_CONFIG_FILE = testConfigFile;
    delete process.env.DISCORD_TOKEN;
    delete process.env.DISCORD_DEFAULT_GUILD_ID;
    delete process.env.VIBECORD_READ_ONLY;
    delete process.env.DISCORD_BRIDGE_READ_ONLY;
  });

  afterEach(() => {
    if (existsSync(testConfigFile)) {
      unlinkSync(testConfigFile);
    }
    if (existsSync(testDir)) {
      rmdirSync(testDir);
    }
    delete process.env.VIBECORD_CONFIG_DIR;
    delete process.env.VIBECORD_CONFIG_FILE;
    delete process.env.DISCORD_BRIDGE_CONFIG_DIR;
    delete process.env.DISCORD_BRIDGE_CONFIG_FILE;
  });

  it('redacts tokens properly', () => {
    expect(redactToken('MTE4OTM0NTY3ODkwMTIzNDU2Nw.GYzX89.abc123XYZ')).toBe('MTE4OT...3XYZ');
    expect(redactToken('short')).toBe('****');
    expect(redactToken('')).toBe('[NOT_SET]');
    expect(redactToken(null)).toBe('[NOT_SET]');
    expect(redactToken(undefined)).toBe('[NOT_SET]');
  });

  it('deeply redacts secrets in objects', () => {
    const raw = {
      user: 'alice',
      token: 'super_secret_discord_token_123456789',
      bot_secret: 'nested_secret_key_abcdef123456',
      settings: {
        api_password: 'nested_password_value_98765',
        theme: 'dark',
      },
      list: [{ auth_token: 'array_token_value_xyz' }],
    };

    const redacted = redactSecretsInObject(raw);
    expect(redacted.user).toBe('alice');
    expect(redacted.settings.theme).toBe('dark');
    expect(redacted.token).toContain('...');
    expect(redacted.bot_secret).toContain('...');
    expect(redacted.settings.api_password).toContain('...');
    expect(redacted.list[0].auth_token).toContain('...');
  });

  it('saves and loads configuration with 0600 file permissions', () => {
    const saved = saveConfig({
      token: 'test_token_1234567890_abcdef',
      defaultGuildId: '123456789012345678',
      readOnly: true,
      logLevel: 'debug',
    });

    expect(saved.token).toBe('test_token_1234567890_abcdef');
    expect(saved.defaultGuildId).toBe('123456789012345678');
    expect(saved.readOnly).toBe(true);
    expect(saved.logLevel).toBe('debug');

    const perm = checkFilePermissions(testConfigFile);
    expect(perm.secure).toBe(true);

    const loaded = loadConfig({ requireToken: true });
    expect(loaded.token).toBe('test_token_1234567890_abcdef');
    expect(loaded.defaultGuildId).toBe('123456789012345678');
    expect(loaded.readOnly).toBe(true);
  });

  it('environment variables take precedence over config file', () => {
    saveConfig({
      token: 'file_token',
      defaultGuildId: 'file_guild',
      readOnly: false,
    });

    process.env.DISCORD_TOKEN = 'env_token_override';
    process.env.DISCORD_GUILD_ID = 'env_guild_override';
    process.env.VIBECORD_READ_ONLY = 'true';

    const loaded = loadConfig();
    expect(loaded.token).toBe('env_token_override');
    expect(loaded.defaultGuildId).toBe('env_guild_override');
    expect(loaded.readOnly).toBe(true);
  });
});
