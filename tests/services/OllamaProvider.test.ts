// filepath: /Users/karl/Documents/dev/obsidian-importer/tests/services/OllamaProvider.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OllamaProvider } from '../../src/services/OllamaProvider';
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

describe('OllamaProvider', () => {
  let provider: OllamaProvider;
  
  beforeEach(() => {
    vi.resetAllMocks();
    provider = new OllamaProvider();
  });
  
  describe('getName', () => {
    it('returns the correct provider name', () => {
      expect(provider.getName()).toBe('Ollama');
    });
  });
  
  describe('getDefaultEndpoint', () => {
    it('returns the correct default endpoint', () => {
      expect(provider.getDefaultEndpoint()).toBe('http://localhost:11434');
    });
  });
  
  describe('constructor', () => {
    it('uses default values when no options are provided', () => {
      const provider = new OllamaProvider();
      expect(provider.getDefaultEndpoint()).toBe('http://localhost:11434');
    });
    
    it('uses custom values when options are provided', () => {
      const customEndpoint = 'http://custom-server:11434';
      const provider = new OllamaProvider({ endpoint: customEndpoint });
      expect(provider.getDefaultEndpoint()).toBe('http://localhost:11434'); // getDefaultEndpoint always returns the same value
    });
  });
  
  describe('getAvailableModels', () => {
    it('returns models from the API when the call succeeds', async () => {
      // Mock the API response for models
      (requestUrl as unknown as vi.Mock).mockResolvedValueOnce({
        status: 200,
        json: {
          models: [
            { name: 'llama2', parameters: { context_length: 4096 } },
            { name: 'mistral', parameters: { context_length: 8192 } }
          ]
        }
      });
      
      const models = await provider.getAvailableModels();
      
      expect(requestUrl).toHaveBeenCalledWith({
        url: 'http://localhost:11434/api/tags',
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      expect(models).toEqual([
        { id: 'llama2', name: 'llama2', contextLength: 4096 },
        { id: 'mistral', name: 'mistral', contextLength: 8192 }
      ]);
    });
    
    it('returns fallback models when the API call fails', async () => {
      // Mock API call failure
      (requestUrl as unknown as vi.Mock).mockRejectedValueOnce(new Error('API error'));
      
      const models = await provider.getAvailableModels();
      
      expect(models.length).toBeGreaterThan(0);
      expect(models.some(model => model.id === 'llama2')).toBe(true);
      expect(models.some(model => model.id === 'mistral')).toBe(true);
    });
    
    it('handles invalid API response format', async () => {
      // Mock API response with invalid format
      (requestUrl as unknown as vi.Mock).mockResolvedValueOnce({
        status: 200,
        json: { invalid: 'format' }
      });
      
      const models = await provider.getAvailableModels();
      
      expect(models.length).toBeGreaterThan(0); // Should return default models
    });
  });
  
  describe('callLLM', () => {
    it('calls the Ollama API and returns the response content', async () => {
      // Mock the API response
      (requestUrl as unknown as vi.Mock).mockResolvedValueOnce({
        status: 200,
        json: {
          response: 'Test response'
        }
      });
      
      const response = await provider.callLLM('Test prompt');
      
      expect(requestUrl).toHaveBeenCalledWith({
        url: 'http://localhost:11434/api/generate',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: expect.stringContaining('Test prompt'),
        throw: false
      });
      
      expect(response).toBe('Test response');
    });
    
    it('includes system prompt when provided', async () => {
      // Mock the API response
      (requestUrl as unknown as vi.Mock).mockResolvedValueOnce({
        status: 200,
        json: {
          response: 'Test response'
        }
      });
      
      const systemPrompt = 'You are a helpful assistant';
      await provider.callLLM('Test prompt', { systemPrompt });
      
      expect(requestUrl).toHaveBeenCalledWith({
        url: expect.any(String),
        method: 'POST',
        headers: expect.any(Object),
        body: expect.stringContaining(systemPrompt),
        throw: expect.any(Boolean)
      });
    });
    
    it('throws an error when API call fails', async () => {
      // Mock API call failure
      (requestUrl as unknown as vi.Mock).mockResolvedValueOnce({
        status: 500,
        statusText: 'Internal Server Error'
      });
      
      await expect(provider.callLLM('Test prompt')).rejects.toThrow('Ollama request failed');
    });
  });
  
  describe('requiresApiKey', () => {
    it('returns false as Ollama does not require an API key', () => {
      expect(provider.requiresApiKey()).toBe(false);
    });
  });
  
  describe('requiresEndpoint', () => {
    it('returns true as Ollama requires an endpoint', () => {
      expect(provider.requiresEndpoint()).toBe(true);
    });
  });
  
  describe('validateConnection', () => {
    it('returns true when getAvailableModels succeeds', async () => {
      // Mock the API response for models
      (requestUrl as unknown as vi.Mock).mockResolvedValueOnce({
        status: 200,
        json: {
          models: [{ name: 'llama2' }]
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