import pc from 'picocolors';
import { UI } from '../ui.js';
import { loadConfig } from '../../config/index.js';
import { DiscordClientWrapper } from '../../discord/client.js';
import { redactToken } from '../../config/secrets.js';

export interface StatusOptions {
  guildId?: string;
  json?: boolean;
}

export async function statusCommand(options: StatusOptions = {}) {
  const config = loadConfig({ requireToken: true });
  const client = new DiscordClientWrapper({ token: config.token, readOnly: config.readOnly });

  const test = await client.testConnection();
  const guilds = await client.listGuilds();

  if (options.json) {
    console.log(JSON.stringify({
      authenticated: true,
      botUser: test.botUser,
      latencyMs: test.latencyMs,
      readOnly: config.readOnly,
      defaultGuildId: config.defaultGuildId,
      guilds: guilds.map(g => ({
        id: g.id,
        name: g.name,
        approximate_member_count: g.approximate_member_count,
      })),
    }, null, 2));
    return;
  }

  UI.banner();

  console.log(` ${pc.bold('Bot Connection & Profile Status')}\n`);

  console.log(`  ${pc.bold('Bot Identity:')}    ${pc.green(test.botUser.username)}#${test.botUser.discriminator} (${pc.cyan(test.botUser.id)})`);
  console.log(`  ${pc.bold('REST Latency:')}    ${pc.green(`${test.latencyMs}ms`)} roundtrip`);
  console.log(`  ${pc.bold('Token:')}           ${pc.dim(redactToken(config.token))}`);
  console.log(`  ${pc.bold('Access Mode:')}     ${config.readOnly ? pc.yellow('READ-ONLY') : pc.green('READ & WRITE')}`);
  if (config.defaultGuildId) {
    console.log(`  ${pc.bold('Default Server:')}  ${pc.cyan(config.defaultGuildId)}`);
  }
  console.log();

  UI.section(`Joined Servers (${guilds.length})`);

  if (guilds.length === 0) {
    console.log(` ${UI.warnMessage('Bot is not currently joined to any Discord servers.')}`);
    console.log(` ${pc.dim('Use the OAuth2 invite link from "vibecord setup" to invite the bot.')}\n`);
    return;
  }

  const rows = guilds.map(g => [
    pc.bold(g.name),
    pc.cyan(g.id),
    g.approximate_member_count ? String(g.approximate_member_count) : pc.dim('N/A'),
    g.id === config.defaultGuildId ? pc.green('✔ Default') : pc.dim('—'),
  ]);

  console.log(UI.table(['Server Name', 'Server ID', 'Members', 'Default'], rows));
  console.log();
}
