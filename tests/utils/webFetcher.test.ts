import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchWebPageContent, extractMainContent } from '../../src/utils/webFetcher';
import { requestUrl } from 'obsidian';

// Mock Obsidian's requestUrl function
vi.mock('obsidian', () => ({
  requestUrl: vi.fn()
}));

describe('webFetcher utility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchWebPageContent', () => {
    it('should fetch content from a URL successfully', async () => {
      const mockHtmlContent = '<html><body>Test content</body></html>';
      
      // Setup the mock to return our test content
      (requestUrl as any).mockResolvedValue({
        text: mockHtmlContent,
        status: 200
      });
      
      const result = await fetchWebPageContent('https://example.com');
      
      expect(result).toBe(mockHtmlContent);
      expect(requestUrl).toHaveBeenCalledWith({
        url: 'https://example.com',
        headers: expect.objectContaining({
          'User-Agent': expect.stringContaining('Obsidian')
        }),
        throw: true
      });
    });

    it('should throw an error when the fetch fails', async () => {
      // Setup the mock to throw an error
      (requestUrl as any).mockRejectedValue(new Error('Network error'));
      
      await expect(fetchWebPageContent('https://bad-url.com'))
        .rejects.toThrow('Failed to fetch web page content');
    });
  });

  describe('extractMainContent', () => {
    it('should remove HTML tags and return plain text', () => {
      const htmlContent = `<html>
        <head>
          <title>Test Page</title>
          <style>body { color: red; }</style>
        </head>
        <body>
          <h1>Main Heading</h1>
          <p>This is a paragraph</p>
          <script>alert('Hello');</script>
        </body>
      </html>`;

      const result = extractMainContent(htmlContent);
      
      // Should remove style tags
      expect(result).not.toContain('color: red');
      
      // Should remove script tags
      expect(result).not.toContain('alert');
      
      // Should extract plain text content
      expect(result).toContain('Main Heading');
      expect(result).toContain('This is a paragraph');
    });

    it('should limit content length for very long pages', () => {
      // Create a very long HTML string
      let longContent = '<html><body>';
      for (let i = 0; i < 1000; i++) {
        longContent += `<p>Paragraph ${i}</p>`;
      }
      longContent += '</body></html>';
      
      const result = extractMainContent(longContent);
      
      // Result should be truncated
      expect(result.length).toBeLessThan(longContent.length);
      expect(result).toContain('...');
    });
  });
});