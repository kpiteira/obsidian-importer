import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LLMProvider, ProviderType } from '../../src/services/LLMProvider';
import { LLMProviderRegistry } from '../../src/services/LLMProviderRegistry';
import { createLLMProvider, createProviderRegistry } from '../../src/orchestrator/orchestratorFactory';
import { PluginSettings } from '../../src/utils/settings';

// Mock all providers since they're all implemented in V2
vi.mock('../../src/services/RequestyProvider', () => {
  return {
    RequestyProvider: vi.fn().mockImplementation((apiKey, options = {}) => {
      return {
        apiKey,
        options,
        getName: () => 'requesty',
        getDefaultEndpoint: () => 'https://router.requesty.ai/v1/chat/completions',
        getAvailableModels: async () => [{ id: 'test-model', name: 'Test Model' }],
        callLLM: async () => 'test response',
        validateConnection: async () => true,
        requiresApiKey: () => true,
        requiresEndpoint: () => true
      };
    })
  };
});

vi.mock('../../src/services/OpenAIProvider', () => {
  return {
    OpenAIProvider: vi.fn().mockImplementation((apiKey, options = {}) => {
      return {
        apiKey,
        options,
        getName: () => 'openai',
        getDefaultEndpoint: () => 'https://api.openai.com/v1',
        getAvailableModels: async () => [{ id: 'gpt-4', name: 'GPT-4' }],
        callLLM: async () => 'test response',
        validateConnection: async () => true,
        requiresApiKey: () => true,
        requiresEndpoint: () => true
      };
    })
  };
});

vi.mock('../../src/services/OllamaProvider', () => {
  return {
    OllamaProvider: vi.fn().mockImplementation((options = {}) => {
      return {
        options,
        getName: () => 'ollama',
        getDefaultEndpoint: () => 'http://localhost:11434',
        getAvailableModels: async () => [{ id: 'llama2', name: 'Llama 2' }],
        callLLM: async () => 'test response',
        validateConnection: async () => true,
        requiresApiKey: () => false,
        requiresEndpoint: () => true
      };
    })
  };
});

vi.mock('../../src/services/OpenRouterProvider', () => {
  return {
    OpenRouterProvider: vi.fn().mockImplementation((apiKey, options = {}) => {
      return {
        apiKey,
        options,
        getName: () => 'openrouter',
        getDefaultEndpoint: () => 'https://openrouter.ai/api/v1',
        getAvailableModels: async () => [{ id: 'claude-3', name: 'Claude 3' }],
        callLLM: async () => 'test response',
        validateConnection: async () => true,
        requiresApiKey: () => true,
        requiresEndpoint: () => true
      };
    })
  };
});

// Need to mock the logger for debugging
vi.mock('../../src/utils/importerLogger', () => {
  return {
    getLogger: vi.fn(() => ({
      debugLog: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    }))
  };
});

describe('orchestratorFactory', () => {
  let defaultSettings: PluginSettings;
  
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Create minimal settings for tests
    defaultSettings = {
      selectedProvider: ProviderType.REQUESTY,
      providerSettings: {
        [ProviderType.REQUESTY]: {
          apiKey: 'requesty-key',
          endpoint: 'https://requesty-endpoint.com',
          model: 'requesty-model'
        },
        [ProviderType.OPENAI]: {
          apiKey: 'openai-key',
          endpoint: 'https://api.openai.com/v1',
          model: 'gpt-4'
        }
      },
      apiKey: 'legacy-key',
      llmEndpoint: 'legacy-endpoint',
      model: 'legacy-model',
      defaultFolder: 'test-folder',
      debug: false
    };
  });
  
  describe('createLLMProvider', () => {
    it('should create provider based on selectedProvider', () => {
      const provider = createLLMProvider(defaultSettings);
      
      expect(provider).toBeDefined();
      expect(provider.getName).toBeDefined();
      expect(typeof provider.callLLM).toBe('function');
    });
    
    it('should use provider-specific settings when available', () => {
      // Set up with OpenAI as selected provider 
      const settings = {
        ...defaultSettings,
        selectedProvider: ProviderType.OPENAI
      };
      
      const provider = createLLMProvider(settings);
      
      expect(provider).toBeDefined();
      expect(provider.getName).toBeDefined();
      expect(typeof provider.callLLM).toBe('function');
    });
    
    it('should handle provider-specific defaults for local providers', () => {
      // Set up with a provider that has no specific settings
      const settings = {
        ...defaultSettings,
        selectedProvider: ProviderType.LOCAL
      };
      
      const provider = createLLMProvider(settings);
      
      expect(provider).toBeDefined();
      expect(provider.getName).toBeDefined();
      expect(typeof provider.callLLM).toBe('function');
    });
  });
  
  describe('createProviderRegistry', () => {
    it('should register providers in registry', () => {
      const registry = createProviderRegistry(defaultSettings);
      
      // Registry should have at least 1 provider
      const providers = registry.getProviderNames();
      expect(providers.length).toBeGreaterThan(0);
    });
    
    it('should handle errors when registering providers', () => {
      // Create a scenario that would cause an error (missing required settings)
      const settings = {
        ...defaultSettings,
        providerSettings: {
          [ProviderType.REQUESTY]: {
            // Missing apiKey will throw error, but won't crash
            endpoint: 'https://requesty-endpoint.com',
            model: 'requesty-model'
          }
        }
      };
      
      // This should execute without throwing but with logging errors
      // At least some provider should get registered (likely Ollama which doesn't need an API key)
      const registry = createProviderRegistry(settings);
      expect(registry).toBeDefined();
      
      // The registry should contain at least one provider name
      const providerNames = registry.getProviderNames();
      expect(providerNames.length).toBeGreaterThanOrEqual(1);
    });
  });
});