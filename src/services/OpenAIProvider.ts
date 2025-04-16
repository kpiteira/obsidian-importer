// filepath: /Users/karl/Documents/dev/obsidian-importer/src/services/OpenAIProvider.ts
import { requestUrl } from "obsidian";
import { BaseOpenAIProvider } from "./BaseOpenAIProvider";
import { ModelInfo } from "./LLMProvider";
import { SecureApiKey } from "../utils/apiKeyUtils";
import { getLogger } from "../utils/importerLogger";

/**
 * Utility function to estimate context window for OpenAI models
 */
function getContextWindowForModel(modelId: string): number {
  if (modelId.includes('gpt-4-turbo') || modelId.includes('gpt-4-0125')) {
    return 128000;
  } else if (modelId.includes('gpt-4-32k')) {
    return 32768;
  } else if (modelId.includes('gpt-4')) {
    return 8192;
  } else if (modelId.includes('gpt-3.5-turbo-16k')) {
    return 16384;
  } else if (modelId.includes('gpt-3.5-turbo')) {
    return 4096;
  }
  return 4096; // default for unknown models
}

/**
 * OpenAIProvider implements the LLMProvider interface for OpenAI's API.
 * Extends BaseOpenAIProvider for OpenAI-compatible API handling.
 */
export class OpenAIProvider extends BaseOpenAIProvider {
  private static readonly DEFAULT_ENDPOINT = "https://api.openai.com/v1";
  private static readonly DEFAULT_MODEL = "gpt-3.5-turbo";
  protected override logger = getLogger();

  /**
   * @param apiKey API key for OpenAI
   * @param options Additional options (endpoint, model, etc.)
   */
  constructor(
    apiKey: string,
    options?: {
      endpoint?: string;
      modelId?: string;
      timeoutMs?: number;
      temperature?: number;
      systemPrompt?: string;
    }
  ) {
    // Create a secure API key for the parent class
    const secureKey = new SecureApiKey(apiKey);
    
    const endpoint = options?.endpoint ?? OpenAIProvider.DEFAULT_ENDPOINT;
    const modelId = options?.modelId ?? OpenAIProvider.DEFAULT_MODEL;
    
    // Log provider creation with debug level
    getLogger().debugLog(
      `Creating OpenAIProvider with endpoint=${endpoint}, model=${modelId}`
    );
    
    super(
      secureKey.getValue(),
      endpoint,
      modelId,
      {
        timeoutMs: options?.timeoutMs,
        temperature: options?.temperature,
        systemPrompt: options?.systemPrompt
      }
    );
  }

  /**
   * Get the provider name
   */
  getName(): string {
    return "OpenAI";
  }

  /**
   * Get the default endpoint URL
   */
  getDefaultEndpoint(): string {
    return OpenAIProvider.DEFAULT_ENDPOINT;
  }

  /**
   * Get available models for this provider
   */
  async getAvailableModels(): Promise<ModelInfo[]> {
    this.logger.debugLog(`Fetching available models from OpenAI API`);
    
    try {
      const response = await requestUrl({
        url: `${this.endpoint}/models`,
        method: "GET",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
      });
      
      if (response.status !== 200) {
        throw new Error(`Failed to fetch models: ${response.status}`);
      }
      
      const data = response.json;
      
      // Filter for GPT models and transform to ModelInfo format
      return data.data
        .filter((model: any) => {
          const modelId = model.id.toLowerCase();
          return modelId.includes('gpt') && !modelId.includes('instruct');
        })
        .map((model: any) => ({
          id: model.id,
          name: model.id,
          contextLength: getContextWindowForModel(model.id)
        }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error fetching OpenAI models: ${errorMessage}`);
      
      // Return a default set of models if the API call fails
      return [
        { id: "gpt-4-turbo", name: "GPT-4 Turbo", contextLength: 128000 },
        { id: "gpt-4", name: "GPT-4", contextLength: 8192 },
        { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo", contextLength: 4096 }
      ];
    }
  }

  /**
   * Override validateConnection to correctly check API connectivity
   * Unlike the default implementation, we need to check the actual API response
   * since getAvailableModels returns a fallback list even when the API call fails
   */
  async validateConnection(): Promise<boolean> {
    try {
      // Instead of calling getAvailableModels which has fallbacks,
      // directly attempt to access the API
      const response = await requestUrl({
        url: `${this.endpoint}/models`,
        method: "GET",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
      });
      
      return response.status === 200;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`OpenAI connection validation failed: ${errorMessage}`);
      return false;
    }
  }
}