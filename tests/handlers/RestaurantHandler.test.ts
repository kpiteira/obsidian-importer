// filepath: /Users/karl/Documents/dev/obsidian-importer/tests/handlers/RestaurantHandler.test.ts
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { RestaurantHandler, RestaurantLLMOutput } from '../../src/handlers/RestaurantHandler';
import { GenericContentMetadata } from '../../src/handlers/GenericContentHandler';
import * as webFetcher from '../../src/utils/webFetcher';

describe('RestaurantHandler', () => {
  let handler: RestaurantHandler;
  const mockFetchWebPageContent = vi.fn();
  const mockExtractMainContent = vi.fn();
  
  beforeEach(() => {
    handler = new RestaurantHandler();
    
    // Mock web fetching functions
    vi.spyOn(webFetcher, 'fetchWebPageContent').mockImplementation(mockFetchWebPageContent);
    vi.spyOn(webFetcher, 'extractMainContent').mockImplementation(mockExtractMainContent);
  });
  
  afterEach(() => {
    vi.resetAllMocks();
  });
  
  describe('Basic handler properties', () => {
    it('should have type "restaurant"', () => {
      expect(handler.type).toBe('restaurant');
    });
    
    it('should require content detection', () => {
      expect(handler.requiresContentDetection()).toBe(true);
    });
    
    it('should not detect by URL', () => {
      expect(handler.detect(new URL('https://example.com/restaurant'))).toBe(false);
    });
    
    it('should return "Restaurants" as folder name', () => {
      expect(handler.getFolderName()).toBe('Restaurants');
    });
  });
  
  describe('getPrompt method', () => {
    it('should generate prompt with content', () => {
      const content: GenericContentMetadata = {
        title: 'Test Restaurant',
        url: 'https://example.com/restaurant',
        content: 'Restaurant content with details about cuisine and location'
      };
      
      const prompt = handler.getPrompt(content);
      
      expect(prompt).toContain('Restaurant content with details about cuisine and location');
      expect(prompt).toContain('Extract the following information');
      expect(prompt).toContain('restaurant');
    });
    
    it('should throw error if no content provided', () => {
      const content: GenericContentMetadata = {
        title: 'Test Restaurant',
        url: 'https://example.com/restaurant',
        content: ''
      };
      
      expect(() => handler.getPrompt(content)).toThrow('No content available');
    });
  });
  
  describe('parseLLMResponse method', () => {
    it('should parse valid JSON response', () => {
      const markdown = '```json\n{\n"restaurantName": "Italian Bistro",\n"cuisine": "Italian",\n"location": "New York",\n"hours": ["Mon-Fri: 11am-10pm", "Sat-Sun: 12pm-11pm"],\n"recommendations": ["Pizza Margherita", "Tiramisu"]\n}\n```';
      
      const result = handler.parseLLMResponse(markdown);
      
      expect(result.restaurantName).toBe('Italian Bistro');
      expect(result.cuisine).toBe('Italian');
      expect(result.location).toBe('New York');
      expect(result.hours).toEqual(['Mon-Fri: 11am-10pm', 'Sat-Sun: 12pm-11pm']);
      expect(result.recommendations).toEqual(['Pizza Margherita', 'Tiramisu']);
    });
    
    it('should parse JSON without code blocks', () => {
      const markdown = '{\n"restaurantName": "Italian Bistro",\n"cuisine": "Italian",\n"location": "New York",\n"hours": ["Mon-Fri: 11am-10pm", "Sat-Sun: 12pm-11pm"]\n}';
      
      const result = handler.parseLLMResponse(markdown);
      
      expect(result.restaurantName).toBe('Italian Bistro');
      expect(result.cuisine).toBe('Italian');
      expect(result.location).toBe('New York');
      expect(result.hours).toEqual(['Mon-Fri: 11am-10pm', 'Sat-Sun: 12pm-11pm']);
    });
    
    it('should throw error if response is not parseable', () => {
      const invalidResponse = 'Not a valid JSON response';
      
      expect(() => handler.parseLLMResponse(invalidResponse)).toThrow('Could not extract JSON');
    });
  });
  
  describe('validateLLMOutput method', () => {
    it('should validate valid restaurant output', () => {
      const validOutput: RestaurantLLMOutput = {
        restaurantName: 'The Diner',
        cuisine: 'American',
        location: 'Chicago',
        hours: ['Mon-Sun: 7am-10pm'],
        recommendations: ['Pancakes', 'Burgers']
      };
      
      expect(handler.validateLLMOutput(validOutput)).toBe(true);
    });
    
    it('should throw error if output indicates not a restaurant', () => {
      const notRestaurantOutput: RestaurantLLMOutput = {
        restaurantName: 'Not a restaurant',
        hours: [],
        recommendations: []
      };
      
      expect(() => handler.validateLLMOutput(notRestaurantOutput)).toThrow('Content is not a restaurant');
    });
    
    it('should add default restaurant name if missing', () => {
      const output: RestaurantLLMOutput = {
        restaurantName: '',
        cuisine: 'Mexican',
        hours: ['Daily: 11am-9pm'],
        recommendations: ['Tacos', 'Guacamole']
      };
      
      handler.validateLLMOutput(output);
      expect(output.restaurantName).toBe('Untitled Restaurant');
    });
  });
  
  describe('getNoteContent method', () => {
    it('should generate markdown note with restaurant data', () => {
      const markdown = '```json\n{\n"restaurantName": "Sushi Palace",\n"cuisine": "Japanese",\n"location": "San Francisco",\n"address": "123 Main St, San Francisco, CA",\n"phoneNumber": "(555) 123-4567",\n"hours": ["Mon-Fri: 11am-10pm", "Sat-Sun: 12pm-11pm"],\n"priceRange": "$$$",\n"recommendations": ["Dragon Roll", "Miso Soup"],\n"rating": "4.5/5",\n"review": "Excellent sushi restaurant with fresh fish and attentive service."\n}\n```';
      
      const content: GenericContentMetadata = {
        title: 'Sushi Restaurant',
        url: 'https://example.com/restaurant',
        content: 'Restaurant content',
        imageUrl: 'https://example.com/sushi.jpg'
      };
      
      const noteContent = handler.getNoteContent(markdown, content);
      
      expect(noteContent).toContain('# Sushi Palace');
      expect(noteContent).toContain('🔗 [Source](https://example.com/restaurant)');
      expect(noteContent).toContain('![Image](https://example.com/sushi.jpg)');
      expect(noteContent).toContain('**Cuisine**: Japanese');
      expect(noteContent).toContain('**Location**: San Francisco');
      expect(noteContent).toContain('**Price Range**: \\$\\$\\$'); // Updated to expect escaped dollar signs
      expect(noteContent).toContain('**Rating**: 4.5/5');
      expect(noteContent).toContain('## Description');
      expect(noteContent).toContain('Excellent sushi restaurant');
      expect(noteContent).toContain('## Recommended Dishes');
      expect(noteContent).toContain('- Dragon Roll');
      expect(noteContent).toContain('## Contact Information');
      expect(noteContent).toContain('**Address**: 123 Main St');
      expect(noteContent).toContain('**Phone**: (555) 123-4567');
      expect(noteContent).toContain('## Hours');
      expect(noteContent).toContain('- Mon-Fri: 11am-10pm');
    });
    
    it('should handle missing optional fields', () => {
      const markdown = '```json\n{\n"restaurantName": "Simple Restaurant",\n"cuisine": "Cafe",\n"location": "Portland"\n}\n```';
      
      const content: GenericContentMetadata = {
        title: 'Simple Restaurant',
        url: 'https://example.com/restaurant',
        content: 'Restaurant content'
      };
      
      const noteContent = handler.getNoteContent(markdown, content);
      
      expect(noteContent).toContain('# Simple Restaurant');
      expect(noteContent).toContain('**Cuisine**: Cafe');
      expect(noteContent).toContain('**Location**: Portland');
      expect(noteContent).not.toContain('## Description');
      expect(noteContent).not.toContain('## Recommended Dishes');
      expect(noteContent).toContain('## Contact Information');
      expect(noteContent).not.toContain('## Hours');
    });
  });
});