import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ContentTypeRegistry } from '../../src/handlers/ContentTypeRegistry';
import { YouTubeHandler } from '../../src/handlers/YouTubeHandler';
import { ImportPipelineOrchestrator } from '../../src/orchestrator/ImportPipelineOrchestrator';

// Mock the logger, URL fetching, and other dependencies
vi.mock('../../src/utils/importerLogger', () => ({
  getLogger: () => ({
    debugLog: vi.fn(),
    error: vi.fn(),
    warn: vi.fn()
  })
}));

// Mock the YouTube transcript service
vi.mock('../../src/services/YouTubeTranscriptService', () => ({
  extractTranscriptFromHtml: vi.fn().mockResolvedValue("Test transcript content")
}));

// Mock the YouTube utility functions
vi.mock('../../src/utils/youtube', () => ({
  extractYouTubeVideoId: vi.fn().mockReturnValue('testVideoId'),
  generateYouTubeEmbedHtml: vi.fn().mockReturnValue('<iframe src="test"></iframe>')
}));

// Mock Obsidian's requestUrl function
vi.mock('obsidian', () => ({
  requestUrl: vi.fn().mockResolvedValue({
    text: `<html>
      <head>
        <meta property="og:title" content="Test Video">
        <meta property="og:image" content="thumbnail.jpg">
        <meta property="og:image:width" content="1280">
        <meta property="og:image:height" content="720">
      </head>
      <body>
        <script>
          "author":"Test Channel",
          "channelId":"TestChannelID"
        </script>
      </body>
    </html>`
  })
}));

describe('ContentTypeRegistry Integration Tests', () => {
  let registry: ContentTypeRegistry;
  let orchestrator: ImportPipelineOrchestrator;
  let mockLLMProvider: any;
  let mockNoteWriter: any;
  
  beforeEach(() => {
    // Create a new registry with YouTubeHandler
    registry = new ContentTypeRegistry();
    
    // Create a real YouTube handler but spy on its methods
    const youtubeHandler = new YouTubeHandler();
    vi.spyOn(youtubeHandler, 'detect');
    vi.spyOn(youtubeHandler, 'download');
    vi.spyOn(youtubeHandler, 'getPrompt');
    vi.spyOn(youtubeHandler, 'parseLLMResponse');
    vi.spyOn(youtubeHandler, 'validateLLMOutput').mockReturnValue(true);
    
    registry.register(youtubeHandler);
    
    // Mock the LLM provider and note writer
    mockLLMProvider = {
      callLLM: vi.fn().mockResolvedValue("## Summary\nTest summary\n\n## Key points\n- Point 1\n- Point 2\n\n## Technical terms\n- **[[Term 1]]**: Explanation 1\n- **[[Term 2]]**: Explanation 2\n\n## Conclusion\nTest conclusion")
    };
    
    mockNoteWriter = {
      writeNote: vi.fn().mockResolvedValue('/TestFolder/Test Video.md')
    };
    
    // Create orchestrator with mocked dependencies and our registry
    orchestrator = new ImportPipelineOrchestrator({
      settings: { defaultFolder: 'TestFolder' } as any,
      llmProvider: mockLLMProvider,
      noteWriter: mockNoteWriter,
      logger: {
        debugLog: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        info: vi.fn()
      },
      contentTypeRegistry: registry
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should detect YouTube URLs and process them successfully through the orchestrator', async () => {
    // Set up progress tracking
    const progressStages: string[] = [];
    orchestrator.onProgress((progress) => {
      progressStages.push(progress.stage);
    });
    
    // Get the handler for spying
    const youtubeHandler = registry.getHandlers()[0] as YouTubeHandler;
    
    // Test URL
    const youtubeUrl = 'https://www.youtube.com/watch?v=testVideoId';
    
    // Run the orchestrator
    await orchestrator.run(youtubeUrl);
    
    // Verify detection worked (via registry now)
    expect(await registry.detectContentType(youtubeUrl)).toBe(youtubeHandler);
    
    // Verify LLM was called
    expect(mockLLMProvider.callLLM).toHaveBeenCalled();
    
    // Verify note was written
    expect(mockNoteWriter.writeNote).toHaveBeenCalled();
    expect(mockNoteWriter.writeNote.mock.calls[0][0]).toContain('YouTube');
    
    // Verify we went through all pipeline stages
    expect(progressStages).toContain('validating_url');
    expect(progressStages).toContain('downloading_content');
    expect(progressStages).toContain('processing_with_llm');
    expect(progressStages).toContain('writing_note');
    expect(progressStages).toContain('completed');
  });

  it('should use the cache for repeated URL detection', async () => {
    const youtubeUrl = 'https://www.youtube.com/watch?v=cacheTestId';
    
    // First call should detect and cache
    const handler1 = await registry.detectContentType(youtubeUrl);
    expect(handler1).toBeInstanceOf(YouTubeHandler);
    
    // Get the handler instance
    const youtubeHandler = registry.getHandlers()[0] as YouTubeHandler;
    
    // Reset the detect method to verify it's not called on the second try
    const detectSpy = vi.spyOn(youtubeHandler, 'detect').mockClear();
    
    // Second call should use cache
    const handler2 = await registry.detectContentType(youtubeUrl);
    expect(handler2).toBeInstanceOf(YouTubeHandler);
    
    // Verify the detect method wasn't called again
    expect(detectSpy).not.toHaveBeenCalled();
    
    // Verify cache size
    expect(registry.getCacheSize()).toBe(1);
  });
});