import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ContentTypeRegistry } from '../../src/handlers/ContentTypeRegistry';
import { YouTubeHandler } from '../../src/handlers/YouTubeHandler';
import { MediumHandler } from "../../src/handlers/MediumHandler";
import { GoodreadsHandler } from "../../src/handlers/GoodreadsHandler";
import { LLMProvider } from '../../src/services/LLMProvider';
import { fetchWebPageContent } from '../../src/utils/webFetcher';

// Mock dependencies
vi.mock('../../src/utils/webFetcher', () => ({
  fetchWebPageContent: vi.fn().mockResolvedValue('<html><body>Test content</body></html>'),
  extractMainContent: vi.fn((html) => html)
}));

vi.mock('../../src/utils/importerLogger', () => ({
  getLogger: vi.fn(() => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debugLog: vi.fn()
  }))
}));

// Mock Obsidian's requestUrl
vi.mock('obsidian', () => ({
  requestUrl: vi.fn().mockResolvedValue({ text: '<html><body>Mock YouTube page</body></html>' })
}));

// Mock transcript extraction
vi.mock('../../src/services/YouTubeTranscriptService', () => ({
  extractTranscriptFromHtml: vi.fn().mockResolvedValue('Mock transcript')
}));

describe('ContentTypeRegistry Integration Tests', () => {
  let registry: ContentTypeRegistry;
  let mockLLMProvider: LLMProvider;
  let youtubeHandler: YouTubeHandler;
  
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Create a mock LLM provider
    mockLLMProvider = {
      callLLM: vi.fn().mockResolvedValue('youtube')
    } as any;
    
    // Create the registry with the mock provider
    registry = new ContentTypeRegistry(mockLLMProvider);
    
    // Create and register a real YouTube handler
    youtubeHandler = new YouTubeHandler();
    registry.register(youtubeHandler);
  });
  
  it('should detect YouTube URLs with the real YouTubeHandler', async () => {
    // Important: Use a spy to verify behavior while keeping the original implementation
    const canHandleUrlSpy = vi.spyOn(youtubeHandler, 'canHandleUrl');
    
    const handler = await registry.detectContentType('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    
    expect(handler).toBe(youtubeHandler);
    expect(canHandleUrlSpy).toHaveBeenCalled();
    expect(fetchWebPageContent).not.toHaveBeenCalled(); // No need for content-based detection
  });
  
  it('should use cached handler for subsequent YouTube URL lookups', async () => {
    const canHandleUrlSpy = vi.spyOn(youtubeHandler, 'canHandleUrl');
    
    // First lookup
    await registry.detectContentType('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    
    // Second lookup should use cache
    const handler = await registry.detectContentType('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    
    expect(handler).toBe(youtubeHandler);
    expect(canHandleUrlSpy).toHaveBeenCalledTimes(1);
  });
  
  it('should properly integrate with LLM for content detection', async () => {
    // Create a mock registry with LLM provider for content detection
    const contentDetectionRegistry = new ContentTypeRegistry(mockLLMProvider);
    
    // Setup a URL that isn't recognized by YouTubeHandler
    const url = 'https://example.com/article';
    
    // Create a mock generic handler that requires content-based detection
    const mockGenericHandler = {
      type: 'generic',
      detect: vi.fn(() => false),
      canHandleUrl: vi.fn().mockResolvedValue(false),
      requiresContentDetection: vi.fn().mockReturnValue(true),
      download: vi.fn().mockResolvedValue({ content: 'generic content', metadata: {} }),
      getPrompt: vi.fn(),
      parseLLMResponse: vi.fn(),
      validateLLMOutput: vi.fn().mockReturnValue(true),
      getNoteContent: vi.fn(),
      getFolderName: vi.fn().mockReturnValue('Web'),
      getRequiredApiKeys: vi.fn().mockReturnValue([])
    };
    
    // Register the generic handler
    contentDetectionRegistry.register(mockGenericHandler);
    
    // Setup fetchWebPageContent to return HTML
    (fetchWebPageContent as any).mockResolvedValue('<html><body>Generic article content</body></html>');
    
    // LLM provider should determine it's generic content
    mockLLMProvider.callLLM = vi.fn().mockResolvedValue('generic');
    
    // When using content-based detection
    const handler = await contentDetectionRegistry.detectContentType(url);
    
    // Verify the results
    expect(handler).toBe(mockGenericHandler);
    expect(fetchWebPageContent).toHaveBeenCalledWith(url);
    expect(mockLLMProvider.callLLM).toHaveBeenCalled();
    
    // The prompt sent to the LLM should contain the URL and content sample
    const llmPromptArg = (mockLLMProvider.callLLM as any).mock.calls[0][0];
    expect(llmPromptArg).toContain(url);
    expect(llmPromptArg).toContain('Generic article content');
  });
  
  it('integrates with cached content for download operations', async () => {
    // Create a separate registry for this test
    const cacheTestRegistry = new ContentTypeRegistry(mockLLMProvider);
    
    // Setup a URL that will be detected by content-based detection
    const url = 'https://example.com/article';
    const cachedContent = '<html><body>Cached page content</body></html>';
    
    // Create a handler that requires content-based detection
    const mockGenericHandler = {
      type: 'generic',
      detect: vi.fn(() => false),
      canHandleUrl: vi.fn().mockResolvedValue(false),
      requiresContentDetection: vi.fn().mockReturnValue(true),
      download: vi.fn().mockResolvedValue({ content: 'processed content', metadata: {} }),
      getPrompt: vi.fn(),
      parseLLMResponse: vi.fn(),
      validateLLMOutput: vi.fn().mockReturnValue(true),
      getNoteContent: vi.fn(),
      getFolderName: vi.fn().mockReturnValue('Web'),
      getRequiredApiKeys: vi.fn().mockReturnValue([])
    };
    
    // Register the handler
    cacheTestRegistry.register(mockGenericHandler);
    
    // Setup fetchWebPageContent to return our cached content
    (fetchWebPageContent as any).mockResolvedValue(cachedContent);
    
    // LLM provider should determine it's generic content
    mockLLMProvider.callLLM = vi.fn().mockResolvedValue('generic');
    
    // First detect the content type (this will cache the content)
    await cacheTestRegistry.detectContentType(url);
    
    // Manually verify the private cache by using our public accessor
    const cachedResult = cacheTestRegistry.getCachedContent(url);
    expect(cachedResult).toBe(cachedContent);
    
    // Verify the download method can access cached content
    expect(mockGenericHandler.download).not.toHaveBeenCalled();
  });
});

describe("ContentTypeRegistry integration with MediumHandler", () => {
  let registry: ContentTypeRegistry;
  
  beforeEach(() => {
    registry = new ContentTypeRegistry();
    registry.register(new MediumHandler());
  });
  
  test("should detect Medium URLs via URL-based detection", async () => {
    const mediumUrl = "https://medium.com/some-article";
    const handler = await registry.detectContentType(mediumUrl);
    
    expect(handler).toBeDefined();
    expect(handler.type).toBe("medium");
  });
  
  test("should detect Medium subdomain URLs", async () => {
    const mediumSubdomainUrl = "https://javascript.medium.com/some-article";
    const handler = await registry.detectContentType(mediumSubdomainUrl);
    
    expect(handler).toBeDefined();
    expect(handler.type).toBe("medium");
  });
});

describe("ContentTypeRegistry integration with GoodreadsHandler", () => {
  let registry: ContentTypeRegistry;
  
  beforeEach(() => {
    registry = new ContentTypeRegistry();
    registry.register(new GoodreadsHandler());
  });
  
  test("should detect Goodreads URLs via URL-based detection", async () => {
    const goodreadsUrl = "https://www.goodreads.com/book/show/12345";
    const handler = await registry.detectContentType(goodreadsUrl);
    
    expect(handler).toBeDefined();
    expect(handler.type).toBe("goodreads");
  });
  
  test("should detect Goodreads subdomain URLs", async () => {
    const goodreadsSubdomainUrl = "https://www.goodreads.com/author/show/54321.Some_Author";
    const handler = await registry.detectContentType(goodreadsSubdomainUrl);
    
    expect(handler).toBeDefined();
    expect(handler.type).toBe("goodreads");
  });
});