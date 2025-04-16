import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BaseOpenAIProvider } from '../../src/services/BaseOpenAIProvider';
import { ModelInfo } from '../../src/services/LLMProvider';
import { requestUrl } from 'obsidian';

// Mock obsidian requestUrl
vi.mock('obsidian', () => ({
  requestUrl: vi.fn(),
}));

// Concrete implementation of BaseOpenAIProvider for testing
class TestOpenAIProvider extends BaseOpenAIProvider {
  getName(): string {
    return 'TestProvider';
  }
  
  getDefaultEndpoint(): string {
    return 'https://test-api.example.com/v1/chat/completions';
  }
  
  async getAvailableModels(): Promise<ModelInfo[]> {
    return [
      { id: 'test-model-1', name: 'Test Model 1' },
      { id: 'test-model-2', name: 'Test Model 2' }
    ];
  }
}

describe('BaseOpenAIProvider', () => {
  let provider: TestOpenAIProvider;
  const mockApiKey = 'test-api-key';
  const mockEndpoint = 'https://test-api.example.com/v1/chat/completions';
  const mockModelId = 'test-model-1';
  
  beforeEach(() => {
    vi.resetAllMocks();
    provider = new TestOpenAIProvider(mockApiKey, mockEndpoint, mockModelId);
  });
  
  it('should have correct name and default endpoint', () => {
    expect(provider.getName()).toBe('TestProvider');
    expect(provider.getDefaultEndpoint()).toBe('https://test-api.example.com/v1/chat/completions');
  });
  
  it('should get available models', async () => {
    const models = await provider.getAvailableModels();
    expect(models).toHaveLength(2);
    expect(models[0].id).toBe('test-model-1');
    expect(models[1].id).toBe('test-model-2');
  });
  
  it('should validate connection successfully when models are available', async () => {
    const isValid = await provider.validateConnection();
    expect(isValid).toBe(true);
  });
  
  it('should fail validation when models cannot be retrieved', async () => {
    const mockProviderWithError = new TestOpenAIProvider(mockApiKey, mockEndpoint, mockModelId);
    vi.spyOn(mockProviderWithError, 'getAvailableModels').mockRejectedValue(new Error('API error'));
    
    const isValid = await mockProviderWithError.validateConnection();
    expect(isValid).toBe(false);
  });
  
  it('should require API key by default', () => {
    expect(provider.requiresApiKey()).toBe(true);
  });
  
  it('should require endpoint by default', () => {
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
    expect(call.url).toBe(mockEndpoint);
    expect(call.method).toBe('POST');
    expect(call.headers['Authorization']).toBe(`Bearer ${mockApiKey}`);
    
    const body = JSON.parse(call.body);
    expect(body.model).toBe(mockModelId);
    expect(body.messages).toHaveLength(2);
    expect(body.messages[0].role).toBe('system');
    expect(body.messages[1].role).toBe('user');
    expect(body.messages[1].content).toBe(prompt);
  });
  
  it('should override default options when provided', async () => {
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
    
    const prompt = 'Test prompt with options';
    const result = await provider.callLLM(prompt, {
      model: 'custom-model',
      endpoint: 'https://custom-endpoint.example.com',
      systemPrompt: 'Custom system prompt',
      temperature: 0.8,
      maxTokens: 1000
    });
    
    expect(result).toBe('This is a test response with options');
    
    const call = (requestUrl as any).mock.calls[0][0];
    expect(call.url).toBe('https://custom-endpoint.example.com/chat/completions');
    
    const body = JSON.parse(call.body);
    expect(body.model).toBe('custom-model');
    expect(body.messages[0].content).toBe('Custom system prompt');
    expect(body.temperature).toBe(0.8);
    expect(body.max_tokens).toBe(1000);
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
    await expect(provider.callLLM(prompt)).rejects.toThrow('Failed to call TestProvider API: TestProvider API error: 401 - Invalid API key');
  });
  
  it('should handle invalid response format', async () => {
    const mockInvalidResponse = {
      status: 200,
      json: {
        // Missing choices array
        result: 'something else'
      }
    };
    
    (requestUrl as any).mockResolvedValue(mockInvalidResponse);
    
    const prompt = 'Test prompt with invalid response';
    await expect(provider.callLLM(prompt)).rejects.toThrow('API call failed after 3 attempts: Failed to call TestProvider API: Invalid response format from TestProvider API');
  });
});