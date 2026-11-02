/**
 * VibeCord - Structured Error Hierarchy
 */

export enum ErrorCode {
  AUTH_ERROR = 'AUTH_ERROR',
  RATE_LIMITED = 'RATE_LIMITED',
  MISSING_PERMISSIONS = 'MISSING_PERMISSIONS',
  NOT_FOUND = 'NOT_FOUND',
  INVALID_INPUT = 'INVALID_INPUT',
  DISCORD_API_ERROR = 'DISCORD_API_ERROR',
  CONFIG_ERROR = 'CONFIG_ERROR',
  OPERATION_ABORTED = 'OPERATION_ABORTED',
  HIERARCHY_ERROR = 'HIERARCHY_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
}

export interface ErrorDetails {
  discordCode?: number;
  httpStatus?: number;
  retryAfterMs?: number;
  missingPermissions?: string[];
  fieldErrors?: Record<string, string[]>;
  rawResponse?: unknown;
  [key: string]: unknown;
}

export class DiscordBridgeError extends Error {
  public readonly code: ErrorCode;
  public readonly details?: ErrorDetails;
  public readonly statusCode?: number;
  public readonly retryAfterMs?: number;

  constructor(
    message: string,
    code: ErrorCode = ErrorCode.DISCORD_API_ERROR,
    details?: ErrorDetails
  ) {
    super(message);
    this.name = 'DiscordBridgeError';
    this.code = code;
    this.details = details;
    this.statusCode = details?.httpStatus;
    this.retryAfterMs = details?.retryAfterMs;

    // Maintain proper prototype chain
    Object.setPrototypeOf(this, DiscordBridgeError.prototype);
  }

  public toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      retryAfterMs: this.retryAfterMs,
      details: this.details,
    };
  }
}

/**
 * Classifies an unknown error into a structured DiscordBridgeError.
 */
export function classifyError(error: unknown): DiscordBridgeError {
  if (error instanceof DiscordBridgeError) {
    return error;
  }

  if (error && typeof error === 'object') {
    const errObj = error as Record<string, any>;

    // Discord API HTTP Error (from discord.js or @discordjs/rest)
    const status = errObj.status || errObj.statusCode;
    const discordCode = errObj.code;
    const message = errObj.message || 'Unknown Discord API Error';

    if (status === 401 || discordCode === 40001) {
      return new DiscordBridgeError(
        'Invalid or expired Discord bot token. Please check your credentials.',
        ErrorCode.AUTH_ERROR,
        { httpStatus: status, discordCode, rawResponse: errObj }
      );
    }

    if (status === 403 || discordCode === 50013) {
      return new DiscordBridgeError(
        'Missing required Discord permissions to perform this action.',
        ErrorCode.MISSING_PERMISSIONS,
        { httpStatus: status, discordCode, rawResponse: errObj }
      );
    }

    if (discordCode === 50001) {
      return new DiscordBridgeError(
        'Missing access to the requested Discord resource or server.',
        ErrorCode.MISSING_PERMISSIONS,
        { httpStatus: status, discordCode, rawResponse: errObj }
      );
    }

    if (status === 404 || discordCode === 10003 || discordCode === 10004 || discordCode === 10011) {
      return new DiscordBridgeError(
        message || 'Requested Discord resource (guild, channel, role, or message) not found.',
        ErrorCode.NOT_FOUND,
        { httpStatus: status, discordCode, rawResponse: errObj }
      );
    }

    if (status === 429) {
      const retryAfter = typeof errObj.retry_after === 'number'
        ? Math.ceil(errObj.retry_after * 1000)
        : 1000;
      return new DiscordBridgeError(
        `Discord API rate limit hit. Try again in ${(retryAfter / 1000).toFixed(1)}s.`,
        ErrorCode.RATE_LIMITED,
        { httpStatus: 429, retryAfterMs: retryAfter, rawResponse: errObj }
      );
    }

    if (status === 400 || discordCode === 50035) {
      return new DiscordBridgeError(
        message || 'Invalid input parameter provided to Discord API.',
        ErrorCode.INVALID_INPUT,
        { httpStatus: status, discordCode, fieldErrors: errObj.errors, rawResponse: errObj }
      );
    }

    if (errObj.code === 'ENOTFOUND' || errObj.code === 'ECONNREFUSED' || errObj.code === 'ETIMEDOUT') {
      return new DiscordBridgeError(
        `Network error communicating with Discord: ${errObj.code}`,
        ErrorCode.NETWORK_ERROR,
        { rawResponse: errObj }
      );
    }

    return new DiscordBridgeError(
      message,
      ErrorCode.DISCORD_API_ERROR,
      { httpStatus: status, discordCode, rawResponse: errObj }
    );
  }

  return new DiscordBridgeError(
    String(error) || 'An unexpected error occurred',
    ErrorCode.DISCORD_API_ERROR
  );
}
