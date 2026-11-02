import { chmodSync, statSync } from 'node:fs';
import { platform } from 'node:os';

/**
 * Redacts a sensitive token, preserving minimal prefix and suffix for diagnostic identification.
 * Example: "OTIzNjcw...a1B2"
 */
export function redactToken(token?: string | null): string {
  if (!token) return '[NOT_SET]';
  const trimmed = token.trim();
  if (trimmed.length <= 10) {
    return '****';
  }
  const prefix = trimmed.slice(0, 6);
  const suffix = trimmed.slice(-4);
  return `${prefix}...${suffix}`;
}

/**
 * Deeply redacts any token, secret, or password fields in an object for safe logging.
 */
export function redactSecretsInObject<T>(input: T): T {
  if (!input || typeof input !== 'object') {
    return input;
  }

  if (Array.isArray(input)) {
    return input.map(item => redactSecretsInObject(item)) as unknown as T;
  }

  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(input)) {
    const lowerKey = key.toLowerCase();
    if (
      lowerKey.includes('token') ||
      lowerKey.includes('secret') ||
      lowerKey.includes('password') ||
      lowerKey.includes('auth')
    ) {
      result[key] = typeof value === 'string' ? redactToken(value) : '[REDACTED]';
    } else if (value && typeof value === 'object') {
      result[key] = redactSecretsInObject(value);
    } else {
      result[key] = value;
    }
  }

  return result as T;
}

/**
 * Enforces strict POSIX permissions (0700 for directories, 0600 for secret files).
 * Skips Windows where POSIX file modes do not apply directly.
 */
export function enforceSecurePermissions(filePath?: string, dirPath?: string): void {
  const isWindows = platform() === 'win32';
  if (isWindows) return;

  try {
    if (dirPath) {
      chmodSync(dirPath, 0o700);
    }
  } catch {
    // Ignore if running in constrained environment
  }

  try {
    if (filePath) {
      chmodSync(filePath, 0o600);
    }
  } catch {
    // Ignore if running in constrained environment
  }
}

/**
 * Inspects file permissions and returns whether the file is securely restricted.
 */
export function checkFilePermissions(filePath: string): { secure: boolean; mode?: string } {
  if (platform() === 'win32') {
    return { secure: true }; // On Windows, NTFS ACLs are used
  }

  try {
    const stats = statSync(filePath);
    // Mask with 077 to check group/other permissions
    const mode = stats.mode & 0o777;
    const isGroupOrOtherReadable = (mode & 0o077) !== 0;
    return {
      secure: !isGroupOrOtherReadable,
      mode: `0${(mode).toString(8)}`,
    };
  } catch {
    return { secure: false };
  }
}
