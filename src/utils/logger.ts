/**
 * VibeCord - Stderr-Isolated Logger
 *
 * CRITICAL ARCHITECTURAL GUARANTEE:
 * This logger writes EXCLUSIVELY to process.stderr.
 * process.stdout is strictly reserved for MCP JSON-RPC protocol frames.
 */

import pc from 'picocolors';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

const LOG_LEVEL_SEVERITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 4,
};

let currentLogLevel: LogLevel = 'info';

export function setLogLevel(level: LogLevel) {
  currentLogLevel = level;
}

export function getLogLevel(): LogLevel {
  return currentLogLevel;
}

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVEL_SEVERITY[level] >= LOG_LEVEL_SEVERITY[currentLogLevel];
}

function timestamp(): string {
  const now = new Date();
  return pc.dim(now.toISOString().split('T')[1].replace('Z', ''));
}

export const logger = {
  debug(...args: unknown[]) {
    if (!shouldLog('debug')) return;
    const prefix = `${timestamp()} ${pc.magenta('[DEBUG]')}`;
    process.stderr.write(`${prefix} ${args.map(formatArg).join(' ')}\n`);
  },

  info(...args: unknown[]) {
    if (!shouldLog('info')) return;
    const prefix = `${timestamp()} ${pc.cyan('[INFO]')}`;
    process.stderr.write(`${prefix} ${args.map(formatArg).join(' ')}\n`);
  },

  warn(...args: unknown[]) {
    if (!shouldLog('warn')) return;
    const prefix = `${timestamp()} ${pc.yellow('[WARN]')}`;
    process.stderr.write(`${prefix} ${args.map(formatArg).join(' ')}\n`);
  },

  error(...args: unknown[]) {
    if (!shouldLog('error')) return;
    const prefix = `${timestamp()} ${pc.red('[ERROR]')}`;
    process.stderr.write(`${prefix} ${args.map(formatArg).join(' ')}\n`);
  },

  success(...args: unknown[]) {
    if (!shouldLog('info')) return;
    const prefix = `${timestamp()} ${pc.green('[SUCCESS]')}`;
    process.stderr.write(`${prefix} ${args.map(formatArg).join(' ')}\n`);
  },

  bridge(...args: unknown[]) {
    if (!shouldLog('info')) return;
    const prefix = `${timestamp()} ${pc.bold(pc.green('⚡ [VIBECORD]'))}`;
    process.stderr.write(`${prefix} ${args.map(formatArg).join(' ')}\n`);
  },
};

function formatArg(arg: unknown): string {
  if (typeof arg === 'string') return arg;
  if (arg instanceof Error) {
    return `${arg.message}\n${arg.stack || ''}`;
  }
  try {
    return JSON.stringify(arg, null, 2);
  } catch {
    return String(arg);
  }
}
