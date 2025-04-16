// Mock the Obsidian API for all tests in this file
vi.mock('obsidian');
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ImportPipelineOrchestrator, ImportPipelineProgress } from '../../src/orchestrator/ImportPipelineOrchestrator';
import { ContentTypeRegistry } from '../../src/handlers/ContentTypeRegistry';

describe('ImportPipelineOrchestrator - Enhanced Progress Reporting', () => {
  let orchestrator: ImportPipelineOrchestrator;
  let mockRegistry: any;
  let mockHandler: any;
  let mockLLMProvider: any;
  let mockNoteWriter: any;
  let mockSettings: any;
  let mockLogger: any;
  let progressEvents: ImportPipelineProgress[];
  let errorEvents: any[];
  let completeEvents: string[];
  const fakeUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
  const fakeNotePath = '/vault/Imported Notes/YouTube/Test Video Title.md';
  
  beforeEach(() => {
    // Reset arrays for tracking emitted events
    progressEvents = [];
    errorEvents = [];
    completeEvents = [];
    
    // Create mock logger
    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debugLog: vi.fn()
    };

    // Create mock handler
    mockHandler = {
      type: 'youtube',
      detect: vi.fn().mockReturnValue(true),
      canHandleUrl: vi.fn().mockResolvedValue(true),
      requiresContentDetection: vi.fn().mockReturnValue(false),
      getRequiredApiKeys: vi.fn().mockReturnValue([]),
      // Ensure the download method doesn't throw an error
      download: vi.fn().mockResolvedValue({
        unifiedContent: { 
          title: 'Test Video Title', 
          videoId: 'dQw4w9WgXcQ', 
          url: fakeUrl,
          type: 'youtube'
        }
      }),
      getPrompt: vi.fn().mockReturnValue('Test prompt'),
      parseLLMResponse: vi.fn().mockReturnValue({ summary: 'Test summary' }),
      validateLLMOutput: vi.fn().mockReturnValue(true),
      getFolderName: vi.fn().mockReturnValue('YouTube'),
      getNoteContent: vi.fn().mockReturnValue('# Test content')
    };

    // Create mock ContentTypeRegistry
    mockRegistry = {
      detectContentType: vi.fn().mockResolvedValue(mockHandler),
      getCachedContent: vi.fn().mockReturnValue(undefined)
    };

    // Create mock LLM provider
    mockLLMProvider = {
      callLLM: vi.fn().mockResolvedValue('# Test LLM response')
    };

    // Create mock note writer
    mockNoteWriter = {
      writeNote: vi.fn().mockResolvedValue(fakeNotePath)
    };

    // Create mock settings
    mockSettings = {
      defaultFolder: 'Imported Notes'
    };

    // Create the orchestrator with mocked dependencies
    orchestrator = new ImportPipelineOrchestrator({
      settings: mockSettings,
      llmProvider: mockLLMProvider,
      noteWriter: mockNoteWriter,
      logger: mockLogger,
      contentTypeRegistry: mockRegistry
    });

    // Set up event listeners
    orchestrator.onProgress((progress) => {
      progressEvents.push(progress);
    });
    orchestrator.onError((error) => {
      errorEvents.push(error);
    });
    orchestrator.onComplete((notePath) => {
      completeEvents.push(notePath);
    });
  });

  it('should emit progress events with step count and percentages', async () => {
    await orchestrator.run(fakeUrl);
    
    // Verify correct number of progress events
    expect(progressEvents.length).toBe(6); // 5 stages + completion
    
    // Verify step information in progress events
    expect(progressEvents[0].stage).toBe('validating_url');
    expect(progressEvents[0].step).toBe(1);
    expect(progressEvents[0].totalSteps).toBe(5);
    expect(progressEvents[0].message).toBe('Validating URL');
    
    expect(progressEvents[1].stage).toBe('detecting_content_type');
    expect(progressEvents[1].step).toBe(2);
    expect(progressEvents[1].totalSteps).toBe(5);
    expect(progressEvents[1].message).toBe('Detecting content type');
    
    expect(progressEvents[2].stage).toBe('downloading_content');
    expect(progressEvents[2].step).toBe(3);
    expect(progressEvents[2].totalSteps).toBe(5);
    expect(progressEvents[2].message).toBe('Downloading youtube content');
    expect(progressEvents[2].contentType).toBe('youtube');
    
    expect(progressEvents[3].stage).toBe('processing_with_llm');
    expect(progressEvents[3].step).toBe(4);
    expect(progressEvents[3].totalSteps).toBe(5);
    
    expect(progressEvents[4].stage).toBe('writing_note');
    expect(progressEvents[4].step).toBe(5);
    expect(progressEvents[4].totalSteps).toBe(5);
    
    // Completion event is special and doesn't have step/total
    expect(progressEvents[5].stage).toBe('completed');
    expect(progressEvents[5].notePath).toBe(fakeNotePath);
    expect(progressEvents[5].message).toBeDefined();
  });

  it('should emit complete event with note path', async () => {
    await orchestrator.run(fakeUrl);
    
    expect(completeEvents.length).toBe(1);
    expect(completeEvents[0]).toBe(fakeNotePath);
  });

  it('should include handler-specific content type information', async () => {
    // Set up a different handler type for testing
    mockHandler.type = 'medium';
    await orchestrator.run(fakeUrl);
    
    // Verify content type in progress event
    const downloadEvent = progressEvents.find(p => p.stage === 'downloading_content');
    expect(downloadEvent?.contentType).toBe('medium');
    expect(downloadEvent?.message).toBe('Downloading medium content');
  });
});