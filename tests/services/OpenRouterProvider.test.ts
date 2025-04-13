// Mock the Obsidian API for all tests in this file. See tests/__mocks__/obsidian.ts for details.
vi.mock('obsidian');
import { describe, it, expect, vi } from 'vitest';
import { OpenRouterProvider } from '../../src/services/OpenRouterProvider';

describe('OpenRouterProvider', () => {
  it('should use the getSettings function for each call', async () => {
    const settings1 = {
      endpoint: 'https://api1.example.com',
      model: 'model-1',
      timeoutMs: 1000,
    };
    const settings2 = {
      endpoint: 'https://api2.example.com',
      model: 'model-2',
      timeoutMs: 2000,
    };

    let callCount = 0;
    const getSettings = vi.fn(() => {
      callCount++;
      return callCount === 1 ? settings1 : settings2;
    });

    // Mock fetch to verify endpoint and timeout
    globalThis.fetch = vi.fn(async (url, options) => {
      return {
        ok: true,
        json: async () => ({ choices: [{ message: { content: 'test' } }] }),
      };
    }) as any;

    const provider = new OpenRouterProvider(getSettings);

    // First call uses settings1
    await provider.processPrompt('test prompt', 'test-api-key');
    expect(getSettings).toHaveBeenCalledTimes(1);
    expect((globalThis.fetch as any).mock.calls[0][0]).toBe(settings1.endpoint);

    // Second call uses settings2
    await provider.processPrompt('test prompt 2', 'test-api-key');
    expect(getSettings).toHaveBeenCalledTimes(2);
    expect((globalThis.fetch as any).mock.calls[1][0]).toBe(settings2.endpoint);
  });

  it('should not cache settings between calls', async () => {
    let currentSettings = {
      endpoint: 'https://api.example.com',
      model: 'model-a',
      timeoutMs: 1000,
    };
    const getSettings = vi.fn(() => currentSettings);

    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'ok' } }] }),
    })) as any;

    const provider = new OpenRouterProvider(getSettings);

    await provider.processPrompt('first', 'test-api-key');
    expect(getSettings).toHaveBeenCalledTimes(1);

    // Change settings at runtime
    currentSettings = {
      endpoint: 'https://api.changed.com',
      model: 'model-b',
      timeoutMs: 5000,
    };

    await provider.processPrompt('second', 'test-api-key');
    expect(getSettings).toHaveBeenCalledTimes(2);
    expect((globalThis.fetch as any).mock.calls[1][0]).toBe('https://api.changed.com');
  });
});