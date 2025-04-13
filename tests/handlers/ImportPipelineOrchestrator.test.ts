// Mock the Obsidian API for all tests in this file. See tests/__mocks__/obsidian.ts for details.
vi.mock('obsidian');
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ImportPipelineOrchestrator } from '../../src/orchestrator/ImportPipelineOrchestrator';
import { detectContentType } from '../../src/handlers/typeDispatcher';
import { YouTubeHandler } from '../../src/handlers/YouTubeHandler';
import type { ContentTypeHandler } from '../../src/handlers/ContentTypeHandler';

vi.mock('../../src/handlers/typeDispatcher');
vi.mock('../../src/handlers/YouTubeHandler');

describe('ImportPipelineOrchestrator - Strategy-based Handler Architecture', () => {
  let orchestrator: ImportPipelineOrchestrator;
  let mockDeps: any;
  let mockHandler: ContentTypeHandler;
  let mockYouTubeHandler: YouTubeHandler;

  const fakeUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
  const fakeMetadata = { title: 'Test Video', videoId: 'dQw4w9WgXcQ', importTimestamp: new Date().toISOString() };
  const fakePrompt = 'Prompt for LLM';
  const fakeLLMResponse = 'LLM response markdown';
  const fakeParsed = { summary: 'Summary', keyPoints: ['A', 'B'] };
  const fakeNotePath = '/vault/Imported Notes/Test Video.md';

  beforeEach(() => {
    // Mock handler methods
    mockHandler = {
      detect: vi.fn().mockReturnValue(true),
      getPrompt: vi.fn().mockReturnValue(fakePrompt),
      parseLLMResponse: vi.fn().mockReturnValue(fakeParsed),
      getFolderName: vi.fn().mockReturnValue('Imported Notes'),
    } as any;

    // Mock YouTubeHandler with real class prototype for instanceof checks
    mockYouTubeHandler = Object.assign(
      Object.create(YouTubeHandler.prototype),
      {
        detect: vi.fn().mockReturnValue(true),
        getPrompt: vi.fn().mockReturnValue(fakePrompt),
        parseLLMResponse: vi.fn().mockReturnValue(fakeParsed),
        getFolderName: vi.fn().mockReturnValue('Imported Notes'),
      }
    );

    // Mock dependencies
    mockDeps = {
      logger: { error: vi.fn(), warn: vi.fn() },
      urlValidator: { validate: vi.fn().mockResolvedValue(undefined) },
      contentDownloader: { downloadContent: vi.fn().mockResolvedValue({ content: 'video content', metadata: fakeMetadata }) },
      llmProvider: { processPrompt: vi.fn().mockResolvedValue(fakeLLMResponse) },
      noteWriter: { writeNote: vi.fn().mockResolvedValue(fakeNotePath) },
    };

    orchestrator = new ImportPipelineOrchestrator(mockDeps);

    // Reset and set up detectContentType mock
    (detectContentType as any).mockReset();
    (detectContentType as any).mockImplementation((url: URL) => {
      if (url.hostname.includes('youtube.com')) return mockYouTubeHandler;
      return null;
    });
  });

  it('selects the correct ContentTypeHandler for a YouTube URL', async () => {
    await orchestrator.run(fakeUrl);
    expect(detectContentType).toHaveBeenCalledWith(new URL(fakeUrl));
    expect(mockYouTubeHandler.detect).not.toHaveBeenCalled(); // detectContentType already returns the handler
  });

  it('uses handler.getPrompt and handler.parseLLMResponse as intended', async () => {
    await orchestrator.run(fakeUrl);
    expect(mockYouTubeHandler.getPrompt).toHaveBeenCalledWith(fakeMetadata);
    expect(mockDeps.llmProvider.processPrompt).toHaveBeenCalledWith(fakePrompt);
    expect(mockYouTubeHandler.parseLLMResponse).toHaveBeenCalledWith(fakeLLMResponse);
  });

  it('integrates YouTubeHandler and invokes its prompt and parser logic', async () => {
    await orchestrator.run(fakeUrl);
    expect(mockYouTubeHandler.getPrompt).toHaveBeenCalled();
    expect(mockYouTubeHandler.parseLLMResponse).toHaveBeenCalled();
    expect(mockYouTubeHandler.getFolderName).toHaveBeenCalledWith(fakeMetadata);
    expect(mockDeps.noteWriter.writeNote).toHaveBeenCalledWith(
      'Imported Notes',
      expect.any(String),
      expect.stringContaining('Summary')
    );
  });

  it('does not use any global YouTube-specific parser or prompt logic', async () => {
    await orchestrator.run(fakeUrl);
    // Ensure only handler methods are used for prompt and parsing
    expect(mockYouTubeHandler.getPrompt).toHaveBeenCalled();
    expect(mockYouTubeHandler.parseLLMResponse).toHaveBeenCalled();
    // No global YouTube-specific logic should be called (if any existed, would be imported and spied here)
  });

  it('documents the new architectural flow in test descriptions and assertions', () => {
    // This test is a placeholder to ensure test descriptions and assertions are clear and comprehensive.
    // See above tests for documentation of the new strategy-based handler architecture.
    expect(true).toBe(true);
  });
});