import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ContentTypeRegistry } from '../../src/handlers/ContentTypeRegistry';
import { ContentTypeHandler } from '../../src/handlers/ContentTypeHandler';
import { YouTubeHandler } from '../../src/handlers/YouTubeHandler';

// Mock the logger
vi.mock('../../src/utils/importerLogger', () => ({
  getLogger: () => ({
    debugLog: vi.fn(),
    error: vi.fn(),
    warn: vi.fn()
  })
}));

describe('ContentTypeRegistry', () => {
  let registry: ContentTypeRegistry;
  let youtubeHandler: ContentTypeHandler;
  
  // Create a mock handler for testing
  const createMockHandler = (type: string, detectResult: boolean): ContentTypeHandler => {
    return {
      type,
      detect: vi.fn().mockReturnValue(detectResult),
      canHandleUrl: vi.fn().mockResolvedValue(detectResult),
      requiresContentDetection: vi.fn().mockReturnValue(false),
      getPrompt: vi.fn(),
      parseLLMResponse: vi.fn(),
      validateLLMOutput: vi.fn(),
      download: vi.fn(),
      getNoteContent: vi.fn(),
      getFolderName: vi.fn()
    };
  };

  beforeEach(() => {
    registry = new ContentTypeRegistry();
    youtubeHandler = new YouTubeHandler();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('registration and retrieval', () => {
    it('should register a handler', () => {
      registry.register(youtubeHandler);
      expect(registry.getHandlers()).toHaveLength(1);
      expect(registry.getHandlers()[0]).toBe(youtubeHandler);
    });

    it('should register multiple handlers', () => {
      const mockHandler1 = createMockHandler('test1', true);
      const mockHandler2 = createMockHandler('test2', false);
      
      registry.register(youtubeHandler);
      registry.register(mockHandler1);
      registry.register(mockHandler2);
      
      expect(registry.getHandlers()).toHaveLength(3);
      expect(registry.getHandlers()[0]).toBe(youtubeHandler);
      expect(registry.getHandlers()[1]).toBe(mockHandler1);
      expect(registry.getHandlers()[2]).toBe(mockHandler2);
    });
  });

  describe('content type detection', () => {
    it('should detect YouTube URLs', async () => {
      registry.register(youtubeHandler);
      const handler = await registry.detectContentType('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      expect(handler).toBe(youtubeHandler);
    });

    it('should return null for unsupported URLs', async () => {
      registry.register(youtubeHandler);
      const handler = await registry.detectContentType('https://example.com');
      expect(handler).toBeNull();
    });

    it('should detect based on the first matching handler', async () => {
      const mockHandler1 = createMockHandler('test1', false);
      const mockHandler2 = createMockHandler('test2', true);
      const mockHandler3 = createMockHandler('test3', true); // This should never be reached
      
      registry.register(mockHandler1);
      registry.register(mockHandler2);
      registry.register(mockHandler3);
      
      const handler = await registry.detectContentType('https://example.com');
      
      expect(mockHandler1.detect).toHaveBeenCalled();
      expect(mockHandler2.detect).toHaveBeenCalled();
      expect(mockHandler3.detect).not.toHaveBeenCalled(); // Should short-circuit after finding a match
      expect(handler).toBe(mockHandler2);
    });
  });

  describe('caching behavior', () => {
    it('should cache detection results', async () => {
      const mockHandler = createMockHandler('test', true);
      registry.register(mockHandler);
      
      // First call should use detect()
      await registry.detectContentType('https://example.com');
      expect(mockHandler.detect).toHaveBeenCalledTimes(1);
      
      // Second call should use cache and not call detect()
      await registry.detectContentType('https://example.com');
      expect(mockHandler.detect).toHaveBeenCalledTimes(1); // Still only called once
    });

    it('should clear cache when requested', async () => {
      const mockHandler = createMockHandler('test', true);
      registry.register(mockHandler);
      
      // First call should use detect()
      await registry.detectContentType('https://example.com');
      expect(mockHandler.detect).toHaveBeenCalledTimes(1);
      
      // Clear cache
      registry.clearCache();
      
      // Next call should call detect() again
      await registry.detectContentType('https://example.com');
      expect(mockHandler.detect).toHaveBeenCalledTimes(2);
    });

    it('should report cache size correctly', async () => {
      const mockHandler = createMockHandler('test', true);
      registry.register(mockHandler);
      
      // Cache should be empty initially
      expect(registry.getCacheSize()).toBe(0);
      
      // Add one item to cache
      await registry.detectContentType('https://example.com');
      expect(registry.getCacheSize()).toBe(1);
      
      // Add another item to cache
      await registry.detectContentType('https://example.org');
      expect(registry.getCacheSize()).toBe(2);
      
      // Clear cache
      registry.clearCache();
      expect(registry.getCacheSize()).toBe(0);
    });

    it('should handle invalid URLs gracefully', async () => {
      registry.register(youtubeHandler);
      const handler = await registry.detectContentType('not-a-url');
      expect(handler).toBeNull();
    });
  });
});