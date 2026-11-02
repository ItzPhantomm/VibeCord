import { readFileSync, writeFileSync } from 'node:fs';
import pc from 'picocolors';
import prompts from 'prompts';
import { UI } from '../ui.js';
import { loadConfig } from '../../config/index.js';
import { DiscordClientWrapper } from '../../discord/client.js';
import {
  designServerTool,
  auditServerTool,
  previewServerPlanTool,
  applyServerPlanTool,
  backupServerTool,
  verifyChangesTool,
} from '../../tools/operations/index.js';

export async function planDesignCommand(options: { template?: string; name?: string; out?: string }) {
  UI.banner();
  const template = options.template || 'developer_community';
  console.log(` ${pc.bold('Generating Declarative Server Blueprint')}`);
  console.log(` Template: ${pc.green(template)}\n`);

  const result = await designServerTool.execute(null as any, {
    template: template as any,
    server_name: options.name,
    include_voice: true,
  });

  if (options.out) {
    writeFileSync(options.out, JSON.stringify(result.plan, null, 2), 'utf8');
    UI.successMessage(`Saved server blueprint to ${pc.cyan(options.out)}`);
  } else {
    console.log(JSON.stringify(result.plan, null, 2));
  }
}

export async function planAuditCommand(options: { guildId?: string }) {
  UI.banner();
  const config = loadConfig({ requireToken: true });
  const client = new DiscordClientWrapper({ token: config.token, readOnly: config.readOnly });

  const guildId = options.guildId || config.defaultGuildId;
  if (!guildId) {
    console.error(pc.red('Error: Server ID must be provided via --guild-id or configured as default.'));
    process.exit(1);
  }

  console.log(` ${pc.bold('Auditing Server Security & Architecture')} (Guild: ${pc.cyan(guildId)})\n`);

  const report = await auditServerTool.execute(client, { guild_id: guildId });

  let scoreColor = pc.green;
  if (report.overallScore < 60) scoreColor = pc.red;
  else if (report.overallScore < 85) scoreColor = pc.yellow;

  console.log(`  Security Health Score: ${scoreColor(`${report.overallScore}/100`)}`);
  console.log(`  Total Channels:        ${report.metrics.totalChannels}`);
  console.log(`  Total Roles:           ${report.metrics.totalRoles}`);
  console.log(`  Administrator Roles:   ${report.metrics.adminRoles}`);
  console.log();

  if (report.securityIssues.length === 0) {
    console.log(` ${UI.badgeSuccess(' CLEAN ')} No major architectural or security issues detected!`);
  } else {
    console.log(` ${pc.bold('Discovered Security Issues:')}`);
    for (const issue of report.securityIssues) {
      let sevTag = pc.yellow('[WARN]');
      if (issue.severity === 'critical') sevTag = pc.bgRed(pc.white(' CRITICAL '));
      else if (issue.severity === 'high') sevTag = pc.red('[HIGH]');

      console.log(`  ${sevTag} ${pc.bold(issue.title)}`);
      console.log(`     ${pc.dim(issue.description)}`);
      console.log(`     ${pc.cyan('Recommendation:')} ${issue.recommendation}\n`);
    }
  }
}

export async function planBackupCommand(options: { guildId?: string; out?: string }) {
  UI.banner();
  const config = loadConfig({ requireToken: true });
  const client = new DiscordClientWrapper({ token: config.token, readOnly: config.readOnly });

  const guildId = options.guildId || config.defaultGuildId;
  if (!guildId) {
    console.error(pc.red('Error: Server ID must be provided via --guild-id or configured as default.'));
    process.exit(1);
  }

  console.log(` ${pc.bold('Exporting Server Architecture Backup')} (Guild: ${pc.cyan(guildId)})\n`);

  const result = await backupServerTool.execute(client, { guild_id: guildId });
  const outPath = options.out || `server-backup-${guildId}.json`;

  writeFileSync(outPath, JSON.stringify(result.blueprint, null, 2), 'utf8');
  UI.successMessage(`Server blueprint backup exported to ${pc.cyan(outPath)}`);
  console.log(` ${pc.dim(`Exported ${result.blueprint.roles.length} roles and ${result.blueprint.categories.length} categories.`)}\n`);
}

