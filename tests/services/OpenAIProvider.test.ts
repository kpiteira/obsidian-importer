// filepath: /Users/karl/Documents/dev/obsidian-importer/tests/services/OpenAIProvider.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OpenAIProvider } from '../../src/services/OpenAIProvider';
import { requestUrl } from 'obsidian';

// Mock the Obsidian requestUrl function
vi.mock('obsidian', () => ({
  requestUrl: vi.fn()
}));

// Mock the logger to avoid console output during tests
vi.mock('../../src/utils/importerLogger', () => ({
  getLogger: () => ({
    error: vi.fn(),
    warn: vi.fn(),
    log: vi.fn(),
    debugLog: vi.fn(),
    setDebugMode: vi.fn()
  })
}));

describe('OpenAIProvider', () => {
  let provider: OpenAIProvider;
  const mockApiKey = 'test-api-key';
  
  beforeEach(() => {
    vi.resetAllMocks();
    provider = new OpenAIProvider(mockApiKey);
  });
  
  describe('getName', () => {
    it('returns the correct provider name', () => {
      expect(provider.getName()).toBe('OpenAI');
    });
  });
  
  describe('getDefaultEndpoint', () => {
    it('returns the correct default endpoint', () => {
      expect(provider.getDefaultEndpoint()).toBe('https://api.openai.com/v1');
    });
  });
  
  describe('getAvailableModels', () => {
    it('returns models from the API when the call succeeds', async () => {
      // Mock the API response for models
      (requestUrl as unknown as vi.Mock).mockResolvedValueOnce({
        status: 200,
        json: {
          data: [
            { id: 'gpt-4', object: 'model' },
            { id: 'gpt-3.5-turbo', object: 'model' },
            { id: 'davinci', object: 'model' } // This should be filtered out
          ]
        }
      });
      
      const models = await provider.getAvailableModels();
      
      expect(requestUrl).toHaveBeenCalledWith({
        url: 'https://api.openai.com/v1/models',
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${mockApiKey}`,
          'Content-Type': 'application/json',
        },
      });
      
      expect(models).toEqual([
        { id: 'gpt-4', name: 'gpt-4', contextLength: 8192 },
        { id: 'gpt-3.5-turbo', name: 'gpt-3.5-turbo', contextLength: 4096 }
      ]);
    });
    
    it('returns fallback models when the API call fails', async () => {
      // Mock API call failure
      (requestUrl as unknown as vi.Mock).mockRejectedValueOnce(new Error('API error'));
      
      const models = await provider.getAvailableModels();
      
      expect(models.length).toBeGreaterThan(0);
      expect(models.some(model => model.id === 'gpt-4')).toBe(true);
      expect(models.some(model => model.id === 'gpt-3.5-turbo')).toBe(true);
    });
  });
  
  describe('callLLM', () => {
    it('calls the OpenAI API and returns the response content', async () => {
      // Mock the API response
      (requestUrl as unknown as vi.Mock).mockResolvedValueOnce({
        status: 200,
        json: {
          choices: [{ message: { content: 'Test response' } }]
        }
      });
      
      const response = await provider.callLLM('Test prompt');
      
      expect(response).toBe('Test response');
    });
  });
  
  describe('requiresApiKey', () => {
    it('returns true as OpenAI requires an API key', () => {
      expect(provider.requiresApiKey()).toBe(true);
    });
  });
  
  describe('requiresEndpoint', () => {
    it('returns true as OpenAI allows custom endpoints', () => {
      expect(provider.requiresEndpoint()).toBe(true);
    });
  });
  
  describe('validateConnection', () => {
    it('returns true when getAvailableModels succeeds', async () => {
      // Mock the API response for models
      (requestUrl as unknown as vi.Mock).mockResolvedValueOnce({
        status: 200,
        json: {
          data: [{ id: 'gpt-4', object: 'model' }]
        }
      });
      
      const isValid = await provider.validateConnection();
      
      expect(isValid).toBe(true);
    });
    
    it('returns false when getAvailableModels fails', async () => {
      // Mock API call failure
      (requestUrl as unknown as vi.Mock).mockRejectedValueOnce(new Error('API error'));
      
      const isValid = await provider.validateConnection();
      
      expect(isValid).toBe(false);
    });
  });
});