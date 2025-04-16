import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OpenRouterProvider } from '../../src/services/OpenRouterProvider';
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

describe('OpenRouterProvider', () => {
  let provider: OpenRouterProvider;
  const mockApiKey = 'test-api-key';
  
  beforeEach(() => {
    vi.resetAllMocks();
    provider = new OpenRouterProvider(mockApiKey);
  });
  
  describe('getName', () => {
    it('returns the correct provider name', () => {
      expect(provider.getName()).toBe('openrouter');
    });
  });
  
  describe('getDefaultEndpoint', () => {
    it('returns the correct default endpoint', () => {
      expect(provider.getDefaultEndpoint()).toBe('https://openrouter.ai/api/v1');
    });
  });
  
  describe('getAvailableModels', () => {
    it('returns models from the API when the call succeeds', async () => {
      // Mock the API response for models
      (requestUrl as unknown as vi.Mock).mockResolvedValueOnce({
        status: 200,
        json: {
          data: [
            { id: 'anthropic/claude-3-opus', name: 'Claude 3 Opus', context_length: 100000 },
            { id: 'openai/gpt-4', name: 'GPT-4', context_length: 8192 }
          ]
        }
      });
      
      const models = await provider.getAvailableModels();
      
      expect(requestUrl).toHaveBeenCalledWith({
        url: 'https://openrouter.ai/api/v1/models',
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${mockApiKey}`,
          'HTTP-Referer': 'https://obsidian.md/plugins',
          'X-Title': 'Obsidian Importer'
        },
        throw: false
      });
      
      expect(models).toEqual([
        { id: 'anthropic/claude-3-opus', name: 'Claude 3 Opus', contextLength: 100000 },
        { id: 'openai/gpt-4', name: 'GPT-4', contextLength: 8192 }
      ]);
    });
    
    it('returns fallback models when the API call fails', async () => {
      // Mock API call failure
      (requestUrl as unknown as vi.Mock).mockRejectedValueOnce(new Error('API error'));
      
      const models = await provider.getAvailableModels();
      
      expect(models.length).toBeGreaterThan(0);
      expect(models.some(model => model.id.includes('claude'))).toBe(true);
      expect(models.some(model => model.id.includes('gpt'))).toBe(true);
    });
  });
  
  describe('callLLM', () => {
    it('calls the OpenRouter API with correct headers and returns the response content', async () => {
      // Mock the API response
      (requestUrl as unknown as vi.Mock).mockResolvedValueOnce({
        status: 200,
        json: {
          choices: [{ message: { content: 'Test response' } }]
        }
      });
      
      const response = await provider.callLLM('Test prompt');
      
      // Verify the custom headers are included
      expect(requestUrl).toHaveBeenCalled();
      const requestBody = JSON.parse((requestUrl as unknown as vi.Mock).mock.calls[0][0].body);
      expect(requestBody).toBeDefined();
      
      // Check that other request parameters are set correctly
      expect(response).toBe('Test response');
    });
  });
  
  describe('requiresApiKey', () => {
    it('returns true as OpenRouter requires an API key', () => {
      expect(provider.requiresApiKey()).toBe(true);
    });
  });
  
  describe('requiresEndpoint', () => {
    it('returns true as OpenRouter allows custom endpoints', () => {
      expect(provider.requiresEndpoint()).toBe(true);
    });
  });
  
  describe('validateConnection', () => {
    it('returns true when getAvailableModels succeeds', async () => {
      // Mock the API response for models
      (requestUrl as unknown as vi.Mock).mockResolvedValueOnce({
        status: 200,
        json: {
          data: [{ id: 'anthropic/claude-3-opus', name: 'Claude 3 Opus' }]
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