// filepath: /Users/karl/Documents/dev/obsidian-importer/src/services/OllamaProvider.ts
import { requestUrl } from "obsidian";
import { LLMOptions, LLMProvider, ModelInfo, DEFAULT_SYSTEM_PROMPT, DEFAULT_TEMPERATURE, DEFAULT_TIMEOUT_MS } from "./LLMProvider";
import { getLogger } from "../utils/importerLogger";

/**
 * OllamaProvider implements the LLMProvider interface for Ollama local LLM hosting.
 * This doesn't extend BaseOpenAIProvider as Ollama's API format is different.
 */
export class OllamaProvider implements LLMProvider {
  private endpoint: string;
  private modelId: string;
  private timeoutMs: number;
  private temperature: number;
  private systemPrompt: string;
  private logger = getLogger();

  /**
   * @param options Configuration options for Ollama provider
   */
  constructor(
    options?: {
      endpoint?: string;
      modelId?: string;
      timeoutMs?: number;
      temperature?: number;
      systemPrompt?: string;
    }
  ) {
    this.endpoint = options?.endpoint ?? "http://localhost:11434";
    this.modelId = options?.modelId ?? "llama2";
    this.timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.temperature = options?.temperature ?? DEFAULT_TEMPERATURE;
    this.systemPrompt = options?.systemPrompt ?? DEFAULT_SYSTEM_PROMPT;
    
    // Log provider creation with debug level
    this.logger.debugLog(
      `Creating OllamaProvider with endpoint=${this.endpoint}, model=${this.modelId}`
    );
  }

  /**
   * Get the provider name
   */
  getName(): string {
    return "ollama"; // Use lowercase to match registry lookup
  }

  /**
   * Get the default endpoint URL
   */
  getDefaultEndpoint(): string {
    return "http://localhost:11434";
  }

