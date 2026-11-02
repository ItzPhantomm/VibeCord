import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DiscordClientWrapper } from '../src/discord/client.js';
import { DiscordBridgeError, ErrorCode } from '../src/utils/errors.js';

describe('DiscordClientWrapper', () => {
  let client: DiscordClientWrapper;

  beforeEach(() => {
    client = new DiscordClientWrapper({
      token: 'fake_test_token_1234567890',
      readOnly: false,
    });
  });

  it('rejects mutations when initialized in read-only mode', async () => {
    const readOnlyClient = new DiscordClientWrapper({
      token: 'fake_token',
      readOnly: true,
    });

    await expect(readOnlyClient.createChannel('guild_123', { name: 'test' })).rejects.toThrow(DiscordBridgeError);

    try {
      await readOnlyClient.createChannel('guild_123', { name: 'test' });
    } catch (err: any) {
      expect(err.code).toBe(ErrorCode.OPERATION_ABORTED);
      expect(err.message).toContain('read-only mode');
    }

    await expect(readOnlyClient.deleteChannel('chan_123')).rejects.toThrow();
    await expect(readOnlyClient.sendMessage('chan_123', { content: 'hello' })).rejects.toThrow();
    await expect(readOnlyClient.banMember('guild_123', 'user_123')).rejects.toThrow();
  });

  it('retries on rate limits and succeeds if within retry limit', async () => {
    let callCount = 0;
    const mockRest = (client as any).rest;
    vi.spyOn(mockRest, 'get').mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        const rateLimitErr: any = new Error('Rate Limited');
        rateLimitErr.status = 429;
        rateLimitErr.retry_after = 0.05; // 50ms
        throw rateLimitErr;
      }
      return { id: 'bot_123', username: 'TestBot', discriminator: '0001' };
    });

    const user = await client.getBotUser();
    expect(callCount).toBe(2);
    expect(user.username).toBe('TestBot');
  });

  it('translates 401 Unauthorized into AUTH_ERROR', async () => {
    const mockRest = (client as any).rest;
    vi.spyOn(mockRest, 'get').mockImplementation(async () => {
      const authErr: any = new Error('Unauthorized');
      authErr.status = 401;
      throw authErr;
    });

    await expect(client.getBotUser()).rejects.toThrow(DiscordBridgeError);
    try {
      await client.getBotUser();
    } catch (err: any) {
      expect(err.code).toBe(ErrorCode.AUTH_ERROR);
    }
  });

  it('translates 403 Forbidden into MISSING_PERMISSIONS', async () => {
    const mockRest = (client as any).rest;
    vi.spyOn(mockRest, 'post').mockImplementation(async () => {
      const permErr: any = new Error('Missing Permissions');
      permErr.status = 403;
      permErr.code = 50013;
      throw permErr;
    });

    try {
      await client.createRole('guild_123', { name: 'SuperAdmin' });
    } catch (err: any) {
      expect(err.code).toBe(ErrorCode.MISSING_PERMISSIONS);
    }
  });
});
