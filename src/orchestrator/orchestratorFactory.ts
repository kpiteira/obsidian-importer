import { App } from 'obsidian';
import { ImportPipelineOrchestrator } from './ImportPipelineOrchestrator';
import { PluginSettings, ProviderSettings } from '../utils/settings';
import { getLogger } from '../utils/importerLogger';
import { NoteWriter } from '../utils/noteWriter';
import { LLMProvider, ProviderType } from '../services/LLMProvider';
import { LLMProviderRegistry } from '../services/LLMProviderRegistry';
import { RequestyProvider } from '../services/RequestyProvider';
import { maskApiKey } from '../utils/apiKeyUtils';

/**
 * Create an LLM provider based on the current plugin settings
 * @param settings Plugin settings containing provider configuration
 * @returns The configured LLM provider
 */
export function createLLMProvider(settings: PluginSettings): LLMProvider {
  const logger = getLogger();
  const selectedProvider = settings.selectedProvider;
  
  // Get provider-specific settings or fall back to legacy settings
  const providerSettings = settings.providerSettings[selectedProvider] || {
    apiKey: settings.apiKey,
    endpoint: settings.llmEndpoint,
    model: settings.model
  };
  
  logger.debugLog("Creating LLM provider", {
    providerType: selectedProvider,
    endpoint: providerSettings.endpoint,
    model: providerSettings.model,
    apiKey: maskApiKey(providerSettings.apiKey)
  });
  
  // Create the appropriate provider based on the selected type
  switch(selectedProvider) {
    case ProviderType.REQUESTY:
      return new RequestyProvider(
        providerSettings.apiKey,
        {
          endpoint: providerSettings.endpoint,
          modelId: providerSettings.model,
          timeoutMs: providerSettings.timeoutMs || 60000
        }
      );
      
    // Additional provider types will be added in future slices
    // For now, default to Requesty for other types
    default:
      logger.warn(`Provider type ${selectedProvider} not fully implemented yet, using Requesty`);
      return new RequestyProvider(
        providerSettings.apiKey,
        {
          endpoint: providerSettings.endpoint,
          modelId: providerSettings.model,
          timeoutMs: providerSettings.timeoutMs || 60000
        }
      );
  }
}

/**
 * Create a provider registry with all available providers
 * @param settings Plugin settings
 * @returns LLMProviderRegistry with all providers registered
 */
export function createProviderRegistry(settings: PluginSettings): LLMProviderRegistry {
  const logger = getLogger();
  const registry = new LLMProviderRegistry();
  
  // Register all supported providers
  Object.values(ProviderType).forEach(providerType => {
    try {
      // Get provider-specific settings
      const providerSettings = settings.providerSettings[providerType] || {
        apiKey: settings.apiKey,
        endpoint: settings.llmEndpoint,
        model: settings.model
      };
      
      // Check for required settings before attempting registration
      switch(providerType) {
        case ProviderType.REQUESTY: 
          if (!providerSettings.apiKey) {
            logger.error(`Failed to register provider ${providerType}: Missing API key`);
            return; // Skip registration for this provider
          }
          registry.register(new RequestyProvider(
            providerSettings.apiKey,
            {
              endpoint: providerSettings.endpoint,
              modelId: providerSettings.model,
              timeoutMs: providerSettings.timeoutMs || 60000
            }
          ));
          break;
          
        // Additional provider types will be added in future slices
        // For now, we only register Requesty
        // Other providers will be registered when they're implemented
      }
    } catch (error) {
      logger.error(`Failed to register provider ${providerType}`, error);
      // Don't rethrow - just log and continue with other providers
    }
  });
  
  logger.debugLog("Registered providers in registry", { 
    count: registry.getProviderNames().length,
    providers: registry.getProviderNames()
  });
  
  return registry;
}

/**
 * Create an ImportPipelineOrchestrator with the configured dependencies
 * @param app Obsidian App instance
 * @param settings Plugin settings
 * @param logger Logger instance
 * @returns Configured ImportPipelineOrchestrator
 */
export async function createImportPipelineOrchestrator(
  app: App,
  settings: PluginSettings,
  logger: ReturnType<typeof getLogger>
) {
  // Create LLM provider based on settings
  const llmProvider = createLLMProvider(settings);
  
  // Create note writer
  const noteWriter = new NoteWriter(app);
  
  // Create orchestrator with dependencies
  return new ImportPipelineOrchestrator({
    settings,
    llmProvider,
    noteWriter,
    logger
  });
}