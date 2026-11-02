import pc from 'picocolors';
import { UI } from '../ui.js';
import { executeTool, getTool } from '../../tools/registry.js';
import { loadConfig } from '../../config/index.js';
import { DiscordClientWrapper } from '../../discord/client.js';

export interface ExecOptions {
  toolName: string;
  args?: Record<string, any>;
  jsonInput?: string;
  jsonOutput?: boolean;
}

export async function execCommand(toolName: string, rawOptions: Record<string, any>) {
  const tool = getTool(toolName);
  if (!tool) {
    console.error(pc.red(`Error: Tool "${toolName}" not found.`));
    console.error(pc.dim('Run "vibecord tools" to see all available tools.'));
    process.exit(1);
  }

  const config = loadConfig({ requireToken: true });
  const client = new DiscordClientWrapper({
    token: config.token,
    readOnly: config.readOnly,
    maxRetries: config.rateLimitMaxRetries,
    baseDelayMs: config.rateLimitBaseDelayMs,
  });

  let parsedParams: Record<string, any> = {};

  if (rawOptions.json) {
    try {
      parsedParams = JSON.parse(rawOptions.json);
    } catch (err) {
      console.error(pc.red(`Failed to parse --json argument: ${err instanceof Error ? err.message : String(err)}`));
      process.exit(1);
    }
  } else {
    // Extract flags that belong to the tool
    for (const [key, val] of Object.entries(rawOptions)) {
      if (key !== 'json' && key !== 'outputJson') {
        parsedParams[key] = val;
      }
    }
  }

  // Set default guild if omitted
  if (!parsedParams.guild_id && config.defaultGuildId) {
    parsedParams.guild_id = config.defaultGuildId;
  }

  const result = await executeTool(toolName, client, parsedParams, {
    defaultGuildId: config.defaultGuildId,
  });

  if (rawOptions.outputJson) {
    console.log(JSON.stringify(result, null, 2));
    if (!result.success) process.exit(1);
    return;
  }

  UI.banner();

  console.log(` Executing tool: ${pc.bold(pc.green(toolName))}`);
  console.log(` Category:       ${pc.cyan(tool.category)}`);
  console.log(` Execution time: ${pc.dim(`${result.metadata?.executionTimeMs}ms`)}\n`);

  if (!result.success) {
    console.log(` ${UI.badgeError(' EXECUTION FAILED ')} ${pc.red(result.error?.message || 'Unknown error')}`);
    if (result.error?.code) {
      console.log(`  Code:    ${pc.yellow(result.error.code)}`);
    }
    if (result.error?.details) {
      console.log(`  Details: ${pc.dim(JSON.stringify(result.error.details, null, 2))}`);
    }
    console.log();
    process.exit(1);
  }

  console.log(` ${UI.badgeSuccess(' SUCCESS ')} Output:`);
  console.log(pc.dim('─'.repeat(50)));
  console.log(JSON.stringify(result.data, null, 2));
  console.log(pc.dim('─'.repeat(50)));
  console.log();
}
