import { ProviderType } from "../services/LLMProvider";

export interface ProviderSettings {
  apiKey: string;
  endpoint?: string;
  model: string;
}

export interface PluginSettings {
  // LLM Provider settings (for future slices)
  selectedProvider: ProviderType;
  providerSettings: {
    [key in ProviderType]?: ProviderSettings;
  };
  
  // Primary settings used for Slice 1.1
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
    }
  },
  
  // Primary settings for Slice 1.1
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
  
  // For Slice 1.1, simply merge with defaults
  return { ...DEFAULT_SETTINGS, ...loaded };
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