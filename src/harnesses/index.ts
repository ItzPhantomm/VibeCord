import type { HarnessAdapter, McpServerConfig } from './base.js';
import { ClaudeCodeAdapter } from './claude-code.js';
import { AntigravityAdapter } from './antigravity.js';
import { CodexAdapter } from './codex.js';
import { HermesAdapter } from './hermes.js';
import { OpenClawAdapter } from './openclaw.js';
import { CursorAdapter } from './cursor.js';
import { ClaudeDesktopAdapter } from './claude-desktop.js';

export * from './base.js';

export const ALL_HARNESSES: HarnessAdapter[] = [
  new ClaudeCodeAdapter(),
  new AntigravityAdapter(),
  new CodexAdapter(),
  new HermesAdapter(),
  new OpenClawAdapter(),
  new CursorAdapter(),
  new ClaudeDesktopAdapter(),
];

export function getHarnessAdapters(): HarnessAdapter[] {
  return ALL_HARNESSES;
}

export function getHarnessAdapter(id: string): HarnessAdapter | undefined {
  return ALL_HARNESSES.find(h => h.id === id);
}

export async function detectInstalledHarnesses(): Promise<Array<{
  adapter: HarnessAdapter;
  detected: boolean;
  configPath: string;
}>> {
  const results = await Promise.all(
    ALL_HARNESSES.map(async adapter => {
      const detected = await adapter.detect();
      return {
        adapter,
        detected,
        configPath: adapter.getConfigPath(),
      };
    })
  );
  return results;
}

export function getDefaultMcpConfig(binaryName: string = 'vibecord'): McpServerConfig {
  return {
    command: binaryName,
    args: ['serve'],
  };
}
