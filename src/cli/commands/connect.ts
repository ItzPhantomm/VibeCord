import prompts from 'prompts';
import pc from 'picocolors';
import { UI } from '../ui.js';
import {
  detectInstalledHarnesses,
  getHarnessAdapter,
  getDefaultMcpConfig,
  ALL_HARNESSES,
} from '../../harnesses/index.js';
import { loadConfig, saveConfig } from '../../config/index.js';

export interface ConnectOptions {
  harness?: string;
  disconnect?: boolean;
  manual?: boolean;
  all?: boolean;
}

export async function connectCommand(options: ConnectOptions = {}) {
  UI.banner();

  const config = loadConfig();
  const mcpConfig = getDefaultMcpConfig();

  // If --manual requested, print manual configuration for all or specified harness
  if (options.manual) {
    console.log(` ${pc.bold('Manual MCP Configuration Snippets')}`);
    console.log(` ${pc.dim('Copy and paste the configuration into your harness config file:')}\n`);

    const targetHarnesses = options.harness
      ? ALL_HARNESSES.filter(h => h.id === options.harness)
      : ALL_HARNESSES;

    for (const h of targetHarnesses) {
      console.log(` ${pc.bold(pc.green(h.name))} (${pc.cyan(h.getConfigPath())}):`);
      console.log(pc.dim(h.getManualSnippet(mcpConfig)));
      console.log();
    }
    return;
  }

  // If specific harness provided via flag
  if (options.harness) {
    const adapter = getHarnessAdapter(options.harness);
    if (!adapter) {
      console.error(pc.red(`Unknown harness ID: "${options.harness}". Available: ${ALL_HARNESSES.map(h => h.id).join(', ')}`));
      process.exit(1);
    }

    if (options.disconnect) {
      const res = await adapter.uninstall();
      if (res.success) {
        const updated = { ...(config.harnesses || {}) };
        delete updated[adapter.id];
        saveConfig({ harnesses: updated });
        UI.successMessage(`Disconnected ${adapter.name}: ${res.message}`);
      } else {
        UI.errorMessage(`Failed to disconnect ${adapter.name}: ${res.error}`);
      }
      return;
    }

    console.log(` ${UI.bullet} Configuring ${adapter.name}...`);
    const res = await adapter.install(mcpConfig);
    if (res.success) {
      const updated = {
        ...(config.harnesses || {}),
        [adapter.id]: {
          enabled: true,
          installedAt: new Date().toISOString(),
          configPath: res.configPath,
        },
      };
      saveConfig({ harnesses: updated });
      UI.successMessage(res.message);
      console.log(`   Config file: ${pc.cyan(res.configPath || adapter.getConfigPath())}\n`);
    } else {
      UI.errorMessage(`Failed to configure ${adapter.name}: ${res.error}`);
    }
    return;
  }

  // Interactive harness management
  console.log(` ${pc.bold('AI Harness Auto-Detection & Connection')}\n`);
  const detected = await detectInstalledHarnesses();

  const choices = detected.map(item => {
    const isConfigured = Boolean(config.harnesses?.[item.adapter.id]?.enabled);
    return {
      title: `${item.adapter.name.padEnd(24)} ${item.detected ? pc.green('[Found on System]') : pc.dim('[Not Found]')} ${isConfigured ? pc.cyan('[Active]') : ''}`,
      value: item.adapter.id,
      selected: isConfigured || item.detected,
    };
  });

  const { selected } = await prompts({
    type: 'multiselect',
    name: 'selected',
    message: 'Select harnesses to configure with VibeCord:',
    choices,
    hint: 'Space to toggle, Enter to confirm',
  });

  if (!selected) {
    console.log(` ${UI.warnMessage('Operation canceled.')}`);
    return;
  }

  const updatedHarnesses: Record<string, any> = { ...(config.harnesses || {}) };

  for (const item of detected) {
    const shouldBeEnabled = selected.includes(item.adapter.id);
    const wasEnabled = Boolean(config.harnesses?.[item.adapter.id]?.enabled);

    if (shouldBeEnabled && !wasEnabled) {
      console.log(` ${UI.bullet} Installing MCP integration for ${item.adapter.name}...`);
      const res = await item.adapter.install(mcpConfig);
      if (res.success) {
        UI.successMessage(res.message);
        updatedHarnesses[item.adapter.id] = {
          enabled: true,
          installedAt: new Date().toISOString(),
          configPath: res.configPath,
        };
      } else {
        UI.errorMessage(`Failed: ${res.error}`);
      }
    } else if (!shouldBeEnabled && wasEnabled) {
      console.log(` ${UI.bullet} Removing integration for ${item.adapter.name}...`);
      await item.adapter.uninstall();
      delete updatedHarnesses[item.adapter.id];
      UI.infoMessage(`Removed from ${item.adapter.name}`);
    }
  }

  saveConfig({ harnesses: updatedHarnesses });
  console.log(`\n ${UI.badgeSuccess(' HARNESSES UPDATED ')} All harness integrations updated.\n`);
}