  /**
   * Get available models for this provider
   */
  async getAvailableModels(): Promise<ModelInfo[]> {
    this.logger.debugLog(`Fetching available models from Ollama API at ${this.endpoint}`);
    
    try {
      // Log the request details
      this.logger.debugLog(`Sending GET request to ${this.endpoint}/api/tags`);
      
      const response = await requestUrl({
        url: `${this.endpoint}/api/tags`,
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        throw: false // Don't throw on error status codes
      });
      
      this.logger.debugLog(`Ollama API response status: ${response.status}`);
      this.logger.debugLog(`Ollama API response body: ${response.text.substring(0, 200)}...`);
      
      if (response.status !== 200) {
        this.logger.error(`Ollama API returned status ${response.status}`);
        throw new Error(`Failed to fetch models: ${response.status}`);
      }
      
      const data = response.json;
      
      if (!data.models || !Array.isArray(data.models)) {
        this.logger.error(`Invalid response format from Ollama API: ${JSON.stringify(data)}`);
        throw new Error("Invalid response format from Ollama API");
      }
      
      // Log the models found
      this.logger.debugLog(`Found ${data.models.length} models from Ollama: ${data.models.map((m: any) => m.name).join(', ')}`);
      
      // Transform to ModelInfo format
      return data.models.map((model: any) => ({
        id: model.name,
        name: model.name,
        contextLength: model.parameters?.context_length || 4096
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error fetching Ollama models: ${errorMessage}`);
      
      // Return a default set of models if the API call fails
      return [
        { id: "llama2", name: "Llama 2", contextLength: 4096 },
        { id: "mistral", name: "Mistral", contextLength: 8192 },
        { id: "phi3", name: "Phi-3", contextLength: 4096 },
        { id: "orca-mini", name: "Orca Mini", contextLength: 4096 }
      ];
    }
  }

  /**
   * Custom implementation for calling Ollama's API
   */
  async callLLM(prompt: string, options?: LLMOptions): Promise<string> {
    this.logger.debugLog(`OllamaProvider.callLLM called with model=${options?.model || this.modelId}`);
    
    const endpoint = options?.endpoint || this.endpoint;
    const model = options?.model || this.modelId;
    const temperature = options?.temperature ?? this.temperature;
    const timeoutMs = options?.timeoutMs ?? this.timeoutMs;
    
    try {
      // Create system message if provided
      const systemPrompt = options?.systemPrompt || this.systemPrompt;
      let fullPrompt = prompt;
      
      if (systemPrompt) {
        fullPrompt = `${systemPrompt}\n\n${prompt}`;
      }
      
      // Log detailed request information
      const requestBody = JSON.stringify({
        model,
        prompt: fullPrompt,
        stream: false,
        temperature
      });
      
      this.logger.debugLog(`Sending POST request to ${endpoint}/api/generate with body: ${requestBody.substring(0, 200)}...`);
      
      // Set up the request with a timeout
      const timeoutController = new AbortController();
      const timeoutId = setTimeout(() => timeoutController.abort(), timeoutMs);
      
      const response = await requestUrl({
        url: `${endpoint}/api/generate`,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: requestBody,
        throw: false // Don't throw on error status codes
      });
      
      clearTimeout(timeoutId);
      
      // Log response details
      this.logger.debugLog(`Ollama API response status: ${response.status}`);
      
      if (response.status !== 200) {
        // Log the error response body
        this.logger.error(`Ollama request failed with status ${response.status}: ${response.text}`);
        throw new Error(`Ollama request failed: ${response.status}`);
      }
      
      const data = response.json;
      this.logger.debugLog(`Ollama API response data: ${JSON.stringify(data).substring(0, 200)}...`);
      
      if (!data || typeof data.response !== 'string') {
        this.logger.error(`Invalid response format from Ollama API: ${JSON.stringify(data)}`);
        throw new Error("Invalid response format from Ollama API");
      }
      
      return data.response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error calling Ollama API: ${errorMessage}`);
      throw new Error(`Failed to call Ollama API: ${errorMessage}`);
    }
  }

  /**
   * Validate the connection to the Ollama service
   */
  async validateConnection(): Promise<boolean> {
    try {
      this.logger.debugLog(`Validating Ollama connection to ${this.endpoint}`);
      
      // Try both /api/version and /api/tags endpoints for more thorough validation
      // First check version endpoint
      this.logger.debugLog(`Testing Ollama connection with GET request to ${this.endpoint}/api/version`);
      const versionResponse = await requestUrl({
        url: `${this.endpoint}/api/version`,
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        throw: false // Don't throw on error status codes
      });
      
      this.logger.debugLog(`Ollama version endpoint returned status: ${versionResponse.status}`);
      if (versionResponse.status === 200) {
        this.logger.debugLog(`Ollama version: ${versionResponse.text}`);
        
        // Now try listing models as a more comprehensive test
        this.logger.debugLog(`Testing Ollama models endpoint at ${this.endpoint}/api/tags`);
        const tagsResponse = await requestUrl({
          url: `${this.endpoint}/api/tags`,
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          throw: false
        });
        
        this.logger.debugLog(`Ollama models endpoint returned status: ${tagsResponse.status}`);
        
        if (tagsResponse.status === 200) {
          try {
            const models = tagsResponse.json.models;
            if (models && Array.isArray(models)) {
              this.logger.debugLog(`Found ${models.length} models in Ollama`);
              
              // Check if the selected model exists
              const modelExists = models.some((m: any) => m.name === this.modelId);
              if (!modelExists) {
                this.logger.warn(`Selected model "${this.modelId}" not found in available models. Available models: ${models.map((m: any) => m.name).join(', ')}`);
                // Still return true as connection is valid, even if model is not found
              }
            }
          } catch (parseError) {
            this.logger.warn(`Could not parse Ollama models response: ${parseError}`);
            // Still count as success if we got a 200 response
          }
          
          return true;
        } else {
          this.logger.error(`Ollama models endpoint failed with status: ${tagsResponse.status}`);
        }
      }
      
      // Fixed error - removed reference to tagsResponse which might be undefined here
      this.logger.error(`Ollama connection failed - version endpoint status: ${versionResponse.status}`);
      return false;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Ollama connection validation failed: ${errorMessage}`);
      return false;
    }
  }

  /**
   * Ollama does not require an API key
   * This explicitly indicates to the settings UI that the API key field should be hidden
   */
  requiresApiKey(): boolean {
    return false;
  }

  /**
   * Ollama requires an endpoint (default is localhost)
   */
  requiresEndpoint(): boolean {
    return true;
  }
}