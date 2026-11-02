import { existsSync, mkdirSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { HarnessAdapter, InstallResult, McpServerConfig } from './base.js';
import { ALL_TOOLS, zodToJsonSchema } from '../tools/registry.js';

export class AntigravityAdapter implements HarnessAdapter {
  public readonly id = 'antigravity';
  public readonly name = 'Antigravity / Gemini CLI';
  public readonly description = 'Google DeepMind Antigravity CLI harness';

  public getConfigPath(): string {
    const appData = process.env.ANTIGRAVITY_APP_DATA || join(homedir(), '.gemini', 'antigravity-cli');
    return join(appData, 'mcp', 'discord');
  }

  public async detect(): Promise<boolean> {
    const appData = process.env.ANTIGRAVITY_APP_DATA || join(homedir(), '.gemini', 'antigravity-cli');
    return existsSync(appData);
  }

  public async install(_mcpConfig: McpServerConfig): Promise<InstallResult> {
    const targetDir = this.getConfigPath();
    try {
      if (!existsSync(targetDir)) {
        mkdirSync(targetDir, { recursive: true });
      }

      // Generate tool schema files for all Discord tools
      for (const tool of ALL_TOOLS) {
        const schema = zodToJsonSchema(tool.parameters);
        const fileContent = {
          name: tool.name,
          description: tool.description,
          parameters: schema,
        };

        const filePath = join(targetDir, `${tool.name}.json`);
        writeFileSync(filePath, JSON.stringify(fileContent, null, 2), 'utf8');
      }

      // Write instructions.md for Antigravity
      const instructions = `# VibeCord MCP Instructions

This MCP server provides full control over Discord servers, channels, roles, messages, threads, webhooks, and moderation.

## Guidelines
- Check bot permissions before running administrative actions.
- Destructive operations (such as channel deletion, role deletion, or bans) require explicit confirmation (\`confirm: true\`).
- When designing or reorganizing servers, use \`discord_design_server\` and \`discord_preview_server_plan\` before invoking \`discord_apply_server_plan\`.
`;
      writeFileSync(join(targetDir, 'instructions.md'), instructions, 'utf8');

      return {
        success: true,
        message: `Successfully installed ${ALL_TOOLS.length} Discord tool schemas into Antigravity MCP directory.`,
        configPath: targetDir,
      };
    } catch (err: unknown) {
      return {
        success: false,
        message: 'Failed to write Antigravity MCP schemas.',
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  public async uninstall(): Promise<InstallResult> {
    const targetDir = this.getConfigPath();
    if (!existsSync(targetDir)) {
      return { success: true, message: 'Antigravity Discord MCP directory not found.' };
    }
    try {
      const files = readdirSync(targetDir);
      for (const file of files) {
        unlinkSync(join(targetDir, file));
      }
      return { success: true, message: 'Successfully removed Discord MCP tools from Antigravity.' };
    } catch (err: unknown) {
      return {
        success: false,
        message: 'Failed to clean Antigravity MCP directory.',
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  public getManualSnippet(_config: McpServerConfig): string {
    return `# Antigravity CLI MCP Registration
Run 'vibecord connect --harness antigravity' to automatically generate schemas in:
~/.gemini/antigravity-cli/mcp/discord/`;
  }
}
