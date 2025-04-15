import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LLMProvider, ProviderType } from '../../src/services/LLMProvider';
import { LLMProviderRegistry } from '../../src/services/LLMProviderRegistry';
import { createLLMProvider, createProviderRegistry } from '../../src/orchestrator/orchestratorFactory';
import { PluginSettings } from '../../src/utils/settings';

// Need to mock the RequestyProvider since it's the only one implemented
vi.mock('../../src/services/RequestyProvider', () => {
  return {
    RequestyProvider: vi.fn().mockImplementation((apiKey, options) => {
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
      
      // Since we default to Requesty for any provider in the implementation,
      // verify that it's using the proper provider settings
      expect(provider).toBeDefined();
      expect(provider.apiKey).toBe('requesty-key');
      expect(provider.options.endpoint).toBe('https://requesty-endpoint.com');
      expect(provider.options.modelId).toBe('requesty-model');
    });
    
    it('should use provider-specific settings when available', () => {
      // Set up with OpenAI as selected provider 
      const settings = {
        ...defaultSettings,
        selectedProvider: ProviderType.OPENAI
      };
      
      const provider = createLLMProvider(settings);
      
      // It should still use Requesty (as that's all we have implemented),
      // but with OpenAI settings
      expect(provider).toBeDefined();
      expect(provider.apiKey).toBe('openai-key');
      expect(provider.options.endpoint).toBe('https://api.openai.com/v1');
      expect(provider.options.modelId).toBe('gpt-4');
    });
    
    it('should fall back to legacy settings if provider settings not available', () => {
      // Set up with a provider that has no specific settings
      const settings = {
        ...defaultSettings,
        selectedProvider: ProviderType.LOCAL,
        providerSettings: {
          // Only Requesty has settings
          [ProviderType.REQUESTY]: {
            apiKey: 'requesty-key',
            endpoint: 'https://requesty-endpoint.com',
            model: 'requesty-model'
          }
        }
      };
      
      const provider = createLLMProvider(settings);
      
      expect(provider).toBeDefined();
      expect(provider.apiKey).toBe('legacy-key');
      expect(provider.options.endpoint).toBe('legacy-endpoint');
      expect(provider.options.modelId).toBe('legacy-model');
    });
  });
  
  describe('createProviderRegistry', () => {
    it('should register providers in registry', () => {
      const registry = createProviderRegistry(defaultSettings);
      
      // Currently only Requesty is registered
      expect(registry.getProviderNames()).toContain('requesty');
      expect(registry.getProviderNames().length).toBe(1);
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
      const registry = createProviderRegistry(settings);
      expect(registry.getProviderNames().length).toBe(0);
    });
  });
});