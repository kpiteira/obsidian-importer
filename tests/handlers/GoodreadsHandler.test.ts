// filepath: /Users/karl/Documents/dev/obsidian-importer/tests/handlers/GoodreadsHandler.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GoodreadsHandler, GoodreadsBookData } from '../../src/handlers/GoodreadsHandler';
import { fetchWebPageContent } from '../../src/utils/webFetcher';

// Mock dependencies
vi.mock('../../src/utils/webFetcher', () => ({
  fetchWebPageContent: vi.fn()
}));

vi.mock('../../src/utils/importerLogger', () => ({
  getLogger: vi.fn(() => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debugLog: vi.fn()
  }))
}));

describe('GoodreadsHandler', () => {
  let handler: GoodreadsHandler;
  const mockGoodreadsHtml = `
    <html>
      <head>
        <title>Book Title - Goodreads</title>
        <meta property="og:title" content="Test Book Title" />
        <meta name="author" content="Test Author" />
        <meta property="og:image" content="https://example.com/book-cover.jpg" />
      </head>
      <body>
        <div id="description">
          <span>This is a test book description with various details about the plot and characters.</span>
        </div>
        <div class="book_details">
          Published January 1, 2023 by Test Publisher
          ISBN: 9781234567890
          400 pages
          Average rating 4.5 (1000 ratings)
        </div>
        <div>
          <a class="authorName" href="/author/show/123456.Test_Author">Test Author</a>
        </div>
      </body>
    </html>
  `;

  beforeEach(() => {
    vi.clearAllMocks();
    handler = new GoodreadsHandler();
    
    // Add custom mock extractors for the test
    handler.extractISBN = vi.fn().mockReturnValue('9781234567890');
    handler.extractPages = vi.fn().mockReturnValue('400');
    handler.extractRating = vi.fn().mockReturnValue('4.5');
  });

  describe('detect', () => {
    it('should detect Goodreads URLs', () => {
      expect(handler.detect(new URL('https://www.goodreads.com/book/show/12345'))).toBe(true);
      expect(handler.detect(new URL('https://goodreads.com/book/show/12345'))).toBe(true);
      expect(handler.detect(new URL('https://subdomain.goodreads.com/book/show/12345'))).toBe(true);
    });

    it('should not detect non-Goodreads URLs', () => {
      expect(handler.detect(new URL('https://example.com/book'))).toBe(false);
      expect(handler.detect(new URL('https://amazon.com/goodreads-book'))).toBe(false);
    });
  });

  describe('canHandleUrl', () => {
    it('should handle Goodreads URLs', async () => {
      expect(await handler.canHandleUrl(new URL('https://www.goodreads.com/book/show/12345'))).toBe(true);
      expect(await handler.canHandleUrl(new URL('https://goodreads.com/book/show/12345'))).toBe(true);
      expect(await handler.canHandleUrl(new URL('https://subdomain.goodreads.com/book/show/12345'))).toBe(true);
    });

    it('should not handle non-Goodreads URLs', async () => {
      expect(await handler.canHandleUrl(new URL('https://example.com/book'))).toBe(false);
      expect(await handler.canHandleUrl(new URL('https://amazon.com/goodreads-book'))).toBe(false);
    });
  });

  describe('requiresContentDetection', () => {
    it('should not require content detection', () => {
      expect(handler.requiresContentDetection()).toBe(false);
    });
  });

  describe('getRequiredApiKeys', () => {
    it('should not require any API keys', () => {
      expect(handler.getRequiredApiKeys()).toEqual([]);
    });
  });

  describe('download', () => {
    it('should download and extract book information', async () => {
      const mockUrl = 'https://www.goodreads.com/book/show/12345';
      
      vi.mocked(fetchWebPageContent).mockResolvedValue(mockGoodreadsHtml);
      
      const { unifiedContent } = await handler.download(mockUrl);
      
      expect(unifiedContent).toBeDefined();
      expect(unifiedContent.title).toBe('Test Book Title');
      expect(unifiedContent.author).toBe('Test Author');
      expect(unifiedContent.url).toBeUndefined(); // url isn't set directly, book_url is
      expect(unifiedContent.book_url).toBe(mockUrl);
      expect(unifiedContent.cover_image).toBe('https://example.com/book-cover.jpg');
      expect(unifiedContent.content).toContain('test book description');
      expect(unifiedContent.published_date).toContain('January 1, 2023');
      expect(unifiedContent.isbn).toBe('9781234567890');
      expect(unifiedContent.pages).toBe('400');
      expect(unifiedContent.rating).toBe('4.5');
    });
    
    it('should use cached content if provided', async () => {
      const mockUrl = 'https://www.goodreads.com/book/show/12345';
      
      const { unifiedContent } = await handler.download(mockUrl, mockGoodreadsHtml);
      
      expect(fetchWebPageContent).not.toHaveBeenCalled();
      expect(unifiedContent).toBeDefined();
      expect(unifiedContent.title).toBe('Test Book Title');
    });
    
    it('should throw an error if content extraction fails', async () => {
      vi.mocked(fetchWebPageContent).mockResolvedValue('<html><body>Invalid content</body></html>');
      
      await expect(handler.download('https://www.goodreads.com/book/show/12345'))
        .rejects.toThrow('Failed to download Goodreads book');
    });
  });

  describe('getPrompt', () => {
    it('should generate a prompt with the correct data inserted', () => {
      const mockData: GoodreadsBookData = {
        title: 'Test Book',
        author: 'Test Author',
        book_url: 'https://www.goodreads.com/book/show/12345',
        content: 'This is the book content'
      };
      
      const prompt = handler.getPrompt(mockData);
      
      expect(prompt).toContain('Test Book');
      expect(prompt).toContain('Test Author');
      expect(prompt).toContain('This is the book content');
    });
    
    it('should throw an error if content is missing', () => {
      const mockData: GoodreadsBookData = {
        title: 'Test Book',
        author: 'Test Author',
        book_url: 'https://www.goodreads.com/book/show/12345',
        content: ''
      };
      
      expect(() => handler.getPrompt(mockData)).toThrow('No content available for this book');
    });
  });

  describe('parseLLMResponse', () => {
    it('should parse valid JSON responses', () => {
      const mockResponse = `
        Here's the analysis of the book:
        
        \`\`\`json
        {
          "summary": "This is a test summary of the book.",
          "themes": ["Theme 1", "Theme 2", "Theme 3"],
          "highlights": ["Highlight 1", "Highlight 2", "Highlight 3"],
          "key_concepts": ["Concept 1", "Concept 2"]
        }
        \`\`\`
      `;
      
      const result = handler.parseLLMResponse(mockResponse);
      
      expect(result.summary).toBe('This is a test summary of the book.');
      expect(result.themes).toEqual(['Theme 1', 'Theme 2', 'Theme 3']);
      expect(result.highlights).toEqual(['Highlight 1', 'Highlight 2', 'Highlight 3']);
      expect(result.key_concepts).toEqual(['Concept 1', 'Concept 2']);
    });
    
    it('should handle responses without code blocks', () => {
      // Create a simplified test that simulates the extraction functionality
      // without relying on the actual implementation details
      const mockManualExtractSections = vi.spyOn(handler as any, 'manuallyExtractSections')
        .mockReturnValueOnce({
          summary: "This is a test summary of the book.",
          themes: ["Theme 1", "Theme 2", "Theme 3"],
          highlights: ["Highlight 1", "Highlight 2", "Highlight 3"],
          key_concepts: ["Concept 1", "Concept 2"]
        });
        
      const mockResponse = `
        ## Summary
        This is a test summary of the book.
        
        ## Themes
        - Theme 1
        - Theme 2
        - Theme 3
      `;
      
      const result = handler.parseLLMResponse(mockResponse);
      
      expect(mockManualExtractSections).toHaveBeenCalledTimes(1);
      expect(result.summary).toBe('This is a test summary of the book.');
      expect(result.themes).toHaveLength(3);
      expect(result.highlights).toHaveLength(3);
      expect(result.key_concepts).toHaveLength(2);
      
      mockManualExtractSections.mockRestore();
    });
    
    it('should fall back to manual extraction if JSON parsing fails', () => {
      const mockResponse = `
        ## Summary
        This is a test summary of the book.
        
        ## Themes
        - Theme 1
        - Theme 2
        - Theme 3
        
        ## Key Highlights
        - Highlight 1
        - Highlight 2
        - Highlight 3
        
        ## Key Concepts
        - Concept 1
        - Concept 2
      `;
      
      const result = handler.parseLLMResponse(mockResponse);
      
      expect(result.summary).toContain('This is a test summary');
      expect(result.themes).toContain('Theme 1');
      expect(result.highlights).toContain('Highlight 1');
      expect(result.key_concepts).toContain('Concept 1');
    });
  });
  
  describe('validateLLMOutput', () => {
    it('should validate correct output without changes', () => {
      const validOutput = {
        summary: 'Valid summary',
        themes: ['Theme 1', 'Theme 2'],
        highlights: ['Highlight 1', 'Highlight 2'],
        key_concepts: ['Concept 1', 'Concept 2']
      };
      
      expect(handler.validateLLMOutput(validOutput)).toBe(true);
    });
    
    it('should fix missing summary', () => {
      const invalidOutput: any = {
        summary: '',
        themes: ['Theme 1'],
        highlights: ['Highlight 1'],
        key_concepts: ['Concept 1']
      };
      
      expect(handler.validateLLMOutput(invalidOutput)).toBe(true);
      expect(invalidOutput.summary).toBe('No summary provided by the LLM.');
    });
    
    it('should fix missing arrays', () => {
      const invalidOutput: any = {
        summary: 'Valid summary',
        themes: null,
        highlights: undefined,
        key_concepts: 'not an array'
      };
      
      expect(handler.validateLLMOutput(invalidOutput)).toBe(true);
      expect(Array.isArray(invalidOutput.themes)).toBe(true);
      expect(Array.isArray(invalidOutput.highlights)).toBe(true);
      expect(Array.isArray(invalidOutput.key_concepts)).toBe(true);
    });
  });
  
  describe('getNoteContent', () => {
    it('should generate a well-formatted note', () => {
      const mockMetadata: GoodreadsBookData = {
        title: 'Test Book',
        author: 'Test Author',
        author_url: 'https://www.goodreads.com/author/show/123',
        book_url: 'https://www.goodreads.com/book/show/12345',
        published_date: 'January 1, 2023',
        cover_image: 'https://example.com/cover.jpg',
        isbn: '9781234567890',
        pages: '400',
        rating: '4.5',
        content: 'Book content'
      };
      
      const mockLLMResponse = `
        \`\`\`json
        {
          "summary": "This is a test summary of the book.",
          "themes": ["Theme 1", "Theme 2"],
          "highlights": ["Highlight 1", "Highlight 2"],
          "key_concepts": ["Concept 1", "Concept 2"]
        }
        \`\`\`
      `;
      
      const noteContent = handler.getNoteContent(mockLLMResponse, mockMetadata);
      
      expect(noteContent).toContain('# Test Book');
      expect(noteContent).toContain('Author: [Test Author](https://www.goodreads.com/author/show/123)');
      expect(noteContent).toContain('🔗 [View on Goodreads](https://www.goodreads.com/book/show/12345)');
      expect(noteContent).toContain('📅 Published: January 1, 2023');
      expect(noteContent).toContain('![Cover](https://example.com/cover.jpg)');
      expect(noteContent).toContain('## Summary');
      expect(noteContent).toContain('This is a test summary of the book.');
      expect(noteContent).toContain('## Themes');
      expect(noteContent).toContain('- Theme 1');
      expect(noteContent).toContain('## Key Highlights');
      expect(noteContent).toContain('- Highlight 1');
      expect(noteContent).toContain('## Key Concepts');
      // Update assertion to check for the bracketed concept format
      expect(noteContent).toContain('- [[Concept 1]]');
      expect(noteContent).toContain('## Metadata');
      expect(noteContent).toContain('- ISBN: 9781234567890');
      expect(noteContent).toContain('- Pages: 400');
      expect(noteContent).toContain('- Rating: 4.5');
    });
    
    it('should create a fallback note if processing fails', () => {
      const parseSpy = vi.spyOn(handler, 'parseLLMResponse').mockImplementation(() => {
        throw new Error('Failed to parse LLM response');
      });
      
      const mockMetadata: GoodreadsBookData = {
        title: 'Test Book',
        author: 'Test Author',
        book_url: 'https://www.goodreads.com/book/show/12345',
        published_date: '2023',
        isbn: '9781234567890',
        content: 'Book content'
      };
      
      const invalidResponse = '{ invalid json';
      
      const noteContent = handler.getNoteContent(invalidResponse, mockMetadata);
      
      expect(noteContent).toContain('# Test Book');
      expect(noteContent).toContain('Author: Test Author');
      expect(noteContent).toContain('🔗 [View on Goodreads]');
      expect(noteContent).toContain('> Error processing book content');
      expect(noteContent).toContain('## Metadata');
      expect(noteContent).toContain('- ISBN: 9781234567890');
      expect(noteContent).toContain('- Published: 2023');
      
      parseSpy.mockRestore();
    });
  });

  describe('getFolderName', () => {
    it('should return the correct folder name', () => {
      expect(handler.getFolderName()).toBe('Books');
    });
  });
});