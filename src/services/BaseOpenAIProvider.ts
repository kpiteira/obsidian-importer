import { requestUrl, RequestUrlResponse } from "obsidian";
import { LLMProvider, LLMOptions, ModelInfo, DEFAULT_SYSTEM_PROMPT, DEFAULT_TIMEOUT_MS, DEFAULT_TEMPERATURE } from "./LLMProvider";
import { redactApiKey } from "../utils/redact";
import { retryWithExponentialBackoff, isTransientError } from "../utils/retryWithExponentialBackoff";
import { maskApiKey } from "../utils/apiKeyUtils";
import { getLogger } from "../utils/importerLogger";

/**
 * Base class for OpenAI-compatible API providers.
 * Implements common functionality for providers that follow the OpenAI API format.
 */
export abstract class BaseOpenAIProvider implements LLMProvider {
  protected apiKey: string;
  protected endpoint: string;
  protected modelId: string;
  protected timeoutMs: number;
  protected temperature: number;
  protected systemPrompt: string;
  protected logger = getLogger();

  /**
   * @param apiKey API key for the provider
   * @param endpoint API endpoint URL
   * @param modelId Default model ID to use
   * @param options Additional options
   */
  constructor(
    apiKey: string, 
    endpoint: string, 
    modelId: string,
    options?: {
      timeoutMs?: number;
      temperature?: number;
      systemPrompt?: string;
    }
  ) {
    this.apiKey = apiKey;
    this.endpoint = endpoint;
    this.modelId = modelId;
    this.timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.temperature = options?.temperature ?? DEFAULT_TEMPERATURE;
    this.systemPrompt = options?.systemPrompt ?? DEFAULT_SYSTEM_PROMPT;
  }

  /**
   * Abstract methods to be implemented by specific providers
   */
  abstract getName(): string;
  abstract getDefaultEndpoint(): string;
  abstract getAvailableModels(): Promise<ModelInfo[]>;

  /**
   * Default implementations that can be overridden by specific providers
   */
  requiresApiKey(): boolean {
    return true;
  }

  requiresEndpoint(): boolean {
    return true;
  }

