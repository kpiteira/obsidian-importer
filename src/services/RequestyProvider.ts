import { BaseOpenAIProvider } from "./BaseOpenAIProvider";
import { ModelInfo } from "./LLMProvider";
import { SecureApiKey } from "../utils/apiKeyUtils";
import { getLogger } from "../utils/importerLogger";

/**
 * RequestyProvider implements the LLMProvider interface for the Requesty API.
 * Extends BaseOpenAIProvider for OpenAI-compatible API handling.
 */
export class RequestyProvider extends BaseOpenAIProvider {
  // Update the default endpoint to match what's in the settings
  private static readonly DEFAULT_ENDPOINT = "https://router.requesty.ai/v1/chat/completions";
  private static readonly DEFAULT_MODEL = "google/gemini-2.0-flash-exp";
  // Make logger protected to match the parent class
  protected override logger = getLogger();

  /**
   * Available models for Requesty
   */
  private static readonly AVAILABLE_MODELS: ModelInfo[] = [
    { id: "google/gemini-2.0-flash-exp", name: "Gemini 2.0 Flash Exp" },
    { id: "gpt-4-turbo", name: "GPT-4 Turbo" },
    { id: "gpt-4", name: "GPT-4" },
    { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo" }
  ];

  /**
   * @param apiKey API key for Requesty
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
    
    const endpoint = options?.endpoint ?? RequestyProvider.DEFAULT_ENDPOINT;
    const modelId = options?.modelId ?? RequestyProvider.DEFAULT_MODEL;
    
    // Log provider creation with debug level
    getLogger().debugLog(
      `Creating RequestyProvider with endpoint=${endpoint}, model=${modelId}`
    );
    
    super(
      secureKey.getValue(), // Extract the actual API key for authentication
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
    return "Requesty";
  }

  /**
   * Get the default endpoint URL
   */
  getDefaultEndpoint(): string {
    return RequestyProvider.DEFAULT_ENDPOINT;
  }

  /**
   * Get available models for this provider
   */
  async getAvailableModels(): Promise<ModelInfo[]> {
    // Requesty doesn't have an API to list models, so we return a predefined list
    return RequestyProvider.AVAILABLE_MODELS;
  }
  
  /**
   * Override callLLM to add provider-specific handling if needed
   */
  async callLLM(prompt: string, options?: any): Promise<string> {
    this.logger.debugLog(
      `RequestyProvider.callLLM called with model=${this.modelId}`
    );
    return super.callLLM(prompt, options);
  }
}