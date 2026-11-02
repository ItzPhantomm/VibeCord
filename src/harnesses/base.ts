export interface McpServerConfig {
  command: string;
  args: string[];
  env?: Record<string, string>;
}

export interface InstallResult {
  success: boolean;
  message: string;
  configPath?: string;
  error?: string;
}

export interface HarnessAdapter {
  id: string;
  name: string;
  description: string;
  detect: () => Promise<boolean>;
  getConfigPath: () => string;
  install: (config: McpServerConfig) => Promise<InstallResult>;
  uninstall: () => Promise<InstallResult>;
  getManualSnippet: (config: McpServerConfig) => string;
}
