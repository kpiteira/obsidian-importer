import { App } from 'obsidian';
import { ImportPipelineOrchestrator } from './ImportPipelineOrchestrator';
import { PluginSettings, ProviderSettings } from '../utils/settings';
import { getLogger } from '../utils/importerLogger';
import { NoteWriter } from '../utils/noteWriter';
import { LLMProvider, ProviderType } from '../services/LLMProvider';
import { LLMProviderRegistry } from '../services/LLMProviderRegistry';
import { RequestyProvider } from '../services/RequestyProvider';
import { OpenAIProvider } from '../services/OpenAIProvider';
import { OpenRouterProvider } from '../services/OpenRouterProvider';
import { OllamaProvider } from '../services/OllamaProvider';
import { maskApiKey } from '../utils/apiKeyUtils';
import { ContentTypeRegistry } from '../handlers/ContentTypeRegistry';
import { YouTubeHandler } from '../handlers/YouTubeHandler';
import { MediumHandler } from '../handlers/MediumHandler';
import { GoodreadsHandler } from '../handlers/GoodreadsHandler';
import { RecipeHandler } from '../handlers/RecipeHandler';
import { RestaurantHandler } from '../handlers/RestaurantHandler';
import { MovieHandler } from '../handlers/MovieHandler';

/**
 * Create an LLM provider based on the current plugin settings
 * @param settings Plugin settings containing provider configuration
 * @returns The configured LLM provider
 */
