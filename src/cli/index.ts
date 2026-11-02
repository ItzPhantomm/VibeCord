import { Command } from 'commander';
import { setupCommand } from './commands/setup.js';
import { doctorCommand } from './commands/doctor.js';
import { connectCommand } from './commands/connect.js';
import { statusCommand } from './commands/status.js';
import { toolsCommand } from './commands/tools.js';
import { execCommand } from './commands/exec.js';
import {
  planDesignCommand,
  planAuditCommand,
  planBackupCommand,
  planPreviewCommand,
  planApplyCommand,
  planVerifyCommand,
} from './commands/plan.js';
import { startMcpStdioServer } from '../mcp/server.js';
import { setLogLevel } from '../utils/logger.js';

const program = new Command();

program
  .name('vibecord')
  .description('Universal Discord tool layer & MCP server for AI coding harnesses')
  .version('1.0.0')
  .option('--verbose', 'Enable verbose debug logging to stderr')
  .option('--silent', 'Suppress all logging output to stderr')
  .hook('preAction', (thisCommand) => {
    const opts = thisCommand.opts();
    if (opts.verbose) setLogLevel('debug');
    if (opts.silent) setLogLevel('silent');
  });

// 1. Setup Command
program
  .command('setup')
  .description('Run interactive or automated setup to configure bot credentials and connect harnesses')
  .option('-t, --token <token>', 'Discord bot token')
  .option('-g, --guild-id <guildId>', 'Default Discord server ID')
  .option('-r, --read-only', 'Run in read-only mode (prevent accidental destructive mutations)')
  .option('-H, --harness <harnessId>', 'Auto-configure a specific harness (claude-code, antigravity, codex, etc.)')
  .option('--non-interactive', 'Run in headless non-interactive mode without prompts')
  .option('-y, --yes', 'Automatically confirm prompts')
  .action(async (opts) => {
    await setupCommand(opts);
  });

// 2. Doctor Command
program
  .command('doctor')
  .description('Run diagnostic checks on Discord token, permissions, network, and harness configurations')
  .action(async () => {
    await doctorCommand();
  });

// 3. Connect Command
program
  .command('connect')
  .description('Detect and configure AI harness integrations (Claude Code, Antigravity, Codex, Hermes, OpenClaw, Cursor)')
  .option('-H, --harness <id>', 'Specific harness to connect or manage')
  .option('-d, --disconnect', 'Remove MCP configuration from harness')
  .option('-m, --manual', 'Display copy-paste manual configuration snippet')
  .action(async (opts) => {
    await connectCommand(opts);
  });

// 4. Status Command
program
  .command('status')
  .description('Display authenticated bot profile, latency, and joined servers')
  .option('-g, --guild-id <id>', 'Inspect a specific guild')
  .option('--json', 'Output raw JSON')
  .action(async (opts) => {
    await statusCommand(opts);
  });

// 5. Tools Catalog Command
program
  .command('tools')
  .description('List all available Discord tools, categories, permissions, and parameters')
  .option('-c, --category <category>', 'Filter by category (server, channels, roles, messages, threads, webhooks, moderation, operations)')
  .option('-s, --search <term>', 'Filter tools by name or description search term')
  .option('--json', 'Output full tool schema list in JSON')
  .action(async (opts) => {
    await toolsCommand(opts);
  });

// 6. Serve / MCP Server Command
program
  .command('serve')
  .alias('mcp')
  .description('Start the Model Context Protocol (MCP) server listening on stdio')
  .action(async () => {
    await startMcpStdioServer();
  });

// 7. Direct Tool Execution Command
program
  .command('exec <toolName>')
  .description('Execute any Discord tool directly from the terminal with arguments or JSON payload')
  .option('-j, --json <jsonString>', 'Pass tool parameters as a JSON string')
  .option('--output-json', 'Output only raw JSON result')
  .allowUnknownOption()
  .action(async (toolName, options, command) => {
    // Gather any unknown options passed as --flag value
    const rawArgs: Record<string, any> = { ...options };
    const extraArgs = command.args.slice(1);
    for (let i = 0; i < extraArgs.length; i++) {
      const arg = extraArgs[i];
      if (arg.startsWith('--')) {
        const key = arg.slice(2).replace(/-/g, '_');
        const next = extraArgs[i + 1];
        if (next && !next.startsWith('--')) {
          rawArgs[key] = next;
          i++;
        } else {
          rawArgs[key] = true;
        }
      }
    }
    await execCommand(toolName, rawArgs);
  });

// 8. Declarative Plan Management Command Group
const planCmd = program
  .command('plan')
  .description('Declarative server architecture planning, auditing, previewing, and applying');

planCmd
  .command('design')
  .description('Generate a declarative server blueprint template (developer_community, saas_support, gaming_guild, minimal)')
  .option('-t, --template <name>', 'Template name', 'developer_community')
  .option('-n, --name <name>', 'Custom server name')
  .option('-o, --out <filePath>', 'Save blueprint to JSON file')
  .action(async (opts) => {
    await planDesignCommand(opts);
  });

planCmd
  .command('audit')
  .description('Audit a Discord server for security misconfigurations and dangerous permissions')
  .option('-g, --guild-id <id>', 'Server ID to audit')
  .action(async (opts) => {
    await planAuditCommand(opts);
  });

planCmd
  .command('backup')
  .description('Export live server structure into a declarative JSON blueprint backup')
  .option('-g, --guild-id <id>', 'Server ID to backup')
  .option('-o, --out <filePath>', 'Destination file path')
  .action(async (opts) => {
    await planBackupCommand(opts);
  });

planCmd
  .command('preview <planFile>')
  .description('Preview diff between live server state and desired blueprint plan')
  .option('-g, --guild-id <id>', 'Target server ID')
  .action(async (planFile, opts) => {
    await planPreviewCommand({ planFile, guildId: opts.guildId });
  });

planCmd
  .command('apply <planFile>')
  .description('Apply a declarative blueprint plan to a server with rate-limit and dependency safety')
  .option('-g, --guild-id <id>', 'Target server ID')
  .option('-y, --yes', 'Confirm mutation without interactive prompt')
  .action(async (planFile, opts) => {
    await planApplyCommand({ planFile, guildId: opts.guildId, yes: opts.yes });
  });

planCmd
  .command('verify <planFile>')
  .description('Verify live server compliance against desired blueprint plan, detecting drift')
  .option('-g, --guild-id <id>', 'Target server ID')
  .action(async (planFile, opts) => {
    await planVerifyCommand({ planFile, guildId: opts.guildId });
  });

export async function runCli(argv = process.argv) {
  // If no arguments provided, default to --help
  if (argv.length <= 2) {
    argv.push('--help');
  }
  await program.parseAsync(argv);
}

// Auto-run if executed directly
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('vibecord') || process.argv[1]?.endsWith('index.ts') || process.argv[1]?.endsWith('index.js')) {
  runCli().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
