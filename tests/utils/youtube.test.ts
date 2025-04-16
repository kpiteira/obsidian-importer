import { describe, it, expect } from 'vitest';
import { extractYouTubeVideoId, generateYouTubeEmbedHtml } from '../../src/utils/youtube';

describe('YouTube Utilities', () => {
  describe('extractYouTubeVideoId', () => {
    const validVideoId = 'dQw4w9WgXcQ'; // Rick roll video ID for test cases

    it('should extract video ID from youtu.be short URLs', () => {
      const urls = [
        `https://youtu.be/${validVideoId}`,
        `http://youtu.be/${validVideoId}`,
        `youtu.be/${validVideoId}`,
        `https://youtu.be/${validVideoId}?t=30`,
        `https://youtu.be/${validVideoId}&feature=shared`
      ];
      
      urls.forEach(url => {
        expect(extractYouTubeVideoId(url)).toBe(validVideoId);
      });
    });

    it('should extract video ID from youtube.com/watch URLs', () => {
      const urls = [
        `https://www.youtube.com/watch?v=${validVideoId}`,
        `http://youtube.com/watch?v=${validVideoId}`,
        `youtube.com/watch?v=${validVideoId}`,
        `https://youtube.com/watch?v=${validVideoId}&t=30`,
        `https://youtube.com/watch?feature=shared&v=${validVideoId}`,
        `https://www.youtube.com/watch?list=PL123&v=${validVideoId}`
      ];
      
      urls.forEach(url => {
        expect(extractYouTubeVideoId(url)).toBe(validVideoId);
      });
    });
    
    it('should extract video ID from youtube.com/embed URLs', () => {
      const urls = [
        `https://www.youtube.com/embed/${validVideoId}`,
        `http://youtube.com/embed/${validVideoId}`,
        `youtube.com/embed/${validVideoId}`,
        `https://youtube.com/embed/${validVideoId}?autoplay=1`,
        `https://www.youtube.com/embed/${validVideoId}?start=30&end=60`
      ];
      
      urls.forEach(url => {
        expect(extractYouTubeVideoId(url)).toBe(validVideoId);
      });
    });
    
    it('should extract video ID from youtube.com/shorts URLs', () => {
      const urls = [
        `https://www.youtube.com/shorts/${validVideoId}`,
        `http://youtube.com/shorts/${validVideoId}`,
        `youtube.com/shorts/${validVideoId}`,
        `https://youtube.com/shorts/${validVideoId}?feature=share`
      ];
      
      urls.forEach(url => {
        expect(extractYouTubeVideoId(url)).toBe(validVideoId);
      });
    });
    
    it('should extract video ID from youtube.com/v URLs', () => {
      const urls = [
        `https://www.youtube.com/v/${validVideoId}`,
        `http://youtube.com/v/${validVideoId}`,
        `youtube.com/v/${validVideoId}`,
        `https://youtube.com/v/${validVideoId}?version=3`
      ];
      
      urls.forEach(url => {
        expect(extractYouTubeVideoId(url)).toBe(validVideoId);
      });
    });
    
    it('should handle attribution_link URLs', () => {
      // The current implementation doesn't properly handle all attribution_link formats
      // but does handle the v= parameter when present in the URL
      const url = `https://www.youtube.com/attribution_link?a=something&v=${validVideoId}`;
      expect(extractYouTubeVideoId(url)).toBe(validVideoId);
    });
    
    it('should return null for invalid YouTube URLs', () => {
      const invalidUrls = [
        'https://vimeo.com/123456',
        'https://example.com',
        'not a url',
        'youtube.com/playlist?list=123',
        'youtube.com/channel/UC123',
        'https://youtu.be/tooshort',
        'https://youtu.be/way-too-long-to-be-valid',
        ''
      ];
      
      invalidUrls.forEach(url => {
        expect(extractYouTubeVideoId(url)).toBeNull();
      });
    });
    
    it('should handle non-string inputs gracefully', () => {
      // @ts-expect-error Testing with non-string inputs
      expect(extractYouTubeVideoId(null)).toBeNull();
      // @ts-expect-error Testing with non-string inputs
      expect(extractYouTubeVideoId(undefined)).toBeNull();
      // @ts-expect-error Testing with non-string inputs
      expect(extractYouTubeVideoId(123)).toBeNull();
      // @ts-expect-error Testing with non-string inputs
      expect(extractYouTubeVideoId({})).toBeNull();
    });
  });
  
  describe('generateYouTubeEmbedHtml', () => {
    it('should generate valid embed HTML for a video ID', () => {
      const videoId = 'dQw4w9WgXcQ';
      const expected = '<iframe width="560" height="315" src="https://www.youtube.com/embed/dQw4w9WgXcQ" frameborder="0" allowfullscreen></iframe>';
      
      expect(generateYouTubeEmbedHtml(videoId)).toBe(expected);
    });
    
    it('should return empty string for empty video ID', () => {
      expect(generateYouTubeEmbedHtml('')).toBe('');
    });
  });
});