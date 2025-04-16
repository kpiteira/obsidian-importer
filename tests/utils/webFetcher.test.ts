import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchWebPageContent, extractMainContent } from '../../src/utils/webFetcher';
import { requestUrl } from 'obsidian';

// Mock Obsidian's requestUrl function
vi.mock('obsidian', () => ({
  requestUrl: vi.fn()
}));

describe('webFetcher', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('fetchWebPageContent', () => {
    it('should fetch page content successfully', async () => {
      const mockHtmlContent = '<html><body><h1>Test Page</h1><p>This is test content</p></body></html>';
      
      // Mock successful response
      (requestUrl as unknown as vi.Mock).mockResolvedValueOnce({
        status: 200,
        text: mockHtmlContent
      });

      const content = await fetchWebPageContent('https://example.com');
      expect(content).toBe(mockHtmlContent);
      
      // Verify the requestUrl was called with correct parameters
      expect(requestUrl).toHaveBeenCalledWith({
        url: 'https://example.com',
        headers: {
          'User-Agent': 'Mozilla/5.0 ObsidianImporter/1.0'
        },
        throw: true
      });
    });

    it('should throw error if fetch fails', async () => {
      // Mock network error
      const errorMessage = 'Network error';
      (requestUrl as unknown as vi.Mock).mockRejectedValueOnce(new Error(errorMessage));

      await expect(fetchWebPageContent('https://example.com')).rejects
        .toThrow(`Failed to fetch web page content: ${errorMessage}`);
    });

    it('should handle non-Error rejection types', async () => {
      // Mock a rejection that's not an Error object
      (requestUrl as unknown as vi.Mock).mockRejectedValueOnce('String error');

      await expect(fetchWebPageContent('https://example.com')).rejects
        .toThrow('Failed to fetch web page content: Unknown error');
    });
  });

  describe('extractMainContent', () => {
    it('should extract text content and strip HTML tags', () => {
      const html = '<html><body><h1>Title</h1><p>Paragraph text</p></body></html>';
      const extracted = extractMainContent(html);
      
      expect(extracted).toContain('Title');
      expect(extracted).toContain('Paragraph text');
      expect(extracted).not.toContain('<html>');
      expect(extracted).not.toContain('<h1>');
    });

    it('should remove script tags and their content', () => {
      const html = '<html><body><script>alert("should be removed");</script><p>Keep this</p></body></html>';
      const extracted = extractMainContent(html);
      
      expect(extracted).toContain('Keep this');
      expect(extracted).not.toContain('alert');
      expect(extracted).not.toContain('should be removed');
    });

    it('should remove style tags and their content', () => {
      const html = '<html><head><style>body { color: red; }</style></head><body><p>Content</p></body></html>';
      const extracted = extractMainContent(html);
      
      expect(extracted).toContain('Content');
      expect(extracted).not.toContain('color');
      expect(extracted).not.toContain('red');
    });

    it('should remove HTML comments', () => {
      const html = '<html><body><!-- This is a comment --><p>Visible text</p></body></html>';
      const extracted = extractMainContent(html);
      
      expect(extracted).toContain('Visible text');
      expect(extracted).not.toContain('This is a comment');
    });

    it('should normalize whitespace', () => {
      const html = '<html><body><p>Multiple    spaces</p><p>New\nlines\nhere</p></body></html>';
      const extracted = extractMainContent(html);
      
      expect(extracted).toBe('Multiple spaces New lines here');
    });

    it('should truncate content that exceeds maximum length', () => {
      // Create a very long string that exceeds the MAX_CONTENT_LENGTH (10000)
      const longText = 'A'.repeat(15000);
      const html = `<html><body><p>${longText}</p></body></html>`;
      const extracted = extractMainContent(html);
      
      expect(extracted.length).toBeLessThan(15000);
      expect(extracted.length).toBeLessThanOrEqual(10003); // Max length plus "..."
      expect(extracted.endsWith('...')).toBe(true);
    });

    it('should handle empty input', () => {
      expect(extractMainContent('')).toBe('');
    });

    it('should handle input with only tags and no content', () => {
      const html = '<html><body><div></div><span></span></body></html>';
      expect(extractMainContent(html).trim()).toBe('');
    });
  });
});