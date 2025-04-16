// filepath: /Users/karl/Documents/dev/obsidian-importer/src/services/OpenRouterProvider.ts
import { requestUrl } from "obsidian";
import { BaseOpenAIProvider } from "./BaseOpenAIProvider";
import { LLMOptions, ModelInfo } from "./LLMProvider";
import { SecureApiKey } from "../utils/apiKeyUtils";
import { getLogger } from "../utils/importerLogger";

/**
 * OpenRouterProvider implements the LLMProvider interface for OpenRouter's API.
 * Extends BaseOpenAIProvider for OpenAI-compatible API handling with OpenRouter-specific customizations.
 */
export class OpenRouterProvider extends BaseOpenAIProvider {
  // Update the endpoint to match OpenRouter's v1 API exactly
  private static readonly DEFAULT_ENDPOINT = "https://openrouter.ai/api/v1";
  private static readonly DEFAULT_MODEL = "anthropic/claude-3-opus";
  protected override logger = getLogger();

  /**
   * @param apiKey API key for OpenRouter
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
    
    const endpoint = options?.endpoint ?? OpenRouterProvider.DEFAULT_ENDPOINT;
    const modelId = options?.modelId ?? OpenRouterProvider.DEFAULT_MODEL;
    
    // Log provider creation with debug level
    getLogger().debugLog(
      `Creating OpenRouterProvider with endpoint=${endpoint}, model=${modelId}`
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
    return "openrouter"; // Use lowercase to match the registry lookup
  }

  /**
   * Get the default endpoint URL
   */
  getDefaultEndpoint(): string {
    return OpenRouterProvider.DEFAULT_ENDPOINT;
  }

  /**
   * Get available models for this provider
   */
  async getAvailableModels(): Promise<ModelInfo[]> {
    this.logger.debugLog(`Fetching available models from OpenRouter API`);
    
    try {
      const response = await requestUrl({
        url: `${this.endpoint}/models`,
        method: "GET",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "HTTP-Referer": "https://obsidian.md/plugins",
          "X-Title": "Obsidian Importer"
        },
        throw: false // Don't throw on error status codes
      });
      
      if (response.status !== 200) {
        this.logger.error(`OpenRouter models API returned status ${response.status}`);
        throw new Error(`Failed to fetch models: ${response.status}`);
      }
      
      const data = response.json;
      
      // Transform to ModelInfo format
      return data.data.map((model: any) => ({
        id: model.id,
        name: model.name || model.id,
        contextLength: model.context_length || 4096
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error fetching OpenRouter models: ${errorMessage}`);
      
      // Return a default set of models if the API call fails
      return [
        { id: "anthropic/claude-3-opus", name: "Claude 3 Opus", contextLength: 100000 },
        { id: "anthropic/claude-3-sonnet", name: "Claude 3 Sonnet", contextLength: 100000 },
        { id: "anthropic/claude-3-haiku", name: "Claude 3 Haiku", contextLength: 48000 },
        { id: "openai/gpt-4-turbo", name: "GPT-4 Turbo", contextLength: 128000 },
        { id: "mistral/mistral-large", name: "Mistral Large", contextLength: 32000 },
        { id: "google/gemini-pro", name: "Gemini Pro", contextLength: 32000 }
      ];
    }
  }
  
  /**
   * Override callLLM to add OpenRouter-specific headers
   */
  async callLLM(prompt: string, options?: LLMOptions): Promise<string> {
    // Add OpenRouter-specific headers
    const customOptions = {
      ...options,
      headers: {
        "HTTP-Referer": "https://obsidian.md/plugins",
        "X-Title": "Obsidian Importer"
      }
    };
    
    return super.callLLM(prompt, customOptions);
  }

  /**
   * Override validateConnection to correctly check API connectivity
   */
  async validateConnection(): Promise<boolean> {
    try {
      this.logger.debugLog(`Validating OpenRouter connection to ${this.endpoint}`);
      
      // Make a lightweight ping request to verify connectivity instead of fetching models
      const response = await requestUrl({
        url: `${this.endpoint}/key`,  // Use the auth/key endpoint to validate the API key
        method: "GET",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "HTTP-Referer": "https://obsidian.md/plugins",
          "X-Title": "Obsidian Importer"
        },
        throw: false
      });
      
      if (response.status === 200) {
        this.logger.debugLog("OpenRouter connection successful");
        return true;
      }
      
      this.logger.error(`OpenRouter connection failed with status ${response.status}`);
      return false;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`OpenRouter connection validation failed: ${errorMessage}`);
      return false;
    }
  }
}