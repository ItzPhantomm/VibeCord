import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import type { HarnessAdapter, InstallResult, McpServerConfig } from './base.js';

export class ClaudeCodeAdapter implements HarnessAdapter {
  public readonly id = 'claude-code';
  public readonly name = 'Claude Code';
  public readonly description = 'Anthropic Claude Code CLI harness';

  public getConfigPath(): string {
    return join(homedir(), '.claude.json');
  }

  public async detect(): Promise<boolean> {
    const configPath = this.getConfigPath();
    const claudeDir = join(homedir(), '.claude');
    return existsSync(configPath) || existsSync(claudeDir);
  }

  public async install(mcpConfig: McpServerConfig): Promise<InstallResult> {
    const configPath = this.getConfigPath();
    try {
      let content: Record<string, any> = {};
      if (existsSync(configPath)) {
        try {
          content = JSON.parse(readFileSync(configPath, 'utf8'));
        } catch {
          content = {};
        }
      } else {
        const dir = dirname(configPath);
        if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      }

      if (!content.mcpServers || typeof content.mcpServers !== 'object') {
        content.mcpServers = {};
      }

      content.mcpServers['discord'] = {
        command: mcpConfig.command,
        args: mcpConfig.args,
        env: mcpConfig.env,
      };

      writeFileSync(configPath, JSON.stringify(content, null, 2), 'utf8');

      return {
        success: true,
        message: 'Successfully registered discord MCP server in Claude Code configuration.',
        configPath,
      };
    } catch (err: unknown) {
      return {
        success: false,
        message: 'Failed to write to Claude Code configuration.',
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  public async uninstall(): Promise<InstallResult> {
    const configPath = this.getConfigPath();
    if (!existsSync(configPath)) {
      return { success: true, message: 'Claude Code configuration file not found.' };
    }
    try {
      const content = JSON.parse(readFileSync(configPath, 'utf8'));
      if (content.mcpServers && content.mcpServers['discord']) {
        delete content.mcpServers['discord'];
        writeFileSync(configPath, JSON.stringify(content, null, 2), 'utf8');
      }
      return { success: true, message: 'Successfully removed discord MCP server from Claude Code.' };
    } catch (err: unknown) {
      return {
        success: false,
        message: 'Failed to update Claude Code configuration.',
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  public getManualSnippet(config: McpServerConfig): string {
    return JSON.stringify(
      {
        mcpServers: {
          discord: {
            command: config.command,
            args: config.args,
            env: config.env,
          },
        },
      },
      null,
      2
    );
  }
}