export async function planPreviewCommand(options: { planFile: string; guildId?: string }) {
  UI.banner();
  const config = loadConfig({ requireToken: true });
  const client = new DiscordClientWrapper({ token: config.token, readOnly: config.readOnly });

  const guildId = options.guildId || config.defaultGuildId;
  if (!guildId) {
    console.error(pc.red('Error: Server ID must be provided via --guild-id or configured as default.'));
    process.exit(1);
  }

  let planData: any;
  try {
    planData = JSON.parse(readFileSync(options.planFile, 'utf8'));
  } catch (err) {
    console.error(pc.red(`Failed to read plan file "${options.planFile}": ${err instanceof Error ? err.message : String(err)}`));
    process.exit(1);
  }

  console.log(` ${pc.bold('Server Plan Preview & Diff')} (Guild: ${pc.cyan(guildId)})\n`);

  const diff = await previewServerPlanTool.execute(client, {
    guild_id: guildId,
    plan: planData,
  });

  console.log(`  Roles to Create:      ${pc.green(diff.summary.totalRolesToCreate)}`);
  console.log(`  Categories to Create: ${pc.green(diff.summary.totalCategoriesToCreate)}`);
  console.log(`  Channels to Create:   ${pc.green(diff.summary.totalChannelsToCreate)}`);
  console.log();

  if (diff.rolesToCreate.length > 0) {
    console.log(` ${pc.bold('New Roles:')}`);
    for (const r of diff.rolesToCreate) {
      console.log(`   ${pc.green('+')} ${r.name} (${r.color || 'default color'})`);
    }
    console.log();
  }

  if (diff.categoriesToCreate.length > 0) {
    console.log(` ${pc.bold('New Categories:')}`);
    for (const cat of diff.categoriesToCreate) {
      console.log(`   ${pc.green('+')} [Category] ${cat}`);
    }
    console.log();
  }

  if (diff.channelsToCreate.length > 0) {
    console.log(` ${pc.bold('New Channels:')}`);
    for (const ch of diff.channelsToCreate) {
      console.log(`   ${pc.green('+')} #${ch.name} (${ch.type}) under category "${ch.targetCategoryName || 'none'}"`);
    }
    console.log();
  }
}

export async function planApplyCommand(options: { planFile: string; guildId?: string; yes?: boolean }) {
  UI.banner();
  const config = loadConfig({ requireToken: true });
  const client = new DiscordClientWrapper({ token: config.token, readOnly: config.readOnly });

  const guildId = options.guildId || config.defaultGuildId;
  if (!guildId) {
    console.error(pc.red('Error: Server ID must be provided via --guild-id or configured as default.'));
    process.exit(1);
  }

  let planData: any;
  try {
    planData = JSON.parse(readFileSync(options.planFile, 'utf8'));
  } catch (err) {
    console.error(pc.red(`Failed to read plan file "${options.planFile}": ${err instanceof Error ? err.message : String(err)}`));
    process.exit(1);
  }

  if (!options.yes) {
    const { confirm } = await prompts({
      type: 'confirm',
      name: 'confirm',
      message: `Are you sure you want to apply plan "${options.planFile}" to Discord server ${guildId}?`,
      initial: false,
    });
    if (!confirm) {
      console.log(` ${UI.warnMessage('Application canceled.')}`);
      return;
    }
  }

  console.log(`\n ${UI.bullet} Applying server plan with dependency ordering and rate-limit backoff...`);
  const result = await applyServerPlanTool.execute(client, {
    guild_id: guildId,
    plan: planData,
    confirm: true,
  });

  UI.successMessage('Server blueprint applied successfully!');
  console.log(`  Processed roles:      ${result.summary.roles_processed}`);
  console.log(`  Processed categories: ${result.summary.categories_processed}`);
  console.log(`  Created channels:     ${result.summary.channels_created}\n`);
}

export async function planVerifyCommand(options: { planFile: string; guildId?: string }) {
  UI.banner();
  const config = loadConfig({ requireToken: true });
  const client = new DiscordClientWrapper({ token: config.token, readOnly: config.readOnly });

  const guildId = options.guildId || config.defaultGuildId;
  if (!guildId) {
    console.error(pc.red('Error: Server ID must be provided via --guild-id or configured as default.'));
    process.exit(1);
  }

  let planData: any;
  try {
    planData = JSON.parse(readFileSync(options.planFile, 'utf8'));
  } catch (err) {
    console.error(pc.red(`Failed to read plan file: ${err instanceof Error ? err.message : String(err)}`));
    process.exit(1);
  }

  console.log(` ${pc.bold('Verifying Live Server Compliance')} (Guild: ${pc.cyan(guildId)})\n`);

  const result = await verifyChangesTool.execute(client, {
    guild_id: guildId,
    expected_plan: planData,
  });

  if (result.compliant) {
    console.log(` ${UI.badgeSuccess(' 100% COMPLIANT ')} Live server configuration matches the expected blueprint!`);
  } else {
    console.log(` ${UI.badgeWarn(' CONFIG DRIFT DETECTED ')} The server is missing some expected items:`);
    if (result.missing_roles.length > 0) {
      console.log(`\n ${pc.bold('Missing Roles:')}`);
      for (const r of result.missing_roles) console.log(`  ${pc.red('-')} ${r}`);
    }
    if (result.missing_channels.length > 0) {
      console.log(`\n ${pc.bold('Missing Channels:')}`);
      for (const c of result.missing_channels) console.log(`  ${pc.red('-')} ${c}`);
    }
  }
  console.log();
}
