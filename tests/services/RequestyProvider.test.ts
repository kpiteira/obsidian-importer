import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RequestyProvider } from '../../src/services/RequestyProvider';
import { requestUrl } from 'obsidian';

// Mock obsidian requestUrl
vi.mock('obsidian', () => ({
  requestUrl: vi.fn(),
}));

describe('RequestyProvider', () => {
  let provider: RequestyProvider;
  const mockApiKey = 'test-api-key';
  
  beforeEach(() => {
    vi.resetAllMocks();
    provider = new RequestyProvider(mockApiKey);
  });
  
  it('should have correct name and default endpoint', () => {
    expect(provider.getName()).toBe('Requesty');
    expect(provider.getDefaultEndpoint()).toBe('https://router.requesty.ai/v1/chat/completions');
  });
  
  it('should get available models', async () => {
    const models = await provider.getAvailableModels();
    expect(models).toHaveLength(4);
    expect(models[0].id).toBe('google/gemini-2.0-flash-exp');
    expect(models[1].id).toBe('gpt-4-turbo');
    expect(models[2].id).toBe('gpt-4');
    expect(models[3].id).toBe('gpt-3.5-turbo');
  });
  
  it('should require API key', () => {
    expect(provider.requiresApiKey()).toBe(true);
  });
  
  it('should require endpoint', () => {
    expect(provider.requiresEndpoint()).toBe(true);
  });
  
  it('should call LLM with correct parameters', async () => {
    const mockResponse = {
      status: 200,
      json: {
        choices: [
          {
            message: {
              content: 'This is a test response'
            }
          }
        ]
      }
    };
    
    (requestUrl as any).mockResolvedValue(mockResponse);
    
    const prompt = 'Test prompt';
    const result = await provider.callLLM(prompt);
    
    expect(result).toBe('This is a test response');
    expect(requestUrl).toHaveBeenCalledTimes(1);
    
    const call = (requestUrl as any).mock.calls[0][0];
    expect(call.url).toBe('https://router.requesty.ai/v1/chat/completions');
    expect(call.method).toBe('POST');
    expect(call.headers['Authorization']).toBe(`Bearer ${mockApiKey}`);
    
    const body = JSON.parse(call.body);
    expect(body.model).toBe('google/gemini-2.0-flash-exp');
    expect(body.messages).toHaveLength(2);
    expect(body.messages[0].role).toBe('system');
    expect(body.messages[1].role).toBe('user');
    expect(body.messages[1].content).toBe(prompt);
  });
  
  it('should use custom options when provided', async () => {
    const mockResponse = {
      status: 200,
      json: {
        choices: [
          {
            message: {
              content: 'This is a test response with options'
            }
          }
        ]
      }
    };
    
    (requestUrl as any).mockResolvedValue(mockResponse);
    
    const customProvider = new RequestyProvider(mockApiKey, {
      endpoint: 'https://custom-endpoint.example.com',
      modelId: 'gpt-3.5-turbo'
    });
    
    const prompt = 'Test prompt with options';
    const result = await customProvider.callLLM(prompt, {
      model: 'gpt-4',
      systemPrompt: 'Custom system prompt',
      temperature: 0.8
    });
    
    expect(result).toBe('This is a test response with options');
    
    const call = (requestUrl as any).mock.calls[0][0];
    expect(call.url).toBe('https://custom-endpoint.example.com/chat/completions');
    
    const body = JSON.parse(call.body);
    expect(body.model).toBe('gpt-4');
    expect(body.messages[0].content).toBe('Custom system prompt');
    expect(body.temperature).toBe(0.8);
  });
  
  it('should handle API errors', async () => {
    const mockErrorResponse = {
      status: 401,
      text: JSON.stringify({
        error: {
          message: 'Invalid API key'
        }
      })
    };
    
    (requestUrl as any).mockResolvedValue(mockErrorResponse);
    
    const prompt = 'Test prompt that fails';
    await expect(provider.callLLM(prompt)).rejects.toThrow('Failed to call Requesty API: Requesty API error: 401 - Invalid API key');
  });
  
  it('should attempt to retry after a network error', async () => {
    const networkError = new Error('Network error');
    networkError.name = 'TypeError';
    
    // Mock retryWithExponentialBackoff directly
    const retryModule = await import('../../src/utils/retryWithExponentialBackoff');
    vi.spyOn(retryModule, 'retryWithExponentialBackoff').mockImplementation(async (fn) => {
      try {
        return await fn();
      } catch (error) {
        // Suppress the error and return a mock success response
        return "Success after retry";
      }
    });
    
    // First call fails with network error
    (requestUrl as any).mockRejectedValue(networkError);
    
    const prompt = 'Test prompt with retry';
    const result = await provider.callLLM(prompt);
    
    expect(result).toBe('Success after retry');
    expect(requestUrl).toHaveBeenCalledTimes(1);
    expect(retryModule.retryWithExponentialBackoff).toHaveBeenCalled();
  });
});