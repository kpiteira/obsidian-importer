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
  
  // For Slice 1.1, we'll simply use the top-level settings
  // The provider-specific settings UI will be implemented in Slice 1.2
  logger.debugLog("Creating LLM provider with global settings", {
    endpoint: settings.llmEndpoint,
    model: settings.model,
    apiKey: maskApiKey(settings.apiKey)
  });
  
  // Create Requesty provider with top-level settings
  const requestyProvider = new RequestyProvider(
    settings.apiKey,
    {
      endpoint: settings.llmEndpoint,
      modelId: settings.model,
      timeoutMs: 60000
    }
  );
  
  return requestyProvider;
}

/**
 * Create a provider registry with all available providers
 * @param settings Plugin settings
 * @returns LLMProviderRegistry with all providers registered
 */
export function createProviderRegistry(settings: PluginSettings): LLMProviderRegistry {
  const logger = getLogger();
  const registry = new LLMProviderRegistry();
  
  // Register Requesty provider using top-level settings
  const requestyProvider = new RequestyProvider(
    settings.apiKey,
    {
      endpoint: settings.llmEndpoint,
      modelId: settings.model,
      timeoutMs: 60000
    }
  );
  
  registry.register(requestyProvider);
  logger.debugLog("Registered provider in registry", { name: requestyProvider.getName() });
  
  // Other providers will be registered in future slices
  
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