import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ContentTypeRegistry } from '../../src/handlers/ContentTypeRegistry';
import { ContentTypeHandler } from '../../src/handlers/ContentTypeHandler';
import { LLMProvider, LLMOptions } from '../../src/services/LLMProvider';
import { fetchWebPageContent } from '../../src/utils/webFetcher';

// Mock dependencies
vi.mock('../../src/utils/webFetcher', () => ({
  fetchWebPageContent: vi.fn(),
  extractMainContent: vi.fn((html) => html.substring(0, 1000))
}));

vi.mock('../../src/utils/importerLogger', () => ({
  getLogger: vi.fn(() => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debugLog: vi.fn()
  }))
}));

describe('ContentTypeRegistry', () => {
  let registry: ContentTypeRegistry;
  let mockLLMProvider: LLMProvider;
  let mockYouTubeHandler: ContentTypeHandler;
  let mockMediumHandler: ContentTypeHandler;
  let mockGenericHandler: ContentTypeHandler;
  
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Create a mock LLM provider
    mockLLMProvider = {
      callLLM: vi.fn().mockResolvedValue('youtube')
    } as any;
    
    // Create a mock YouTube handler
    mockYouTubeHandler = {
      type: 'youtube',
      detect: vi.fn((url) => url.hostname === 'www.youtube.com'),
      canHandleUrl: vi.fn().mockResolvedValue(false),
      requiresContentDetection: vi.fn().mockReturnValue(false),
      download: vi.fn().mockResolvedValue({ content: 'video content', metadata: {} }),
      getPrompt: vi.fn(),
      parseLLMResponse: vi.fn(),
      validateLLMOutput: vi.fn().mockReturnValue(true),
      getNoteContent: vi.fn(),
      getFolderName: vi.fn().mockReturnValue('YouTube'),
      getRequiredApiKeys: vi.fn().mockReturnValue([])
    };
    
    // Create a mock Medium handler
    mockMediumHandler = {
      type: 'medium',
      detect: vi.fn((url) => url.hostname === 'medium.com'),
      canHandleUrl: vi.fn().mockResolvedValue(false),
      requiresContentDetection: vi.fn().mockReturnValue(false),
      download: vi.fn().mockResolvedValue({ content: 'article content', metadata: {} }),
      getPrompt: vi.fn(),
      parseLLMResponse: vi.fn(),
      validateLLMOutput: vi.fn().mockReturnValue(true),
      getNoteContent: vi.fn(),
      getFolderName: vi.fn().mockReturnValue('Medium'),
      getRequiredApiKeys: vi.fn().mockReturnValue([])
    };
    
    // Create a mock generic handler
    mockGenericHandler = {
      type: 'generic',
      detect: vi.fn(() => false), // Never detects by URL
      canHandleUrl: vi.fn().mockResolvedValue(false),
      requiresContentDetection: vi.fn().mockReturnValue(true), // Always requires content detection
      download: vi.fn().mockResolvedValue({ content: 'generic content', metadata: {} }),
      getPrompt: vi.fn(),
      parseLLMResponse: vi.fn(),
      validateLLMOutput: vi.fn().mockReturnValue(true),
      getNoteContent: vi.fn(),
      getFolderName: vi.fn().mockReturnValue('Web'),
      getRequiredApiKeys: vi.fn().mockReturnValue([])
    };
    
    // Create the registry with the mock provider
    registry = new ContentTypeRegistry(mockLLMProvider);
  });
  
  it('should register and return handlers correctly', () => {
    registry.register(mockYouTubeHandler);
    registry.register(mockMediumHandler);
    
    const handlers = registry.getHandlers();
    
    expect(handlers).toHaveLength(2);
    expect(handlers).toContain(mockYouTubeHandler);
    expect(handlers).toContain(mockMediumHandler);
  });
  
  it('should get handler by type', () => {
    registry.register(mockYouTubeHandler);
    registry.register(mockMediumHandler);
    
    expect(registry.getHandlerByType('youtube')).toBe(mockYouTubeHandler);
    expect(registry.getHandlerByType('medium')).toBe(mockMediumHandler);
    expect(registry.getHandlerByType('nonexistent')).toBeUndefined();
  });
  
  it('should detect content type by URL-based detection', async () => {
    // Set up the handler to detect YouTube URLs
    mockYouTubeHandler.canHandleUrl = vi.fn().mockImplementation(async (url) => {
      return url.hostname === 'www.youtube.com';
    });
    
    registry.register(mockYouTubeHandler);
    registry.register(mockMediumHandler);
    
    const handler = await registry.detectContentType('https://www.youtube.com/watch?v=123456');
    
    expect(handler).toBe(mockYouTubeHandler);
    expect(mockYouTubeHandler.canHandleUrl).toHaveBeenCalled();
    expect(fetchWebPageContent).not.toHaveBeenCalled(); // No need to fetch content
  });
  
  it('should use cache for subsequent lookups', async () => {
    // Set up the handler to detect YouTube URLs
    mockYouTubeHandler.canHandleUrl = vi.fn().mockImplementation(async (url) => {
      return url.hostname === 'www.youtube.com';
    });
    
    registry.register(mockYouTubeHandler);
    
    // First lookup should call canHandleUrl
    await registry.detectContentType('https://www.youtube.com/watch?v=123456');
    
    // Second lookup should use cache
    const handler = await registry.detectContentType('https://www.youtube.com/watch?v=123456');
    
    expect(handler).toBe(mockYouTubeHandler);
    expect(mockYouTubeHandler.canHandleUrl).toHaveBeenCalledTimes(1);
  });
  
  it('should fall back to content-based detection when URL detection fails', async () => {
    // Set up all handlers to fail URL detection
    mockYouTubeHandler.canHandleUrl = vi.fn().mockResolvedValue(false);
    mockMediumHandler.canHandleUrl = vi.fn().mockResolvedValue(false);
    mockGenericHandler.canHandleUrl = vi.fn().mockResolvedValue(false);
    
    // Only generic handler requires content detection
    mockYouTubeHandler.requiresContentDetection = vi.fn().mockReturnValue(false);
    mockMediumHandler.requiresContentDetection = vi.fn().mockReturnValue(false);
    mockGenericHandler.requiresContentDetection = vi.fn().mockReturnValue(true);
    
    // Set up fetchWebPageContent mock to return some HTML
    (fetchWebPageContent as any).mockResolvedValue('<html><body>Some website content</body></html>');
    
    // LLM provider should return 'generic' for content detection
    mockLLMProvider.callLLM = vi.fn().mockResolvedValue('generic');
    
    registry.register(mockYouTubeHandler);
    registry.register(mockMediumHandler);
    registry.register(mockGenericHandler);
    
    const handler = await registry.detectContentType('https://example.com/article');
    
    expect(handler).toBe(mockGenericHandler);
    expect(fetchWebPageContent).toHaveBeenCalled();
    expect(mockLLMProvider.callLLM).toHaveBeenCalled();
  });
  
  it('should throw error if no handler is found', async () => {
    // Set up all handlers to fail detection
    mockYouTubeHandler.canHandleUrl = vi.fn().mockResolvedValue(false);
    mockMediumHandler.canHandleUrl = vi.fn().mockResolvedValue(false);
    
    registry.register(mockYouTubeHandler);
    registry.register(mockMediumHandler);
    
    await expect(registry.detectContentType('https://example.com/article'))
      .rejects.toThrow('Could not determine content type for this URL');
  });
  
  it('should throw error on invalid URL', async () => {
    registry.register(mockYouTubeHandler);
    
    await expect(registry.detectContentType('invalid-url'))
      .rejects.toThrow('Invalid URL format');
  });
  
  it('should clear cache when requested', async () => {
    // Set up the handler to detect YouTube URLs
    mockYouTubeHandler.canHandleUrl = vi.fn().mockImplementation(async (url) => {
      return url.hostname === 'www.youtube.com';
    });
    
    registry.register(mockYouTubeHandler);
    
    // First lookup
    await registry.detectContentType('https://www.youtube.com/watch?v=123456');
    
    // Clear cache
    registry.clearCache();
    
    // Second lookup should not use cache
    await registry.detectContentType('https://www.youtube.com/watch?v=123456');
    
    expect(mockYouTubeHandler.canHandleUrl).toHaveBeenCalledTimes(2);
  });
});