  /**
   * Validates the connection to the LLM provider by attempting to retrieve models
   */
  async validateConnection(): Promise<boolean> {
    try {
      await this.getAvailableModels();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Shared implementation for calling OpenAI-compatible APIs
   */
  async callLLM(prompt: string, options?: LLMOptions): Promise<string> {
    this.logger.debugLog("LLM call initiated", {
      provider: this.getName(),
      model: options?.model || this.modelId,
      endpoint: options?.endpoint || this.endpoint,
      hasApiKey: !!this.apiKey
    });
    
    const endpoint = options?.endpoint || this.endpoint;
    const model = options?.model || this.modelId;
    const systemPrompt = options?.systemPrompt || this.systemPrompt;
    const temperature = options?.temperature ?? this.temperature;
    const timeoutMs = options?.timeoutMs || this.timeoutMs;
    
    // Define a properly typed request body
    interface RequestBody {
      model: string;
      messages: Array<{role: string; content: string}>;
      temperature: number;
      max_tokens?: number;
      [key: string]: any; // Allow string indexing
    }
    
    const body: RequestBody = {
      model,
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature,
      max_tokens: options?.maxTokens,
    };

    // Filter out undefined fields
    Object.keys(body).forEach(key => {
      if (body[key] === undefined) {
        delete body[key];
      }
    });

    const doApiCall = async (): Promise<string> => {
      try {
        // Ensure the endpoint correctly includes /chat/completions
        const apiEndpoint = endpoint.endsWith('/chat/completions') 
          ? endpoint 
          : `${endpoint}/chat/completions`;
          
        this.logger.debugLog(`Making API call to ${apiEndpoint} with model ${model}`);
        
        const responsePromise = requestUrl({
          url: apiEndpoint,
          method: "POST",
          headers: {
            "Authorization": `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
            ...(options?.headers || {}) // Include any additional headers from options
          },
          body: JSON.stringify(body),
          contentType: "application/json",
        });
        
        const timeoutPromise = new Promise<RequestUrlResponse>((_, reject) =>
          setTimeout(() => reject(new Error(`API request timed out after ${timeoutMs / 1000} seconds.`)), timeoutMs)
        );
        
        const response = await Promise.race([responsePromise, timeoutPromise]) as RequestUrlResponse;
        this.logger.debugLog(`API response status: ${response.status}`);
        
        if (response.status < 200 || response.status >= 300) {
          let errorMsg = `${this.getName()} API error: ${response.status}`;
          try {
            const errorData = response.json ? await response.json : JSON.parse(response.text);
            if (errorData && errorData.error && errorData.error.message) {
              errorMsg += ` - ${errorData.error.message}`;
            }
            this.logger.warn(`API error details: ${JSON.stringify(errorData)}`);
          } catch (parseError) {
            this.logger.warn(`Failed to parse error response: ${parseError}`);
          }
          throw new Error(redactApiKey(errorMsg, this.apiKey));
        }

        const data = response.json ? await response.json : JSON.parse(response.text);
        
        // Enhanced response parsing logic to handle different API formats
        let contentText: string | undefined;
        
        // Log the response structure to help debug
        this.logger.debugLog(`Response structure: ${JSON.stringify(Object.keys(data || {}))}`);
        
        // Check for OpenAI format
        if (data.choices && Array.isArray(data.choices) && data.choices.length > 0) {
          // Standard OpenAI format
          if (data.choices[0].message && typeof data.choices[0].message.content === "string") {
            contentText = data.choices[0].message.content;
          } 
          // Alternative format where content might be directly in the choice
          else if (typeof data.choices[0].content === "string") {
            contentText = data.choices[0].content;
          }
          // Handle text field that some APIs use
          else if (typeof data.choices[0].text === "string") {
            contentText = data.choices[0].text;
          }
        }
        // Gemini/Requesty format might use "candidates" instead of "choices"
        else if (data.candidates && Array.isArray(data.candidates) && data.candidates.length > 0) {
          if (data.candidates[0].content && data.candidates[0].content.parts) {
            const parts = data.candidates[0].content.parts;
            if (Array.isArray(parts) && parts.length > 0 && typeof parts[0].text === "string") {
              contentText = parts[0].text;
            } else if (Array.isArray(parts) && parts.length > 0 && typeof parts[0] === "string") {
              contentText = parts[0];
            }
          } else if (typeof data.candidates[0].text === "string") {
            contentText = data.candidates[0].text;
          }
        }
        // Direct content field at top level (some simplified APIs)
        else if (data.content && typeof data.content === "string") {
          contentText = data.content;
        }
        // Any other text field that might contain the response
        else if (data.text && typeof data.text === "string") {
          contentText = data.text;
        }
        // Response might be formatted as a raw string
        else if (typeof data === "string") {
          contentText = data;
        }
        
        if (!contentText) {
          // Log the actual response for debugging
          this.logger.warn(`Unable to extract text from response`, {
            responseStructure: JSON.stringify(data).substring(0, 500) + "..." // Truncated for log size
          });
          throw new Error(redactApiKey(`Invalid response format from ${this.getName()} API: could not find content in response.`, this.apiKey));
        }
        
        this.logger.debugLog(`LLM call completed successfully`);
        return contentText;
      } catch (err: any) {
        this.logger.error(`LLM API call error: ${err.message || String(err)}`);
        if (err.message && err.message.includes("timed out")) {
          throw new Error(redactApiKey(err.message, this.apiKey));
        }
        throw new Error(
          redactApiKey(
            `Failed to call ${this.getName()} API: ${err && err.message ? err.message : String(err)}`,
            this.apiKey
          )
        );
      }
    };

    return retryWithExponentialBackoff(doApiCall, isTransientError, 3, [500, 1000, 2000]);
  }
}