export function createLLMProvider(settings: PluginSettings): LLMProvider {
  const logger = getLogger();
  // Handle possible undefined or empty provider
  const selectedProvider = settings.selectedProvider || ProviderType.REQUESTY;
  
  logger.debugLog(`Creating LLM provider: ${selectedProvider}`);
  
  // Get provider-specific settings or fall back to legacy settings
  const providerSettings = settings.providerSettings[selectedProvider] || {
    apiKey: settings.apiKey,
    endpoint: settings.llmEndpoint,
    model: settings.model
  };
  
  logger.debugLog("Provider settings", {
    providerType: selectedProvider,
    endpoint: providerSettings.endpoint,
    model: providerSettings.model,
    apiKey: providerSettings.apiKey ? "****" : "not set"
  });
  
  // Create the appropriate provider based on the selected type
  try {
    switch(selectedProvider) {
      case ProviderType.REQUESTY:
        return new RequestyProvider(
          providerSettings.apiKey || "",
          {
            endpoint: providerSettings.endpoint,
            modelId: providerSettings.model,
            timeoutMs: providerSettings.timeoutMs || 60000
          }
        );
        
      case ProviderType.OPENAI:
        return new OpenAIProvider(
          providerSettings.apiKey || "",
          {
            endpoint: providerSettings.endpoint,
            modelId: providerSettings.model,
            timeoutMs: providerSettings.timeoutMs || 60000
          }
        );
        
      case ProviderType.OPENROUTER:
        return new OpenRouterProvider(
          providerSettings.apiKey || "",
          {
            endpoint: providerSettings.endpoint,
            modelId: providerSettings.model,
            timeoutMs: providerSettings.timeoutMs || 60000
          }
        );
        
      case ProviderType.LOCAL:
        return new OllamaProvider(
          {
            endpoint: providerSettings.endpoint || "http://localhost:11434",
            modelId: providerSettings.model,
            timeoutMs: providerSettings.timeoutMs || 60000
          }
        );
        
      // Fall back to RequestyProvider if selected provider is not recognized
      default:
        logger.warn(`Provider type ${selectedProvider} not recognized, using Requesty as fallback`);
        return new RequestyProvider(
          providerSettings.apiKey || "",
          {
            endpoint: providerSettings.endpoint,
            modelId: providerSettings.model,
            timeoutMs: providerSettings.timeoutMs || 60000
          }
        );
    }
  } catch (error) {
    logger.error(`Error creating provider ${selectedProvider}:`, error);
    // Fall back to a basic Requesty provider if there's an error
    return new RequestyProvider("", { 
      modelId: "gpt-3.5-turbo"
    });
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
  
  logger.debugLog("Creating provider registry");
  
  // Always register a Requesty provider as fallback
  try {
    // Get provider-specific settings or fall back to legacy settings
    const requestySettings = settings.providerSettings[ProviderType.REQUESTY] || {
      apiKey: settings.apiKey,
      endpoint: settings.llmEndpoint,
      model: settings.model
    };
    
    registry.register(new RequestyProvider(
      requestySettings.apiKey || "",
      {
        endpoint: requestySettings.endpoint,
        modelId: requestySettings.model,
        timeoutMs: requestySettings.timeoutMs || 60000
      }
    ));
    logger.debugLog("Registered RequestyProvider");
  } catch (error) {
    logger.error("Failed to register RequestyProvider", error);
  }
  
  // Try to register OpenAI provider 
  try {
    // Use type assertion to help TypeScript recognize the properties
    const openaiSettings = settings.providerSettings[ProviderType.OPENAI] || {} as ProviderSettings;
    
    if (openaiSettings.apiKey) {
      registry.register(new OpenAIProvider(
        openaiSettings.apiKey,
        {
          endpoint: openaiSettings.endpoint,
          modelId: openaiSettings.model,
          timeoutMs: openaiSettings.timeoutMs || 60000
        }
      ));
      logger.debugLog("Registered OpenAIProvider");
    }
  } catch (error) {
    logger.error("Failed to register OpenAIProvider", error);
  }
  
  // Try to register OpenRouter provider
  try {
    // Use type assertion to help TypeScript recognize the properties
    const openRouterSettings = settings.providerSettings[ProviderType.OPENROUTER] || {} as ProviderSettings;
    
    if (openRouterSettings.apiKey) {
      registry.register(new OpenRouterProvider(
        openRouterSettings.apiKey,
        {
          endpoint: openRouterSettings.endpoint,
          modelId: openRouterSettings.model,
          timeoutMs: openRouterSettings.timeoutMs || 60000
        }
      ));
      logger.debugLog("Registered OpenRouterProvider");
    }
  } catch (error) {
    logger.error("Failed to register OpenRouterProvider", error);
  }
  
  // Try to register Ollama provider (no API key required)
  try {
    // Use type assertion to help TypeScript recognize the properties
    const ollamaSettings = settings.providerSettings[ProviderType.LOCAL] || {} as ProviderSettings;
    
    registry.register(new OllamaProvider(
      {
        endpoint: ollamaSettings.endpoint || "http://localhost:11434",
        modelId: ollamaSettings.model || "llama2",
        timeoutMs: ollamaSettings.timeoutMs || 60000
      }
    ));
    logger.debugLog("Registered OllamaProvider");
  } catch (error) {
    logger.error("Failed to register OllamaProvider", error);
  }
  
  const registeredProviders = registry.getProviderNames();
  logger.debugLog("Providers registered in registry", { 
    count: registeredProviders.length,
    providers: registeredProviders
  });
  
  return registry;
}

/**
 * Create an ImportPipelineOrchestrator with the configured dependencies
 * @param app Obsidian App instance
 * @param settings Plugin settings
 * @param logger Logger instance
 * @param providerRegistry Optional provider registry
 * @param contentTypeRegistry Optional content type registry
 * @returns Configured ImportPipelineOrchestrator
 */
export async function createImportPipelineOrchestrator(
  app: App,
  settings: PluginSettings,
  logger: ReturnType<typeof getLogger>,
  providerRegistry?: LLMProviderRegistry,
  contentTypeRegistry?: ContentTypeRegistry
) {
  let llmProvider: LLMProvider;
  
  // Use the registry if provided, otherwise create a provider directly
  if (providerRegistry) {
    try {
      llmProvider = providerRegistry.getProvider(settings.selectedProvider);
      logger.debugLog(`Using provider ${settings.selectedProvider} from registry`);
    } catch (error) {
      logger.warn(`Could not get provider ${settings.selectedProvider} from registry, creating directly`, error);
      llmProvider = createLLMProvider(settings);
    }
  } else {
    llmProvider = createLLMProvider(settings);
  }
  
  // Create note writer
  const noteWriter = new NoteWriter(app);
  
  // Create orchestrator with dependencies
  return new ImportPipelineOrchestrator({
    settings,
    llmProvider,
    noteWriter,
    logger,
    contentTypeRegistry
  });
}

/**
 * Create and initialize a ContentTypeRegistry with all available handlers
 * @param llmProvider Optional LLM provider for content-based detection
 * @returns ContentTypeRegistry with registered handlers
 */
export function createContentTypeRegistry(llmProvider?: LLMProvider): ContentTypeRegistry {
  const logger = getLogger();
  const registry = new ContentTypeRegistry(llmProvider);
  
  logger.debugLog("Creating content type registry");
  
  // Register YouTube handler
  try {
    registry.register(new YouTubeHandler());
    logger.debugLog("Registered YouTubeHandler");
  } catch (error) {
    logger.error("Failed to register YouTubeHandler", error);
  }
  
  // Register Medium handler
  try {
    registry.register(new MediumHandler());
    logger.debugLog("Registered MediumHandler");
  } catch (error) {
    logger.error("Failed to register MediumHandler", error);
  }
  
  // Register Goodreads handler
  try {
    registry.register(new GoodreadsHandler());
    logger.debugLog("Registered GoodreadsHandler");
  } catch (error) {
    logger.error("Failed to register GoodreadsHandler", error);
  }
  
  // Register Recipe handler
  try {
    registry.register(new RecipeHandler());
    logger.debugLog("Registered RecipeHandler");
  } catch (error) {
    logger.error("Failed to register RecipeHandler", error);
  }
  
  // Register Restaurant handler
  try {
    registry.register(new RestaurantHandler());
    logger.debugLog("Registered RestaurantHandler");
  } catch (error) {
    logger.error("Failed to register RestaurantHandler", error);
  }
  
  // Register Movie handler
  try {
    registry.register(new MovieHandler());
    logger.debugLog("Registered MovieHandler");
  } catch (error) {
    logger.error("Failed to register MovieHandler", error);
  }
  
  logger.debugLog("Content type registry initialization complete", { 
    handlerCount: registry.getHandlers().length,
    handlerTypes: registry.getHandlers().map(h => h.type)
  });
  
  return registry;
}