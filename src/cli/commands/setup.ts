import prompts from 'prompts';
import pc from 'picocolors';
import { UI } from '../ui.js';
import { saveConfig, loadConfig, getConfigFilePath, checkFilePermissions } from '../../config/index.js';
import { DiscordClientWrapper } from '../../discord/client.js';
import { generateInviteUrl } from '../../discord/permissions.js';
import { detectInstalledHarnesses, getDefaultMcpConfig } from '../../harnesses/index.js';
import { redactToken } from '../../config/secrets.js';
import { logger } from '../../utils/logger.js';

export interface SetupOptions {
  token?: string;
  guildId?: string;
  readOnly?: boolean;
  harness?: string;
  nonInteractive?: boolean;
  yes?: boolean;
}

export async function setupCommand(options: SetupOptions = {}) {
  UI.banner();

  console.log(` ${pc.bold('VibeCord Setup Wizard')}`);
  console.log(` ${pc.dim('Configure your Discord bot credentials and integrate with AI harnesses.')}\n`);

  // Non-interactive / headless setup
  if (options.nonInteractive || options.token) {
    if (!options.token) {
      console.error(pc.red('Error: --token is required when running in non-interactive mode.'));
      process.exit(1);
    }

    try {
      console.log(` ${UI.bullet} Validating Discord bot token...`);
      const client = new DiscordClientWrapper({ token: options.token, readOnly: options.readOnly });
      const test = await client.testConnection();
      console.log(` ${UI.check} Authenticated successfully as ${pc.green(test.botUser.username)} (ID: ${pc.cyan(test.botUser.id)})`);

      saveConfig({
        token: options.token,
        defaultGuildId: options.guildId,
        readOnly: Boolean(options.readOnly),
      });

      console.log(` ${UI.check} Saved configuration to ${pc.cyan(getConfigFilePath())} (mode 0600)`);

      if (options.harness) {
        const harnesses = await detectInstalledHarnesses();
        const target = harnesses.find(h => h.adapter.id === options.harness);
        if (target) {
          const res = await target.adapter.install(getDefaultMcpConfig());
          if (res.success) {
            console.log(` ${UI.check} Configured ${target.adapter.name}`);
          } else {
            console.warn(` ${UI.warn} Failed to configure ${target.adapter.name}: ${res.error}`);
          }
        }
      }

      console.log(`\n ${UI.badgeSuccess(' SETUP COMPLETE ')} Setup completed in non-interactive mode.\n`);
      return;
    } catch (err: unknown) {
      console.error(pc.red(`Setup failed: ${err instanceof Error ? err.message : String(err)}`));
      process.exit(1);
    }
  }

  // --- Interactive Setup Mode ---

  // Check if existing configuration exists
  const existingConfig = loadConfig();
  if (existingConfig.token) {
    console.log(` ${UI.infoMessage(`Existing configuration detected with token ${pc.cyan(redactToken(existingConfig.token))}`)}`);
    const { overwrite } = await prompts({
      type: 'confirm',
      name: 'overwrite',
      message: 'Do you want to reconfigure your Discord bot token?',
      initial: false,
    });
    if (!overwrite && existingConfig.token) {
      options.token = existingConfig.token;
    }
  }

  // Discord App guidance
  if (!options.token) {
    console.log(`\n ${pc.bold('Step 1: Discord Bot Credentials')}`);
    console.log(` ${pc.dim('If you do not have a bot token yet:')}`);
    console.log(` 1. Open the Discord Developer Portal: ${pc.cyan('https://discord.com/developers/applications')}`);
    console.log(` 2. Create a "New Application" and navigate to the "Bot" tab.`);
    console.log(` 3. Click "Reset Token" and copy the token.`);
    console.log(` 4. Under "Privileged Gateway Intents", enable "Server Members Intent" and "Message Content Intent".\n`);

    const tokenResponse = await prompts({
      type: 'password',
      name: 'token',
      message: 'Enter your Discord Bot Token:',
      validate: (value: string) => (value && value.trim().length > 20) || 'Please enter a valid Discord bot token.',
    });

    if (!tokenResponse.token) {
      console.log(`\n ${UI.warnMessage('Setup canceled.')}`);
      process.exit(0);
    }
    options.token = tokenResponse.token.trim();
  }

  // Step 2: Validate credentials immediately against Discord API
  console.log(`\n ${pc.bold('Step 2: Testing Connection & Authentication')}`);
  let botUser: any;
  let guilds: any[] = [];
  try {
    const client = new DiscordClientWrapper({ token: options.token! });
    const test = await client.testConnection();
    botUser = test.botUser;
    guilds = await client.listGuilds();

    console.log(` ${UI.check} Connected successfully in ${test.latencyMs}ms!`);
    console.log(`    Bot User:  ${pc.bold(pc.green(botUser.username))}#${botUser.discriminator} (ID: ${pc.cyan(botUser.id)})`);
    console.log(`    Servers:   ${pc.bold(guilds.length)} joined servers\n`);
  } catch (err: unknown) {
    console.log(` ${UI.errorMessage(`Failed to authenticate with Discord API: ${err instanceof Error ? err.message : String(err)}`)}`);
    console.log(` ${pc.dim('Please check that the bot token is correct and that your network allows access to discord.com.')}`);
    process.exit(1);
  }

  // Step 3: OAuth2 Invite Link
  console.log(` ${pc.bold('Step 3: Server Invite Link')}`);
  const recommendedInvite = generateInviteUrl(botUser.id, 'recommended');
  const adminInvite = generateInviteUrl(botUser.id, 'admin');

  console.log(` ${pc.dim('To authorize your bot to manage your Discord server, open this invite URL:')}`);
  console.log(`\n ${pc.bold('Recommended Permissions URL')} (Manage channels, roles, webhooks, messages, audit logs):`);
  console.log(` ${pc.cyan(recommendedInvite)}`);
  console.log(`\n ${pc.bold('Administrator URL')} (Full server administration):`);
  console.log(` ${pc.dim(adminInvite)}\n`);

  // Step 4: Default Server Selection
  let selectedGuildId = options.guildId;
  if (!selectedGuildId) {
    if (guilds.length > 0) {
      const choices = guilds.map(g => ({
        title: `${g.name} (${g.id})`,
        value: g.id,
      }));
      choices.unshift({ title: '[Skip / No default server]', value: '' });

      const guildResponse = await prompts({
        type: 'select',
        name: 'guildId',
        message: 'Select a default server for tool commands:',
        choices,
      });
      selectedGuildId = guildResponse.guildId || undefined;
    } else {
      console.log(` ${UI.warnMessage('The bot has not been added to any servers yet. Open the invite link above to add it!')}`);
      const guildResponse = await prompts({
        type: 'text',
        name: 'guildId',
        message: 'Optional: Enter your target Discord Server ID (or leave blank to set later):',
      });
      selectedGuildId = guildResponse.guildId?.trim() || undefined;
    }
  }

  // Step 5: Read-Only Safety Switch
  const { readOnly } = await prompts({
    type: 'confirm',
    name: 'readOnly',
    message: 'Enable read-only mode? (If yes, AI agents can inspect servers but cannot make mutations)',
    initial: false,
  });

  // Step 6: AI Harness Integrations
  console.log(`\n ${pc.bold('Step 4: AI Harness Integrations')}`);
  const detectedHarnesses = await detectInstalledHarnesses();

  const harnessChoices = detectedHarnesses.map(item => ({
    title: `${item.adapter.name} ${item.detected ? pc.green('[Detected on system]') : pc.dim('[Not detected]')}`,
    value: item.adapter.id,
    selected: item.detected,
  }));

  const { selectedHarnesses } = await prompts({
    type: 'multiselect',
    name: 'selectedHarnesses',
    message: 'Select AI coding harnesses to automatically configure:',
    choices: harnessChoices,
    hint: 'Space to select, Enter to confirm',
  });

  const configuredHarnesses: Record<string, any> = {};
  if (selectedHarnesses && selectedHarnesses.length > 0) {
    const mcpConfig = getDefaultMcpConfig();
    for (const harnessId of selectedHarnesses) {
      const item = detectedHarnesses.find(h => h.adapter.id === harnessId);
      if (item) {
        console.log(` ${UI.bullet} Configuring ${item.adapter.name}...`);
        const installRes = await item.adapter.install(mcpConfig);
        if (installRes.success) {
          console.log(`   ${UI.check} ${installRes.message}`);
          configuredHarnesses[harnessId] = {
            enabled: true,
            installedAt: new Date().toISOString(),
            configPath: installRes.configPath,
          };
        } else {
          console.log(`   ${UI.warn} ${installRes.message}: ${installRes.error}`);
        }
      }
    }
  }

  // Save configuration
  const saved = saveConfig({
    token: options.token,
    applicationId: botUser.id,
    defaultGuildId: selectedGuildId,
    readOnly: Boolean(readOnly),
    harnesses: configuredHarnesses,
  });

  const configPath = getConfigFilePath();
  const permCheck = checkFilePermissions(configPath);

  console.log(`\n ${pc.dim('═'.repeat(60))}`);
  console.log(` ${UI.badgeSuccess(' SETUP COMPLETE ')} ${pc.bold('VibeCord is ready!')}`);
  console.log(` ${pc.dim('═'.repeat(60))}`);
  console.log(`  Configuration file:   ${pc.cyan(configPath)}`);
  console.log(`  File permissions:     ${permCheck.secure ? pc.green('0600 (Secure, owner-only)') : pc.yellow(permCheck.mode || 'unrestricted')}`);
  console.log(`  Bot identity:         ${pc.green(botUser.username)} (${pc.cyan(botUser.id)})`);
  console.log(`  Read-only mode:       ${saved.readOnly ? pc.yellow('ENABLED') : pc.green('DISABLED (Mutations allowed)')}`);
  if (saved.defaultGuildId) {
    console.log(`  Default server ID:    ${pc.cyan(saved.defaultGuildId)}`);
  }
  console.log();
  console.log(` ${pc.bold('Next steps:')}`);
  console.log(`  ${UI.arrow} Run ${pc.green('vibecord doctor')} to verify system health and adapter readiness.`);
  console.log(`  ${UI.arrow} Run ${pc.green('vibecord status')} to inspect live Discord server connections.`);
  console.log(`  ${UI.arrow} Run ${pc.green('vibecord tools')} to explore all 30+ available Discord tools.`);
  console.log(`  ${UI.arrow} Start MCP server manually with ${pc.green('vibecord serve')}.\n`);
}
