import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir, platform } from 'node:os';
import { dirname, join } from 'node:path';
import type { HarnessAdapter, InstallResult, McpServerConfig } from './base.js';

export class ClaudeDesktopAdapter implements HarnessAdapter {
  public readonly id = 'claude-desktop';
  public readonly name = 'Claude Desktop';
  public readonly description = 'Anthropic Claude Desktop Application';

  public getConfigPath(): string {
    const osPlatform = platform();
    if (osPlatform === 'darwin') {
      return join(homedir(), 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
    }
    if (osPlatform === 'win32') {
      return join(process.env.APPDATA || join(homedir(), 'AppData', 'Roaming'), 'Claude', 'claude_desktop_config.json');
    }
    return join(homedir(), '.config', 'Claude', 'claude_desktop_config.json');
  }

  public async detect(): Promise<boolean> {
    const configPath = this.getConfigPath();
    const claudeDir = dirname(configPath);
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
        message: 'Successfully registered discord MCP server in Claude Desktop configuration.',
        configPath,
      };
    } catch (err: unknown) {
      return {
        success: false,
        message: 'Failed to write Claude Desktop configuration.',
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  public async uninstall(): Promise<InstallResult> {
    const configPath = this.getConfigPath();
    if (!existsSync(configPath)) {
      return { success: true, message: 'Claude Desktop configuration file not found.' };
    }
    try {
      const content = JSON.parse(readFileSync(configPath, 'utf8'));
      if (content.mcpServers && content.mcpServers['discord']) {
        delete content.mcpServers['discord'];
        writeFileSync(configPath, JSON.stringify(content, null, 2), 'utf8');
      }
      return { success: true, message: 'Successfully removed discord MCP server from Claude Desktop.' };
    } catch (err: unknown) {
      return {
        success: false,
        message: 'Failed to update Claude Desktop configuration.',
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
