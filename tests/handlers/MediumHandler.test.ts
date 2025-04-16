// filepath: /Users/karl/Documents/dev/obsidian-importer/tests/handlers/MediumHandler.test.ts
import { MediumHandler, MediumArticleData, MediumLLMOutput } from '../../src/handlers/MediumHandler';
import { describe, expect, test, vi, beforeEach } from 'vitest';
import { getLogger } from '../../src/utils/importerLogger';
import * as webFetcher from '../../src/utils/webFetcher';

// Mock the logger
vi.mock('../../src/utils/importerLogger', () => ({
  getLogger: () => ({
    debugLog: vi.fn(),
    infoLog: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  })
}));

// Mock the web fetcher
vi.mock('../../src/utils/webFetcher', () => ({
  fetchWebPageContent: vi.fn(),
  extractMainContent: vi.fn()
}));

describe('MediumHandler', () => {
  let handler: MediumHandler;
  
  beforeEach(() => {
    handler = new MediumHandler();
    vi.clearAllMocks();
  });

  describe('URL detection', () => {
    test('should detect medium.com URLs', () => {
      expect(handler.detect(new URL('https://medium.com/article'))).toBe(true);
    });

    test('should detect subdomain medium URLs', () => {
      expect(handler.detect(new URL('https://javascript.medium.com/article'))).toBe(true);
    });

    test('should not detect non-medium URLs', () => {
      expect(handler.detect(new URL('https://example.com'))).toBe(false);
    });
    
    test('canHandleUrl should match detect result', async () => {
      const mediumUrl = new URL('https://medium.com/article');
      const nonMediumUrl = new URL('https://example.com');
      
      expect(await handler.canHandleUrl(mediumUrl)).toBe(handler.detect(mediumUrl));
      expect(await handler.canHandleUrl(nonMediumUrl)).toBe(handler.detect(nonMediumUrl));
    });
  });

  describe('Content detection', () => {
    test('should not require content detection', () => {
      expect(handler.requiresContentDetection()).toBe(false);
    });
    
    test('should not require any API keys', () => {
      expect(handler.getRequiredApiKeys()).toEqual([]);
    });
    
    test('should return correct folder name', () => {
      expect(handler.getFolderName()).toBe('Medium');
    });
  });

  describe('download', () => {
    const mockMediumHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Test Article - Medium</title>
          <meta property="og:title" content="Test Medium Article">
          <meta name="author" content="John Doe">
          <meta property="article:published_time" content="2023-04-16T10:30:15Z">
        </head>
        <body>
          <article>
            <h1>Test Medium Article</h1>
            <div class="author">John Doe</div>
            <div class="reading-time">5 min read</div>
            <p>This is a test article content.</p>
            <p>It contains multiple paragraphs.</p>
          </article>
        </body>
      </html>
    `;
    
    test('should download and extract Medium article data', async () => {
      const mockUrl = 'https://medium.com/test-article';
      
      vi.mocked(webFetcher.fetchWebPageContent).mockResolvedValue(mockMediumHtml);
      
      const { unifiedContent } = await handler.download(mockUrl);
      
      expect(unifiedContent).toBeDefined();
      expect(unifiedContent.title).toBe('Test Medium Article');
      expect(unifiedContent.author).toBe('John Doe');
      expect(unifiedContent.url).toBe(mockUrl);
      expect(unifiedContent.content).toContain('This is a test article content');
      expect(unifiedContent.readingTime).toBe('5 min read');
      expect(unifiedContent.publishedDate).toBeDefined();
    });
    
    test('should use cached content if provided', async () => {
      const mockUrl = 'https://medium.com/test-article';
      
      const { unifiedContent } = await handler.download(mockUrl, mockMediumHtml);
      
      expect(webFetcher.fetchWebPageContent).not.toHaveBeenCalled();
      expect(unifiedContent).toBeDefined();
      expect(unifiedContent.title).toBe('Test Medium Article');
    });
    
    test('should handle errors in download', async () => {
      const mockUrl = 'https://medium.com/error-article';
      
      vi.mocked(webFetcher.fetchWebPageContent).mockRejectedValue(new Error('Network error'));
      
      await expect(handler.download(mockUrl)).rejects.toThrow();
    });
  });

  describe('getPrompt', () => {
    test('should generate prompt with article data', () => {
      const mockArticleData: MediumArticleData = {
        title: 'Test Medium Article',
        author: 'John Doe',
        url: 'https://medium.com/test',
        content: 'This is the article content'
      };
      
      const prompt = handler.getPrompt(mockArticleData);
      
      expect(prompt).toContain('Test Medium Article');
      expect(prompt).toContain('John Doe');
      expect(prompt).toContain('This is the article content');
      expect(prompt).toContain('Format your response in JSON');
    });
    
    test('should handle missing content', () => {
      const mockArticleData: Partial<MediumArticleData> = {
        title: 'Test Medium Article',
        author: 'John Doe',
        url: 'https://medium.com/test'
      };
      
      expect(() => handler.getPrompt(mockArticleData)).toThrow('No content available');
    });
    
    test('should handle missing title and author', () => {
      const mockArticleData: Partial<MediumArticleData> = {
        url: 'https://medium.com/test',
        content: 'This is the article content'
      };
      
      const prompt = handler.getPrompt(mockArticleData);
      
      expect(prompt).toContain('Untitled Medium Article');
      expect(prompt).toContain('Unknown Author');
    });
  });

  describe('parseLLMResponse', () => {
    test('should parse valid JSON response', () => {
      const mockResponse = `
        Here's the analysis of the Medium article:
        
        \`\`\`json
        {
          "summary": "This is a test summary.",
          "highlights": ["Highlight 1", "Highlight 2", "Highlight 3"],
          "topics": ["Topic 1", "Topic 2"]
        }
        \`\`\`
      `;
      
      const result = handler.parseLLMResponse(mockResponse);
      
      expect(result).toEqual({
        summary: 'This is a test summary.',
        highlights: ['Highlight 1', 'Highlight 2', 'Highlight 3'],
        topics: ['Topic 1', 'Topic 2']
      });
    });
    
    test('should handle invalid JSON and extract manually', () => {
      const mockResponse = `
        ## Summary
        This is a test summary.
        
        ## Highlights
        - Highlight 1
        - Highlight 2
        - Highlight 3
        
        ## Key Topics
        - Topic 1
        - Topic 2
      `;
      
      const result = handler.parseLLMResponse(mockResponse);
      
      expect(result.summary).toContain('This is a test summary');
      expect(result.highlights).toHaveLength(3);
      expect(result.topics).toHaveLength(2);
    });
    
    test('should validate and fix incomplete responses', () => {
      const mockResponse = `
        ## Summary
        This is a test summary.
      `;
      
      const result = handler.parseLLMResponse(mockResponse);
      
      expect(result.summary).toContain('This is a test summary');
      expect(result.highlights).toBeDefined();
      expect(result.highlights.length).toBeGreaterThan(0);
      expect(result.topics).toBeDefined();
    });
  });
  
  describe('validateLLMOutput', () => {
    test('should validate complete output', () => {
      const mockOutput: MediumLLMOutput = {
        summary: 'This is a summary',
        highlights: ['Highlight 1', 'Highlight 2'],
        topics: ['Topic 1', 'Topic 2']
      };
      
      expect(() => handler.validateLLMOutput(mockOutput)).not.toThrow();
    });
    
    test('should fix missing highlights', () => {
      const mockOutput: MediumLLMOutput = {
        summary: 'This is a summary with a complete sentence.',
        highlights: [],
        topics: ['Topic 1']
      };
      
      handler.validateLLMOutput(mockOutput);
      expect(mockOutput.highlights.length).toBeGreaterThan(0);
    });
    
    test('should fix missing topics', () => {
      const mockOutput: MediumLLMOutput = {
        summary: 'This is a Summary with Some Capitalized Words.',
        highlights: ['Highlight 1'],
        topics: []
      };
      
      handler.validateLLMOutput(mockOutput);
      expect(mockOutput.topics.length).toBeGreaterThan(0);
    });
  });
  
  describe('getNoteContent', () => {
    test('should generate correctly formatted note content', () => {
      const mockArticleData: MediumArticleData = {
        title: 'Test Medium Article',
        author: 'John Doe',
        url: 'https://medium.com/test',
        content: 'This is the article content',
        publishedDate: 'April 16, 2023',
        readingTime: '5 min read'
      };
      
      const mockLLMResponse = `
        \`\`\`json
        {
          "summary": "This is a test summary.",
          "highlights": ["Highlight 1", "Highlight 2"],
          "topics": ["Topic 1", "Topic 2"]
        }
        \`\`\`
      `;
      
      const noteContent = handler.getNoteContent(mockLLMResponse, mockArticleData);
      
      expect(noteContent).toContain('# Test Medium Article');
      expect(noteContent).toContain('Author: John Doe');
      expect(noteContent).toContain('[Read on Medium](https://medium.com/test)');
      expect(noteContent).toContain('## Summary');
      expect(noteContent).toContain('This is a test summary');
      expect(noteContent).toContain('## Highlights');
      expect(noteContent).toContain('- Highlight 1');
      expect(noteContent).toContain('- Highlight 2');
      expect(noteContent).toContain('## Key Topics');
      expect(noteContent).toContain('- Topic 1');
      expect(noteContent).toContain('- Topic 2');
      expect(noteContent).toContain('## Metadata');
      expect(noteContent).toContain('- Published: April 16, 2023');
      expect(noteContent).toContain('- Read time: 5 min read');
    });
    
    test('should handle missing optional metadata', () => {
      const mockArticleData: MediumArticleData = {
        title: 'Test Medium Article',
        author: 'John Doe',
        url: 'https://medium.com/test',
        content: 'This is the article content'
      };
      
      const mockLLMResponse = `
        \`\`\`json
        {
          "summary": "This is a test summary.",
          "highlights": ["Highlight 1"],
          "topics": ["Topic 1"]
        }
        \`\`\`
      `;
      
      const noteContent = handler.getNoteContent(mockLLMResponse, mockArticleData);
      
      expect(noteContent).toContain('# Test Medium Article');
      expect(noteContent).toContain('## Metadata');
      expect(noteContent).not.toContain('- Published:');
      expect(noteContent).not.toContain('- Read time:');
    });
  });
});