import { describe, it, expect, beforeEach } from 'vitest';
import { 
  registerContentTypeHandler, 
  resetContentTypeHandlers, 
  detectContentType, 
  getAllContentTypeHandlers 
} from '../../src/handlers/typeDispatcher';
import { ContentTypeHandler } from '../../src/handlers/ContentTypeHandler';

// Mock handlers for testing
class MockYouTubeHandler implements ContentTypeHandler {
  type = 'youtube';
  
  detect(url: URL): boolean {
    return url.hostname.includes('youtube.com') || url.hostname.includes('youtu.be');
  }

  async fetchTranscript(url: URL): Promise<string> {
    return 'Mock YouTube transcript';
  }

  async process(url: URL, transcript: string, options: Record<string, any>): Promise<string> {
    return 'Processed YouTube content';
  }
}

class MockMediumHandler implements ContentTypeHandler {
  type = 'medium';
  
  detect(url: URL): boolean {
    return url.hostname.includes('medium.com');
  }

  async fetchTranscript(url: URL): Promise<string> {
    return 'Mock Medium article content';
  }

  async process(url: URL, transcript: string, options: Record<string, any>): Promise<string> {
    return 'Processed Medium content';
  }
}

class MockGoodreadsHandler implements ContentTypeHandler {
  type = 'goodreads';
  
  detect(url: URL): boolean {
    return url.hostname.includes('goodreads.com');
  }

  async fetchTranscript(url: URL): Promise<string> {
    return 'Mock Goodreads book content';
  }

  async process(url: URL, transcript: string, options: Record<string, any>): Promise<string> {
    return 'Processed Goodreads content';
  }
}

describe('typeDispatcher', () => {
  beforeEach(() => {
    resetContentTypeHandlers();
  });
  
  describe('registerContentTypeHandler', () => {
    it('should register a handler and make it available in the registry', () => {
      const youtubeHandler = new MockYouTubeHandler();
      registerContentTypeHandler(youtubeHandler);
      
      const handlers = getAllContentTypeHandlers();
      expect(handlers.length).toBe(1);
      expect(handlers[0]).toBe(youtubeHandler);
    });
    
    it('should allow registering multiple handlers', () => {
      const youtubeHandler = new MockYouTubeHandler();
      const mediumHandler = new MockMediumHandler();
      const goodreadsHandler = new MockGoodreadsHandler();
      
      registerContentTypeHandler(youtubeHandler);
      registerContentTypeHandler(mediumHandler);
      registerContentTypeHandler(goodreadsHandler);
      
      const handlers = getAllContentTypeHandlers();
      expect(handlers.length).toBe(3);
      expect(handlers).toContain(youtubeHandler);
      expect(handlers).toContain(mediumHandler);
      expect(handlers).toContain(goodreadsHandler);
    });
  });
  
  describe('resetContentTypeHandlers', () => {
    it('should clear all registered handlers', () => {
      const youtubeHandler = new MockYouTubeHandler();
      const mediumHandler = new MockMediumHandler();
      
      registerContentTypeHandler(youtubeHandler);
      registerContentTypeHandler(mediumHandler);
      
      expect(getAllContentTypeHandlers().length).toBe(2);
      
      resetContentTypeHandlers();
      
      expect(getAllContentTypeHandlers().length).toBe(0);
    });
  });
  
  describe('detectContentType', () => {
    it('should return the correct handler for a YouTube URL', () => {
      const youtubeHandler = new MockYouTubeHandler();
      const mediumHandler = new MockMediumHandler();
      
      registerContentTypeHandler(youtubeHandler);
      registerContentTypeHandler(mediumHandler);
      
      const youtubeUrl = new URL('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      const result = detectContentType(youtubeUrl);
      
      expect(result).toBe(youtubeHandler);
    });
    
    it('should return the correct handler for a Medium URL', () => {
      const youtubeHandler = new MockYouTubeHandler();
      const mediumHandler = new MockMediumHandler();
      
      registerContentTypeHandler(youtubeHandler);
      registerContentTypeHandler(mediumHandler);
      
      const mediumUrl = new URL('https://medium.com/@username/article-title-123');
      const result = detectContentType(mediumUrl);
      
      expect(result).toBe(mediumHandler);
    });
    
    it('should return null if no handler matches', () => {
      const youtubeHandler = new MockYouTubeHandler();
      const mediumHandler = new MockMediumHandler();
      
      registerContentTypeHandler(youtubeHandler);
      registerContentTypeHandler(mediumHandler);
      
      const unknownUrl = new URL('https://example.com/page');
      const result = detectContentType(unknownUrl);
      
      expect(result).toBeNull();
    });
    
    it('should return the first matching handler in registration order', () => {
      // Create a special handler that would match any URL
      const catchAllHandler: ContentTypeHandler = {
        type: 'catch-all',
        detect: () => true,
        fetchTranscript: async () => 'Catch all content',
        process: async () => 'Processed catch all content'
      };
      
      const youtubeHandler = new MockYouTubeHandler();
      
      // Register the catch-all handler first
      registerContentTypeHandler(catchAllHandler);
      registerContentTypeHandler(youtubeHandler);
      
      // Even though the YouTube handler would match, the catch-all handler should be returned
      // since it was registered first and matches all URLs
      const youtubeUrl = new URL('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      const result = detectContentType(youtubeUrl);
      
      expect(result).toBe(catchAllHandler);
      expect(result).not.toBe(youtubeHandler);
    });
  });
  
  describe('getAllContentTypeHandlers', () => {
    it('should return a copy of the handlers array, not the original', () => {
      const youtubeHandler = new MockYouTubeHandler();
      registerContentTypeHandler(youtubeHandler);
      
      const handlers1 = getAllContentTypeHandlers();
      const handlers2 = getAllContentTypeHandlers();
      
      // Should be equal in content
      expect(handlers1).toEqual(handlers2);
      
      // But not the same array instance
      expect(handlers1).not.toBe(handlers2);
    });
    
    it('should return an empty array when no handlers are registered', () => {
      const handlers = getAllContentTypeHandlers();
      expect(handlers).toEqual([]);
    });
  });
});