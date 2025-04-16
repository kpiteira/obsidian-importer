// filepath: /Users/karl/Documents/dev/obsidian-importer/tests/handlers/RecipeHandler.test.ts
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { RecipeHandler, RecipeLLMOutput } from '../../src/handlers/RecipeHandler';
import { GenericContentMetadata } from '../../src/handlers/GenericContentHandler';
import * as webFetcher from '../../src/utils/webFetcher';

describe('RecipeHandler', () => {
  let handler: RecipeHandler;
  const mockFetchWebPageContent = vi.fn();
  const mockExtractMainContent = vi.fn();
  
  beforeEach(() => {
    handler = new RecipeHandler();
    
    // Mock web fetching functions
    vi.spyOn(webFetcher, 'fetchWebPageContent').mockImplementation(mockFetchWebPageContent);
    vi.spyOn(webFetcher, 'extractMainContent').mockImplementation(mockExtractMainContent);
  });
  
  afterEach(() => {
    vi.resetAllMocks();
  });
  
  describe('Basic handler properties', () => {
    it('should have type "recipe"', () => {
      expect(handler.type).toBe('recipe');
    });
    
    it('should require content detection', () => {
      expect(handler.requiresContentDetection()).toBe(true);
    });
    
    it('should not detect by URL', () => {
      expect(handler.detect(new URL('https://example.com/recipe'))).toBe(false);
    });
    
    it('should return "Recipes" as folder name', () => {
      expect(handler.getFolderName()).toBe('Recipes');
    });
  });
  
  describe('getPrompt method', () => {
    it('should generate prompt with content', () => {
      const content: GenericContentMetadata = {
        title: 'Test Recipe',
        url: 'https://example.com/recipe',
        content: 'Recipe content with ingredients and instructions'
      };
      
      const prompt = handler.getPrompt(content);
      
      expect(prompt).toContain('Recipe content with ingredients and instructions');
      expect(prompt).toContain('Extract the following information');
    });
    
    it('should throw error if no content provided', () => {
      const content: GenericContentMetadata = {
        title: 'Test Recipe',
        url: 'https://example.com/recipe',
        content: ''
      };
      
      expect(() => handler.getPrompt(content)).toThrow('No content available');
    });
  });
  
  describe('parseLLMResponse method', () => {
    it('should parse valid JSON response', () => {
      const markdown = '```json\n{\n"recipeName": "Chocolate Chip Cookies",\n"ingredients": ["2 cups flour", "1 cup sugar"],\n"instructions": ["Mix ingredients", "Bake at 350°F"]\n}\n```';
      
      const result = handler.parseLLMResponse(markdown);
      
      expect(result.recipeName).toBe('Chocolate Chip Cookies');
      expect(result.ingredients).toEqual(['2 cups flour', '1 cup sugar']);
      expect(result.instructions).toEqual(['Mix ingredients', 'Bake at 350°F']);
    });
    
    it('should parse JSON without code blocks', () => {
      const markdown = '{\n"recipeName": "Chocolate Chip Cookies",\n"ingredients": ["2 cups flour", "1 cup sugar"],\n"instructions": ["Mix ingredients", "Bake at 350°F"]\n}';
      
      const result = handler.parseLLMResponse(markdown);
      
      expect(result.recipeName).toBe('Chocolate Chip Cookies');
      expect(result.ingredients).toEqual(['2 cups flour', '1 cup sugar']);
      expect(result.instructions).toEqual(['Mix ingredients', 'Bake at 350°F']);
    });
    
    it('should throw error if response is not parseable', () => {
      const invalidResponse = 'Not a valid JSON response';
      
      expect(() => handler.parseLLMResponse(invalidResponse)).toThrow('Could not extract JSON');
    });
  });
  
  describe('validateLLMOutput method', () => {
    it('should validate valid recipe output', () => {
      const validOutput: RecipeLLMOutput = {
        recipeName: 'Chocolate Cake',
        ingredients: ['Flour', 'Sugar', 'Cocoa powder'],
        instructions: ['Mix dry ingredients', 'Add wet ingredients', 'Bake']
      };
      
      expect(handler.validateLLMOutput(validOutput)).toBe(true);
    });
    
    it('should throw error if output indicates not a recipe', () => {
      const notRecipeOutput: RecipeLLMOutput = {
        recipeName: 'Not a recipe',
        ingredients: [],
        instructions: []
      };
      
      expect(() => handler.validateLLMOutput(notRecipeOutput)).toThrow('Content is not a recipe');
    });
    
    it('should add default recipe name if missing', () => {
      const output: RecipeLLMOutput = {
        recipeName: '',
        ingredients: ['Flour', 'Sugar'],
        instructions: ['Mix', 'Bake']
      };
      
      handler.validateLLMOutput(output);
      expect(output.recipeName).toBe('Untitled Recipe');
    });
    
    it('should throw error if both ingredients and instructions are empty', () => {
      const invalidOutput: RecipeLLMOutput = {
        recipeName: 'Empty Recipe',
        ingredients: [],
        instructions: []
      };
      
      expect(() => handler.validateLLMOutput(invalidOutput)).toThrow('Invalid recipe');
    });
  });
  
  describe('getNoteContent method', () => {
    it('should generate markdown note with recipe data', () => {
      const markdown = '```json\n{\n"recipeName": "Chocolate Chip Cookies",\n"ingredients": ["2 cups flour", "1 cup sugar"],\n"instructions": ["Mix ingredients", "Bake at 350°F"],\n"prepTime": "15 minutes",\n"cookTime": "10 minutes",\n"servings": "24 cookies"}\n```';
      
      const content: GenericContentMetadata = {
        title: 'Cookies Recipe',
        url: 'https://example.com/recipe',
        content: 'Recipe content',
        imageUrl: 'https://example.com/cookie.jpg'
      };
      
      const noteContent = handler.getNoteContent(markdown, content);
      
      expect(noteContent).toContain('# Chocolate Chip Cookies');
      expect(noteContent).toContain('🔗 [Source](https://example.com/recipe)');
      expect(noteContent).toContain('![Image](https://example.com/cookie.jpg)');
      expect(noteContent).toContain('## Ingredients');
      expect(noteContent).toContain('- 2 cups flour');
      expect(noteContent).toContain('## Instructions');
      expect(noteContent).toContain('1. Mix ingredients');
      expect(noteContent).toContain('## Metadata');
      expect(noteContent).toContain('- Servings: 24 cookies');
      expect(noteContent).toContain('- Prep Time: 15 minutes');
      expect(noteContent).toContain('- Cook Time: 10 minutes');
    });
    
    it('should handle missing optional fields', () => {
      const markdown = '```json\n{\n"recipeName": "Simple Recipe",\n"ingredients": ["Ingredient 1"],\n"instructions": ["Step 1"]}\n```';
      
      const content: GenericContentMetadata = {
        title: 'Simple Recipe',
        url: 'https://example.com/recipe',
        content: 'Recipe content'
      };
      
      const noteContent = handler.getNoteContent(markdown, content);
      
      expect(noteContent).toContain('# Simple Recipe');
      expect(noteContent).toContain('## Ingredients');
      expect(noteContent).toContain('- Ingredient 1');
      expect(noteContent).toContain('## Instructions');
      expect(noteContent).toContain('1. Step 1');
      expect(noteContent).toContain('## Metadata');
      expect(noteContent).not.toContain('- Servings:');
      expect(noteContent).not.toContain('- Prep Time:');
    });
  });
});