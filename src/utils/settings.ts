import { ProviderType } from "../services/LLMProvider";

export interface ProviderSettings {
  apiKey: string;
  endpoint: string;
  model: string;
  timeoutMs?: number;
}

// Helper for our internal handling
export type PartialProviderSettings = {
  apiKey?: string;
  endpoint?: string;
  model?: string;
  timeoutMs?: number;
}

export interface PluginSettings {
  // LLM Provider settings
  selectedProvider: ProviderType;
  providerSettings: {
    [key in ProviderType]?: ProviderSettings;
  };
  
  // Legacy settings (kept for backward compatibility)
  apiKey: string;  
  llmEndpoint: string;
  model: string;
  
  // Other settings
  defaultFolder: string;
  debug: boolean;
}

export const DEFAULT_SETTINGS: PluginSettings = {
  // Default to Requesty provider
  selectedProvider: ProviderType.REQUESTY,
  providerSettings: {
    [ProviderType.REQUESTY]: {
      apiKey: "",
      endpoint: "https://router.requesty.ai/v1/chat/completions",
      model: "google/gemini-2.0-flash-exp",
      timeoutMs: 60000,
    },
    [ProviderType.OPENROUTER]: {
      apiKey: "",
      endpoint: "https://openrouter.ai/api/v1/chat/completions",
      model: "anthropic/claude-3-opus",
      timeoutMs: 60000,
    },
    [ProviderType.OPENAI]: {
      apiKey: "",
      endpoint: "https://api.openai.com/v1/chat/completions",
      model: "gpt-4o",
      timeoutMs: 60000,
    },
    [ProviderType.LOCAL]: {
      apiKey: "",
      endpoint: "http://localhost:11434/v1/chat/completions",
      model: "llama3",
      timeoutMs: 60000,
    },
  },
  
  // Legacy settings (kept for backward compatibility)
  apiKey: "",
  llmEndpoint: "https://router.requesty.ai/v1/chat/completions",
  model: "google/gemini-2.0-flash-exp",
  
  // Other settings
  defaultFolder: "Sources",
  debug: false,
};

/**
 * Loads plugin settings using Obsidian's data API, merging with DEFAULT_SETTINGS.
 * @param plugin The plugin instance (must implement loadData)
 */
export async function loadSettings(plugin: { loadData: () => Promise<Partial<PluginSettings> | null> }): Promise<PluginSettings> {
  const loaded = (await plugin.loadData()) || {};
  const mergedSettings = { ...DEFAULT_SETTINGS, ...loaded };
  
  // Ensure provider settings exists
  if (!mergedSettings.providerSettings) {
    mergedSettings.providerSettings = { ...DEFAULT_SETTINGS.providerSettings };
  }
  
  // For each provider, ensure defaults are set
  Object.values(ProviderType).forEach(providerType => {
    if (!mergedSettings.providerSettings[providerType]) {
      // Create a complete provider settings object from defaults
      mergedSettings.providerSettings[providerType] = { 
        ...DEFAULT_SETTINGS.providerSettings[providerType] as ProviderSettings
      };
    } else {
      // Merge with defaults for this provider to ensure all required fields exist
      const defaultSettings = DEFAULT_SETTINGS.providerSettings[providerType] as ProviderSettings;
      const currentSettings = mergedSettings.providerSettings[providerType] as PartialProviderSettings;
      
      mergedSettings.providerSettings[providerType] = {
        apiKey: currentSettings.apiKey ?? defaultSettings.apiKey,
        endpoint: currentSettings.endpoint ?? defaultSettings.endpoint,
        model: currentSettings.model ?? defaultSettings.model,
        timeoutMs: currentSettings.timeoutMs ?? defaultSettings.timeoutMs
      };
    }
  });
  
  // Backward compatibility: Copy top-level settings to selected provider if not set
  const selectedProvider = mergedSettings.selectedProvider;
  const providerSettings = mergedSettings.providerSettings[selectedProvider] as ProviderSettings | undefined;
  
  if (providerSettings) {
    // Only update if the provider settings exist
    if (mergedSettings.apiKey && !providerSettings.apiKey) {
      mergedSettings.providerSettings[selectedProvider] = {
        ...providerSettings,
        apiKey: mergedSettings.apiKey
      };
    }
    
    if (mergedSettings.llmEndpoint && !providerSettings.endpoint) {
      mergedSettings.providerSettings[selectedProvider] = {
        ...providerSettings,
        endpoint: mergedSettings.llmEndpoint
      };
    }
    
    if (mergedSettings.model && !providerSettings.model) {
      mergedSettings.providerSettings[selectedProvider] = {
        ...providerSettings,
        model: mergedSettings.model
      };
    }
  } else {
    // Create provider settings if they don't exist
    mergedSettings.providerSettings[selectedProvider] = {
      apiKey: mergedSettings.apiKey,
      endpoint: mergedSettings.llmEndpoint,
      model: mergedSettings.model,
      timeoutMs: 60000
    };
  }
  
  return mergedSettings;
}

/**
 * Saves plugin settings using Obsidian's data API.
 * @param plugin The plugin instance (must implement saveData)
 * @param settings The settings to save
 */
export async function saveSettings(
  plugin: { saveData: (data: PluginSettings) => Promise<void> },
  settings: PluginSettings
): Promise<void> {
  await plugin.saveData(settings);
}