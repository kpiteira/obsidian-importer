// filepath: /Users/karl/Documents/dev/obsidian-importer/tests/handlers/GenericContentHandler.test.ts
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { GenericContentHandler, GenericContentMetadata } from '../../src/handlers/GenericContentHandler';
import { LLMOutput } from '../../src/services/LLMProvider';
import * as webFetcher from '../../src/utils/webFetcher';

// Test implementation of GenericContentHandler for testing purposes
class TestGenericHandler extends GenericContentHandler {
  readonly type = "test";

  getPrompt(unifiedContent: GenericContentMetadata): string {
    return `Test prompt for: ${unifiedContent.title}`;
  }

  parseLLMResponse(markdown: string): LLMOutput {
    return { test: "value" };
  }

  validateLLMOutput(output: LLMOutput): boolean {
    return true;
  }

  getNoteContent(markdown: string, unifiedContent: GenericContentMetadata): string {
    return `# ${unifiedContent.title}\n\n${markdown}`;
  }

  getFolderName(): string {
    return "Test";
  }
}

describe('GenericContentHandler', () => {
  let handler: TestGenericHandler;
  const mockFetchWebPageContent = vi.fn();
  const mockExtractMainContent = vi.fn();

  beforeEach(() => {
    handler = new TestGenericHandler();
    // Mock web fetching functions
    vi.spyOn(webFetcher, 'fetchWebPageContent').mockImplementation(mockFetchWebPageContent);
    vi.spyOn(webFetcher, 'extractMainContent').mockImplementation(mockExtractMainContent);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Basic handler interface', () => {
    it('should have requiresContentDetection return true', () => {
      expect(handler.requiresContentDetection()).toBe(true);
    });

    it('should have detect return false by default', () => {
      expect(handler.detect(new URL('https://example.com'))).toBe(false);
    });

    it('should have canHandleUrl call detect by default', async () => {
      const detectSpy = vi.spyOn(handler, 'detect');
      const result = await handler.canHandleUrl(new URL('https://example.com'));
      expect(detectSpy).toHaveBeenCalled();
      expect(result).toBe(false);
    });

    it('should return empty array for getRequiredApiKeys', () => {
      expect(handler.getRequiredApiKeys()).toEqual([]);
    });
  });

  describe('download method', () => {
    it('should use cached content when provided', async () => {
      const cachedHtml = '<html><head><title>Cached Title</title></head><body>Cached Content</body></html>';
      mockExtractMainContent.mockReturnValue('Extracted Content');
      
      const result = await handler.download('https://example.com', cachedHtml);
      
      expect(mockFetchWebPageContent).not.toHaveBeenCalled();
      expect(result.unifiedContent.title).toBe('Cached Title');
      expect(result.unifiedContent.content).toBe('Extracted Content');
    });

    it('should fetch content when no cache is provided', async () => {
      const fetchedHtml = '<html><head><title>Fetched Title</title></head><body>Fetched Content</body></html>';
      mockFetchWebPageContent.mockResolvedValue(fetchedHtml);
      mockExtractMainContent.mockReturnValue('Extracted Content');
      
      const result = await handler.download('https://example.com');
      
      expect(mockFetchWebPageContent).toHaveBeenCalledWith('https://example.com');
      expect(result.unifiedContent.title).toBe('Fetched Title');
      expect(result.unifiedContent.content).toBe('Extracted Content');
    });

    it('should throw error if content fetching fails', async () => {
      mockFetchWebPageContent.mockRejectedValue(new Error('Fetch failed'));
      
      await expect(handler.download('https://example.com')).rejects.toThrow('Failed to download content: Error: Fetch failed');
    });
  });

  describe('Metadata extraction methods', () => {
    it('should extract title from HTML content', () => {
      const html = `
        <html>
          <head>
            <meta property="og:title" content="OG Title">
            <title>HTML Title</title>
          </head>
          <body>
            <h1>H1 Title</h1>
          </body>
        </html>
      `;

      // OG title should have priority
      expect(handler['extractTitle'](html)).toBe('OG Title');

      // Title tag is the fallback
      const htmlWithoutOg = html.replace(/<meta[^>]+og:title[^>]+>/, '');
      expect(handler['extractTitle'](htmlWithoutOg)).toBe('HTML Title');

      // H1 is the last resort
      const htmlWithoutTitle = htmlWithoutOg.replace(/<title>[^<]+<\/title>/, '');
      expect(handler['extractTitle'](htmlWithoutTitle)).toBe('H1 Title');

      // Default when nothing is found
      const emptyHtml = '<html><body></body></html>';
      expect(handler['extractTitle'](emptyHtml)).toBe('Untitled Content');
    });

    it('should extract author from HTML content', () => {
      const html = `
        <html>
          <head>
            <meta name="author" content="Meta Author">
          </head>
          <body>
            <span class="author">HTML Author</span>
          </body>
        </html>
      `;

      expect(handler['extractAuthor'](html)).toBe('Meta Author');

      const htmlWithSchemaAuthor = `
        <html>
          <head>
            <script type="application/ld+json">
            {
              "author": {
                "@type": "Person",
                "name": "Schema Author"
              }
            }
            </script>
          </head>
        </html>
      `;
      expect(handler['extractAuthor'](htmlWithSchemaAuthor)).toBe('Schema Author');

      // Return undefined if no author is found
      const emptyHtml = '<html><body></body></html>';
      expect(handler['extractAuthor'](emptyHtml)).toBeUndefined();
    });

    it('should extract published date from HTML content', () => {
      const html = `
        <html>
          <head>
            <meta property="article:published_time" content="2023-04-16T12:00:00Z">
          </head>
          <body>
            <span class="date">April 16, 2023</span>
          </body>
        </html>
      `;

      // Date should be formatted
      const extractedDate = handler['extractDate'](html);
      expect(extractedDate).toContain('April 16, 2023');

      const htmlWithSchemaDate = `
        <html>
          <head>
            <script type="application/ld+json">
            {
              "datePublished": "2023-04-16T12:00:00Z"
            }
            </script>
          </head>
        </html>
      `;
      const extractedSchemaDate = handler['extractDate'](htmlWithSchemaDate);
      expect(extractedSchemaDate).toContain('April 16, 2023');

      // Return undefined if no date is found
      const emptyHtml = '<html><body></body></html>';
      expect(handler['extractDate'](emptyHtml)).toBeUndefined();
    });

    it('should extract main image from HTML content', () => {
      const html = `
        <html>
          <head>
            <meta property="og:image" content="https://example.com/og-image.jpg">
          </head>
          <body>
            <img src="https://example.com/main-image.jpg" width="800" height="600">
          </body>
        </html>
      `;

      // OG image should have priority
      expect(handler['extractMainImage'](html)).toBe('https://example.com/og-image.jpg');

      // Large image is the fallback
      const htmlWithoutOgImage = html.replace(/<meta[^>]+og:image[^>]+>/, '');
      expect(handler['extractMainImage'](htmlWithoutOgImage)).toBe('https://example.com/main-image.jpg');

      // Image with alt text is the last resort
      const htmlWithSmallImage = `
        <html>
          <body>
            <img src="https://example.com/icon.jpg" width="32" height="32">
            <img src="https://example.com/with-alt.jpg" alt="With Alt">
          </body>
        </html>
      `;
      expect(handler['extractMainImage'](htmlWithSmallImage)).toBe('https://example.com/with-alt.jpg');

      // Return undefined if no suitable image is found
      const emptyHtml = '<html><body></body></html>';
      expect(handler['extractMainImage'](emptyHtml)).toBeUndefined();
    });
  });
});