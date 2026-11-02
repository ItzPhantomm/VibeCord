import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  ALL_HARNESSES,
  getHarnessAdapter,
  detectInstalledHarnesses,
  getDefaultMcpConfig,
} from '../src/harnesses/index.js';
import { ClaudeCodeAdapter } from '../src/harnesses/claude-code.js';
import { AntigravityAdapter } from '../src/harnesses/antigravity.js';

describe('AI Coding Harness Adapters', () => {
  const testRoot = join(tmpdir(), `harness-test-${Date.now()}`);

  beforeEach(() => {
    mkdirSync(testRoot, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testRoot)) {
      rmSync(testRoot, { recursive: true, force: true });
    }
  });

  it('provides all 7 standard harness adapters', () => {
    const ids = ALL_HARNESSES.map(h => h.id);
    expect(ids).toContain('claude-code');
    expect(ids).toContain('antigravity');
    expect(ids).toContain('codex');
    expect(ids).toContain('hermes');
    expect(ids).toContain('openclaw');
    expect(ids).toContain('cursor');
    expect(ids).toContain('claude-desktop');
  });

  it('Claude Code adapter writes and removes MCP configuration', async () => {
    const adapter = new ClaudeCodeAdapter();
    const fakeConfigFile = join(testRoot, 'claude.json');
    vi.spyOn(adapter, 'getConfigPath').mockReturnValue(fakeConfigFile);

    const mcpConfig = getDefaultMcpConfig('vibecord');
    const installRes = await adapter.install(mcpConfig);

    expect(installRes.success).toBe(true);
    expect(existsSync(fakeConfigFile)).toBe(true);

    const written = JSON.parse(readFileSync(fakeConfigFile, 'utf8'));
    expect(written.mcpServers.discord).toBeDefined();
    expect(written.mcpServers.discord.command).toBe('vibecord');
    expect(written.mcpServers.discord.args).toEqual(['serve']);

    // Uninstall
    const uninstallRes = await adapter.uninstall();
    expect(uninstallRes.success).toBe(true);
    const afterUninstall = JSON.parse(readFileSync(fakeConfigFile, 'utf8'));
    expect(afterUninstall.mcpServers.discord).toBeUndefined();
  });

  it('Antigravity adapter generates tool schema files and instructions', async () => {
    const adapter = new AntigravityAdapter();
    const fakeMcpDir = join(testRoot, 'gemini', 'mcp', 'discord');
    vi.spyOn(adapter, 'getConfigPath').mockReturnValue(fakeMcpDir);

    const mcpConfig = getDefaultMcpConfig('vibecord');
    const installRes = await adapter.install(mcpConfig);

    expect(installRes.success).toBe(true);
    expect(existsSync(join(fakeMcpDir, 'instructions.md'))).toBe(true);
    expect(existsSync(join(fakeMcpDir, 'discord_send_message.json'))).toBe(true);
    expect(existsSync(join(fakeMcpDir, 'discord_list_servers.json'))).toBe(true);

    const schemaContent = JSON.parse(readFileSync(join(fakeMcpDir, 'discord_send_message.json'), 'utf8'));
    expect(schemaContent.name).toBe('discord_send_message');
    expect(schemaContent.parameters.type).toBe('object');

    // Uninstall
    const uninstallRes = await adapter.uninstall();
    expect(uninstallRes.success).toBe(true);
    expect(existsSync(join(fakeMcpDir, 'discord_send_message.json'))).toBe(false);
  });

  it('generates non-empty manual configuration snippets for all harnesses', () => {
    const mcpConfig = getDefaultMcpConfig('vibecord');
    for (const harness of ALL_HARNESSES) {
      const snippet = harness.getManualSnippet(mcpConfig);
      expect(snippet).toBeTruthy();
      expect(snippet.length).toBeGreaterThan(10);
    }
  });
});
