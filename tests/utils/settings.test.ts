import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PluginSettings, DEFAULT_SETTINGS, loadSettings, saveSettings } from '../../src/utils/settings';
import { ProviderType } from '../../src/services/LLMProvider';

describe('Settings', () => {
  let mockPlugin: { loadData: () => Promise<Partial<PluginSettings> | null>; saveData: (data: PluginSettings) => Promise<void> };
  let savedSettings: PluginSettings | null = null;
  
  beforeEach(() => {
    savedSettings = null;
    mockPlugin = {
      loadData: vi.fn().mockImplementation(async () => savedSettings),
      saveData: vi.fn().mockImplementation(async (data: PluginSettings) => {
        savedSettings = { ...data };
      })
    };
  });
  
  it('should load default settings when no settings exist', async () => {
    const settings = await loadSettings(mockPlugin);
    
    expect(settings).toEqual(DEFAULT_SETTINGS);
    expect(mockPlugin.loadData).toHaveBeenCalledTimes(1);
  });
  
  it('should merge loaded settings with defaults', async () => {
    // Set up partial settings
    savedSettings = {
      selectedProvider: ProviderType.OPENAI,
      apiKey: 'test-api-key',
      debug: true
    };
    
    const settings = await loadSettings(mockPlugin);
    
    expect(settings.selectedProvider).toEqual(ProviderType.OPENAI); // From saved
    expect(settings.apiKey).toEqual('test-api-key'); // From saved
    expect(settings.debug).toEqual(true); // From saved
    expect(settings.defaultFolder).toEqual(DEFAULT_SETTINGS.defaultFolder); // From default
  });
  
  it('should ensure provider settings exist for all providers', async () => {
    savedSettings = {
      selectedProvider: ProviderType.OPENAI,
      providerSettings: {
        [ProviderType.OPENAI]: {
          apiKey: 'openai-key',
          endpoint: 'custom-endpoint',
          model: 'custom-model'
        }
      }
    };
    
    const settings = await loadSettings(mockPlugin);
    
    // Should keep the custom OpenAI settings
    expect(settings.providerSettings[ProviderType.OPENAI]?.apiKey).toEqual('openai-key');
    
    // Should create default settings for other providers
    expect(settings.providerSettings[ProviderType.REQUESTY]).toBeDefined();
    expect(settings.providerSettings[ProviderType.OPENROUTER]).toBeDefined();
    expect(settings.providerSettings[ProviderType.LOCAL]).toBeDefined();
  });
  
  it('should migrate legacy settings to provider-specific settings', async () => {
    // Legacy settings with no provider-specific settings
    savedSettings = {
      selectedProvider: ProviderType.REQUESTY,
      apiKey: 'legacy-api-key',
      llmEndpoint: 'legacy-endpoint',
      model: 'legacy-model',
      providerSettings: {} // Empty provider settings
    };
    
    const settings = await loadSettings(mockPlugin);
    
    // Verify the legacy API key was migrated to provider-specific settings
    expect(settings.providerSettings[ProviderType.REQUESTY]?.apiKey).toEqual('legacy-api-key');
    
    // Verify provider-specific settings were created
    expect(settings.providerSettings[ProviderType.REQUESTY]).toBeDefined();
    expect(settings.providerSettings[ProviderType.REQUESTY]?.endpoint).toBeDefined();
    expect(settings.providerSettings[ProviderType.REQUESTY]?.model).toBeDefined();
  });
  
  it('should save settings correctly', async () => {
    const testSettings: PluginSettings = {
      ...DEFAULT_SETTINGS,
      selectedProvider: ProviderType.OPENAI,
      providerSettings: {
        ...DEFAULT_SETTINGS.providerSettings,
        [ProviderType.OPENAI]: {
          apiKey: 'test-openai-key',
          endpoint: 'https://test-endpoint.com',
          model: 'test-model'
        }
      }
    };
    
    await saveSettings(mockPlugin, testSettings);
    
    expect(mockPlugin.saveData).toHaveBeenCalledTimes(1);
    expect(mockPlugin.saveData).toHaveBeenCalledWith(testSettings);
    expect(savedSettings).toEqual(testSettings);
  });
});