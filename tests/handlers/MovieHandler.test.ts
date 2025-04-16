// filepath: /Users/karl/Documents/dev/obsidian-importer/tests/handlers/MovieHandler.test.ts
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { MovieHandler, MovieLLMOutput } from '../../src/handlers/MovieHandler';
import { GenericContentMetadata } from '../../src/handlers/GenericContentHandler';
import * as webFetcher from '../../src/utils/webFetcher';

describe('MovieHandler', () => {
  let handler: MovieHandler;
  const mockFetchWebPageContent = vi.fn();
  const mockExtractMainContent = vi.fn();
  
  beforeEach(() => {
    handler = new MovieHandler();
    
    // Mock web fetching functions
    vi.spyOn(webFetcher, 'fetchWebPageContent').mockImplementation(mockFetchWebPageContent);
    vi.spyOn(webFetcher, 'extractMainContent').mockImplementation(mockExtractMainContent);
  });
  
  afterEach(() => {
    vi.resetAllMocks();
  });
  
  describe('Basic handler properties', () => {
    it('should have type "movie"', () => {
      expect(handler.type).toBe('movie');
    });
    
    it('should require content detection', () => {
      expect(handler.requiresContentDetection()).toBe(true);
    });
    
    it('should not detect by URL', () => {
      expect(handler.detect(new URL('https://example.com/movies/inception'))).toBe(false);
    });
    
    it('should return "Movies" as folder name', () => {
      expect(handler.getFolderName()).toBe('Movies');
    });
  });
  
  describe('getPrompt method', () => {
    it('should generate prompt with content', () => {
      const content: GenericContentMetadata = {
        title: 'Inception',
        url: 'https://example.com/movies/inception',
        content: 'Movie content with details about plot and cast'
      };
      
      const prompt = handler.getPrompt(content);
      
      expect(prompt).toContain('Movie content with details about plot and cast');
      expect(prompt).toContain('Extract the following information');
      expect(prompt).toContain('movie');
    });
    
    it('should throw error if no content provided', () => {
      const content: GenericContentMetadata = {
        title: 'Inception',
        url: 'https://example.com/movies/inception',
        content: ''
      };
      
      expect(() => handler.getPrompt(content)).toThrow('No content available');
    });
  });
  
  describe('parseLLMResponse method', () => {
    it('should parse valid JSON response', () => {
      const markdown = '```json\n{\n"movieTitle": "Inception",\n"director": "Christopher Nolan",\n"year": "2010",\n"genre": ["Sci-Fi", "Action", "Thriller"],\n"cast": ["Leonardo DiCaprio", "Joseph Gordon-Levitt", "Ellen Page"],\n"plot": "A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O."\n}\n```';
      
      const result = handler.parseLLMResponse(markdown);
      
      expect(result.movieTitle).toBe('Inception');
      expect(result.director).toBe('Christopher Nolan');
      expect(result.year).toBe('2010');
      expect(result.genre).toEqual(['Sci-Fi', 'Action', 'Thriller']);
      expect(result.cast).toEqual(['Leonardo DiCaprio', 'Joseph Gordon-Levitt', 'Ellen Page']);
      expect(result.plot).toContain('thief who steals corporate secrets');
    });
    
    it('should parse JSON without code blocks', () => {
      const markdown = '{\n"movieTitle": "Inception",\n"director": "Christopher Nolan",\n"year": "2010",\n"genre": ["Sci-Fi", "Action"],\n"cast": ["Leonardo DiCaprio"]\n}';
      
      const result = handler.parseLLMResponse(markdown);
      
      expect(result.movieTitle).toBe('Inception');
      expect(result.director).toBe('Christopher Nolan');
      expect(result.year).toBe('2010');
      expect(result.genre).toEqual(['Sci-Fi', 'Action']);
      expect(result.cast).toEqual(['Leonardo DiCaprio']);
    });
    
    it('should throw error if response is not parseable', () => {
      const invalidResponse = 'Not a valid JSON response';
      
      expect(() => handler.parseLLMResponse(invalidResponse)).toThrow('Could not extract JSON');
    });
  });
  
  describe('validateLLMOutput method', () => {
    it('should validate valid movie output', () => {
      const validOutput: MovieLLMOutput = {
        movieTitle: 'The Godfather',
        director: 'Francis Ford Coppola',
        year: '1972',
        genre: ['Crime', 'Drama'],
        cast: ['Marlon Brando', 'Al Pacino']
      };
      
      expect(handler.validateLLMOutput(validOutput)).toBe(true);
    });
    
    it('should throw error if output indicates not a movie', () => {
      const notMovieOutput: MovieLLMOutput = {
        movieTitle: 'Not a movie',
        genre: [],
        cast: []
      };
      
      expect(() => handler.validateLLMOutput(notMovieOutput)).toThrow('Content is not a movie');
    });
    
    it('should add default movie title if missing', () => {
      const output: MovieLLMOutput = {
        movieTitle: '',
        director: 'James Cameron',
        cast: ['Sam Worthington', 'Zoe Saldana']
      };
      
      handler.validateLLMOutput(output);
      expect(output.movieTitle).toBe('Untitled Movie');
    });
    
    it('should initialize arrays if they are not provided', () => {
      const output = {
        movieTitle: 'Test Movie',
        director: 'Test Director'
      } as MovieLLMOutput;
      
      handler.validateLLMOutput(output);
      expect(output.genre).toEqual([]);
      expect(output.cast).toEqual([]);
      expect(output.reviews).toEqual([]);
    });
  });
  
  describe('getNoteContent method', () => {
    it('should generate markdown note with movie data', () => {
      const markdown = '```json\n{\n"movieTitle": "The Matrix",\n"director": "Lana and Lilly Wachowski",\n"year": "1999",\n"genre": ["Sci-Fi", "Action"],\n"cast": ["Keanu Reeves", "Laurence Fishburne", "Carrie-Anne Moss"],\n"duration": "136 minutes",\n"rating": "8.7/10",\n"plot": "A computer hacker learns from mysterious rebels about the true nature of his reality and his role in the war against its controllers.",\n"reviews": ["Revolutionary for its time", "Groundbreaking visual effects"]\n}\n```';
      
      const content: GenericContentMetadata = {
        title: 'The Matrix',
        url: 'https://example.com/movies/matrix',
        content: 'Movie content',
        imageUrl: 'https://example.com/matrix.jpg'
      };
      
      const noteContent = handler.getNoteContent(markdown, content);
      
      expect(noteContent).toContain('# The Matrix');
      expect(noteContent).toContain('🔗 [Source](https://example.com/movies/matrix)');
      expect(noteContent).toContain('![Image](https://example.com/matrix.jpg)');
      expect(noteContent).toContain('**Year**: 1999');
      expect(noteContent).toContain('**Duration**: 136 minutes');
      expect(noteContent).toContain('**Rating**: 8.7/10');
      expect(noteContent).toContain('**Director**: Lana and Lilly Wachowski');
      expect(noteContent).toContain('## Genre');
      expect(noteContent).toContain('- Sci-Fi');
      expect(noteContent).toContain('- Action');
      expect(noteContent).toContain('## Cast');
      expect(noteContent).toContain('- Keanu Reeves');
      expect(noteContent).toContain('## Plot');
      expect(noteContent).toContain('A computer hacker learns');
      expect(noteContent).toContain('## Reviews');
      expect(noteContent).toContain('> Revolutionary for its time');
    });
    
    it('should handle missing optional fields', () => {
      const markdown = '```json\n{\n"movieTitle": "Simple Movie",\n"director": "A Director",\n"cast": ["Actor One", "Actor Two"]\n}\n```';
      
      const content: GenericContentMetadata = {
        title: 'Simple Movie',
        url: 'https://example.com/movies/simple',
        content: 'Movie content'
      };
      
      const noteContent = handler.getNoteContent(markdown, content);
      
      expect(noteContent).toContain('# Simple Movie');
      expect(noteContent).toContain('**Director**: A Director');
      expect(noteContent).not.toContain('**Year**:');
      expect(noteContent).not.toContain('**Rating**:');
      expect(noteContent).not.toContain('## Genre');
      expect(noteContent).toContain('## Cast');
      expect(noteContent).not.toContain('## Plot');
      expect(noteContent).not.toContain('## Reviews');
    });
  });
});