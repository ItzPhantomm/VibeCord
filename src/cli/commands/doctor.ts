import pc from 'picocolors';
import { UI } from '../ui.js';
import { loadConfig, getConfigFilePath, checkFilePermissions } from '../../config/index.js';
import { DiscordClientWrapper } from '../../discord/client.js';
import { redactToken } from '../../config/secrets.js';
import { detectInstalledHarnesses } from '../../harnesses/index.js';
import { explainPermissions } from '../../discord/permissions.js';

interface CheckResult {
  category: string;
  name: string;
  status: 'pass' | 'warn' | 'fail';
  details: string;
  remedy?: string;
}

export async function doctorCommand() {
  UI.banner();
  console.log(` ${pc.bold('System Health Diagnostics & Verification')}\n`);

  const checks: CheckResult[] = [];

  // Check 1: Node.js Runtime
  const nodeVersion = process.version;
  const major = parseInt(nodeVersion.replace('v', '').split('.')[0], 10);
  if (major >= 18) {
    checks.push({
      category: 'Runtime',
      name: 'Node.js Version',
      status: 'pass',
      details: `${nodeVersion} (Supported, >= v18)`,
    });
  } else {
    checks.push({
      category: 'Runtime',
      name: 'Node.js Version',
      status: 'fail',
      details: `${nodeVersion} (Unsupported, requires >= v18)`,
      remedy: 'Please update Node.js to version 18, 20, or 22.',
    });
  }

  // Check 2: Configuration file
  const configPath = getConfigFilePath();
  const config = loadConfig();
  const permCheck = checkFilePermissions(configPath);

  if (config.token) {
    checks.push({
      category: 'Config',
      name: 'Config File',
      status: 'pass',
      details: `${configPath}`,
    });

    if (permCheck.secure) {
      checks.push({
        category: 'Config',
        name: 'File Permissions',
        status: 'pass',
        details: `${permCheck.mode || '0600'} (Owner-only read/write)`,
      });
    } else {
      checks.push({
        category: 'Config',
        name: 'File Permissions',
        status: 'warn',
        details: `${permCheck.mode || 'Unrestricted'} permissions detected`,
        remedy: `Run 'chmod 600 "${configPath}"' to restrict access to owner only.`,
      });
    }
  } else {
    checks.push({
      category: 'Config',
      name: 'Config File',
      status: 'fail',
      details: 'Configuration file missing or no token set',
      remedy: 'Run "vibecord setup" to configure your credentials.',
    });
  }

  // Check 3: Discord API Connectivity & Auth
  let client: DiscordClientWrapper | undefined;
  let botUser: any;
  let guilds: any[] = [];

  if (config.token) {
    try {
      client = new DiscordClientWrapper({ token: config.token });
      const test = await client.testConnection();
      botUser = test.botUser;
      guilds = await client.listGuilds();

      checks.push({
        category: 'Discord API',
        name: 'Authentication',
        status: 'pass',
        details: `Authenticated as ${botUser.username}#${botUser.discriminator} (ID: ${botUser.id})`,
      });

      checks.push({
        category: 'Discord API',
        name: 'REST Latency',
        status: test.latencyMs < 500 ? 'pass' : 'warn',
        details: `${test.latencyMs}ms roundtrip`,
      });

      checks.push({
        category: 'Discord API',
        name: 'Guild Access',
        status: guilds.length > 0 ? 'pass' : 'warn',
        details: `Member of ${guilds.length} server(s)`,
        remedy: guilds.length === 0 ? 'Bot is not in any Discord server. Invite it using the invite link from setup.' : undefined,
      });

      // Check Default Guild if configured
      if (config.defaultGuildId) {
        const found = guilds.find(g => g.id === config.defaultGuildId);
        if (found) {
          checks.push({
            category: 'Discord Guild',
            name: 'Default Server',
            status: 'pass',
            details: `"${found.name}" (${found.id}) is reachable`,
          });
        } else {
          checks.push({
            category: 'Discord Guild',
            name: 'Default Server',
            status: 'warn',
            details: `Configured default server ID (${config.defaultGuildId}) was not found in bot servers`,
            remedy: 'Run "vibecord setup" to select an active server.',
          });
        }
      }
    } catch (err: unknown) {
      checks.push({
        category: 'Discord API',
        name: 'Authentication',
        status: 'fail',
        details: `Connection failed: ${err instanceof Error ? err.message : String(err)}`,
        remedy: 'Check that your token in ~/.config/vibecord/config.json is valid and not expired.',
      });
    }
  }

  // Check 4: AI Harness Integrations
  const harnesses = await detectInstalledHarnesses();
  for (const item of harnesses) {
    const isConfigured = Boolean(config.harnesses?.[item.adapter.id]?.enabled);
    if (item.detected) {
      checks.push({
        category: 'AI Harness',
        name: item.adapter.name,
        status: isConfigured ? 'pass' : 'warn',
        details: isConfigured
          ? `Detected and registered in ${item.configPath}`
          : `Installed on system, but MCP not connected yet`,
        remedy: !isConfigured ? `Run "vibecord connect --harness ${item.adapter.id}"` : undefined,
      });
    }
  }

  // Render Diagnostics Table
  const rows: (string | number)[][] = checks.map(c => {
    let statusBadge: string;
    if (c.status === 'pass') statusBadge = pc.green('✔ PASS');
    else if (c.status === 'warn') statusBadge = pc.yellow('⚠ WARN');
    else statusBadge = pc.red('✖ FAIL');

    return [
      pc.dim(c.category),
      pc.bold(c.name),
      statusBadge,
      c.details,
    ];
  });

  console.log(UI.table(['Category', 'Check', 'Status', 'Details'], rows));
  console.log();

  // Print Remedies if any
  const failingOrWarning = checks.filter(c => c.remedy);
  if (failingOrWarning.length > 0) {
    console.log(` ${pc.bold('Actionable Recommendations:')}`);
    for (const item of failingOrWarning) {
      console.log(`  ${UI.arrow} ${pc.bold(item.name)}: ${pc.yellow(item.remedy!)}`);
    }
    console.log();
  }

  const hasFailures = checks.some(c => c.status === 'fail');
  if (hasFailures) {
    console.log(` ${UI.badgeError(' DOCTOR FOUND ISSUES ')} Resolve the failing items above to ensure flawless operation.\n`);
  } else {
    console.log(` ${UI.badgeSuccess(' ALL CHECKS PASSED ')} Discord Bridge is healthy and fully operational.\n`);
  }
}
