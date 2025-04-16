// Mock the Obsidian API for all tests in this file. See tests/__mocks__/obsidian.ts for details.
vi.mock('obsidian');
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ImportPipelineOrchestrator, LLMProvider, ImportPipelineProgress } from '../../src/orchestrator/ImportPipelineOrchestrator';
import { ContentTypeRegistry } from '../../src/handlers/ContentTypeRegistry';
import { ContentTypeHandler, ContentMetadata } from '../../src/handlers/ContentTypeHandler';
import { LLMOutput, LLMOptions } from '../../src/services/LLMProvider';

describe('ImportPipelineOrchestrator - V2 Implementation', () => {
  let orchestrator: ImportPipelineOrchestrator;
  let mockRegistry: ContentTypeRegistry;
  let mockHandler: ContentTypeHandler;
  let mockLLMProvider: LLMProvider;
  let mockNoteWriter: any;
  let mockSettings: any;
  let mockLogger: any;
  let progressEvents: ImportPipelineProgress[];
  let errorEvents: any[];

  // Test constants
  const fakeUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
  const fakeTitle = 'Test Video Title';
  const fakeVideoId = 'dQw4w9WgXcQ';
  const fakeMetadata: ContentMetadata = { 
    title: fakeTitle, 
    videoId: fakeVideoId, 
    url: fakeUrl,
    importTimestamp: new Date().toISOString(),
    type: 'youtube' 
  };
  const fakeLLMPrompt = 'Analyze this YouTube video content: Test content';
  const fakeLLMResponse = '# Test Video Analysis\n\n## Summary\nThis is a test summary.\n\n## Key Points\n- Point 1\n- Point 2';
  const fakeNotePath = '/vault/Imported Notes/YouTube/Test Video Title.md';
  const fakeParsedOutput: LLMOutput = { summary: 'This is a test summary.', keyPoints: ['Point 1', 'Point 2'] };

  beforeEach(() => {
    // Reset arrays for tracking emitted events
    progressEvents = [];
    errorEvents = [];
    
    // Create mock logger
    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debugLog: vi.fn()
    };

    // Create a mock handler that matches the current ContentTypeHandler interface
    mockHandler = {
      type: 'youtube',
      detect: vi.fn().mockReturnValue(true),
      canHandleUrl: vi.fn().mockResolvedValue(true),
      requiresContentDetection: vi.fn().mockReturnValue(false),
      getRequiredApiKeys: vi.fn().mockReturnValue([]),
      download: vi.fn().mockResolvedValue({ unifiedContent: fakeMetadata }),
      getPrompt: vi.fn().mockReturnValue(fakeLLMPrompt),
      parseLLMResponse: vi.fn().mockReturnValue(fakeParsedOutput),
      validateLLMOutput: vi.fn().mockReturnValue(true),
      getFolderName: vi.fn().mockReturnValue('YouTube'),
      getNoteContent: vi.fn().mockReturnValue(fakeLLMResponse),
    };

    // Create mock ContentTypeRegistry
    mockRegistry = {
      detectContentType: vi.fn().mockResolvedValue(mockHandler),
      register: vi.fn(),
      getHandlers: vi.fn().mockReturnValue([mockHandler]),
      getHandlerByType: vi.fn().mockReturnValue(mockHandler),
      getCachedContent: vi.fn().mockReturnValue(undefined),
      clearCache: vi.fn(),
      getCacheSize: vi.fn().mockReturnValue(0),
    } as any;

    // Create mock LLM provider
    mockLLMProvider = {
      callLLM: vi.fn().mockResolvedValue(fakeLLMResponse),
      getName: vi.fn().mockReturnValue('MockProvider'),
      getDefaultEndpoint: vi.fn().mockReturnValue('https://api.example.com'),
      getAvailableModels: vi.fn().mockResolvedValue([]),
      validateConnection: vi.fn().mockResolvedValue(true),
      requiresApiKey: vi.fn().mockReturnValue(true),
      requiresEndpoint: vi.fn().mockReturnValue(true)
    };

    // Create mock note writer
    mockNoteWriter = {
      writeNote: vi.fn().mockResolvedValue(fakeNotePath)
    };

    // Create mock settings
    mockSettings = {
      defaultFolder: 'Imported Notes',
      apiKey: 'test-api-key',
      model: 'gpt-4',
      selectedProvider: 'requesty',
      providerSettings: {
        requesty: { apiKey: 'test-api-key', endpoint: 'https://api.example.com', model: 'gpt-4' }
      }
    };

    // Create the orchestrator with mocked dependencies
    orchestrator = new ImportPipelineOrchestrator({
      settings: mockSettings,
      llmProvider: mockLLMProvider as any,
      noteWriter: mockNoteWriter,
      logger: mockLogger,
      contentTypeRegistry: mockRegistry as any
    });

    // Set up event listeners
    orchestrator.onProgress((progress) => {
      progressEvents.push(progress);
    });
    orchestrator.onError((error) => {
      errorEvents.push(error);
    });
  });

  it('should use ContentTypeRegistry for content type detection', async () => {
    await orchestrator.run(fakeUrl);
    
    expect(mockRegistry.detectContentType).toHaveBeenCalledWith(fakeUrl);
    expect(mockLogger.debugLog).toHaveBeenCalledWith(expect.stringContaining('Using ContentTypeRegistry'));
  });

  it('should emit correct progress events throughout the pipeline', async () => {
    await orchestrator.run(fakeUrl);
    
    // Verify all expected progress events were emitted
    expect(progressEvents.length).toBe(6);
    expect(progressEvents[0].stage).toBe('validating_url');
    expect(progressEvents[1].stage).toBe('detecting_content_type');
    expect(progressEvents[2].stage).toBe('downloading_content');
    expect(progressEvents[3].stage).toBe('processing_with_llm');
    expect(progressEvents[4].stage).toBe('writing_note');
    expect(progressEvents[5].stage).toBe('completed');
    expect((progressEvents[5] as any).notePath).toBe(fakeNotePath);
  });

  it('should handle the full import pipeline with the correct handler', async () => {
    await orchestrator.run(fakeUrl);
    
    expect(mockHandler.download).toHaveBeenCalledWith(fakeUrl, undefined);
    expect(mockHandler.getPrompt).toHaveBeenCalledWith(fakeMetadata);
    expect(mockLLMProvider.callLLM).toHaveBeenCalledWith(fakeLLMPrompt, expect.any(Object));
    expect(mockHandler.validateLLMOutput).toHaveBeenCalled();
    expect(mockHandler.getFolderName).toHaveBeenCalledWith(fakeMetadata);
    expect(mockHandler.getNoteContent).toHaveBeenCalledWith(fakeLLMResponse, fakeMetadata);
    expect(mockNoteWriter.writeNote).toHaveBeenCalledWith(
      'Imported Notes/YouTube',
      expect.stringContaining('Test Video Title.md'),
      fakeLLMResponse
    );
  });

  it('should use cached content when available', async () => {
    const cachedContent = 'Cached web page content';
    (mockRegistry.getCachedContent as any).mockReturnValue(cachedContent);
    
    await orchestrator.run(fakeUrl);
    
    expect(mockHandler.download).toHaveBeenCalledWith(fakeUrl, cachedContent);
  });

  it('should emit error when content type is not supported', async () => {
    (mockRegistry.detectContentType as any).mockResolvedValue(null);
    
    await orchestrator.run(fakeUrl);
    
    expect(errorEvents.length).toBe(1);
    expect(errorEvents[0].stage).toBe('validating_url');
    expect(errorEvents[0].userMessage).toContain('not supported');
  });

  it('should emit error when LLM call fails', async () => {
    const error = new Error('API key invalid');
    (mockLLMProvider.callLLM as any).mockRejectedValue(error);
    
    await orchestrator.run(fakeUrl);
    
    expect(errorEvents.length).toBe(1);
    expect(errorEvents[0].stage).toBe('processing_with_llm');
    expect(errorEvents[0].userMessage).toContain('API key');
  });

  it('should emit error when LLM output validation fails', async () => {
    (mockHandler.validateLLMOutput as any).mockReturnValue(false);
    
    await orchestrator.run(fakeUrl);
    
    expect(errorEvents.length).toBe(1);
    expect(errorEvents[0].stage).toBe('processing_with_llm');
    expect(errorEvents[0].userMessage).toContain('AI processing failed');
  });

  it('should emit error when note writing fails', async () => {
    const error = new Error('Permission denied');
    error.code = 'EACCES';
    (mockNoteWriter.writeNote as any).mockRejectedValue(error);
    
    await orchestrator.run(fakeUrl);
    
    expect(errorEvents.length).toBe(1);
    expect(errorEvents[0].stage).toBe('writing_note');
    expect(errorEvents[0].userMessage).toContain('Permission denied');
  });

  it('should handle invalid URL', async () => {
    await orchestrator.run('not-a-url');
    
    expect(errorEvents.length).toBe(1);
    expect(errorEvents[0].stage).toBe('validating_url');
    expect(errorEvents[0].userMessage).toContain('Invalid URL format');
  });

  it('should handle download errors', async () => {
    const error = new Error('Network error');
    (mockHandler.download as any).mockRejectedValue(error);
    
    await orchestrator.run(fakeUrl);
    
    expect(errorEvents.length).toBe(1);
    expect(errorEvents[0].stage).toBe('downloading_content');
    expect(errorEvents[0].userMessage).toContain('Failed to download content');
  });
});