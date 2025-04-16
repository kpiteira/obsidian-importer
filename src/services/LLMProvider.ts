/**
 * Generalized (empty) LLM output interface. Extend for specific use cases.
 */
export interface LLMOutput {}

/**
 * Model information interface for available LLM models
 */
export interface ModelInfo {
  id: string;
  name: string;
  contextLength?: number;
  supportsStreaming?: boolean;
}

/**
 * Options for LLM API calls
 */
export interface LLMOptions {
  model?: string;
  endpoint?: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  headers?: Record<string, string>; // Additional headers for the API request
}

/**
 * LLMProvider abstracts interaction with different LLM APIs.
 */
export interface LLMProvider {
  /**
   * Get the provider name
   */
  getName(): string;
  
  /**
   * Get the default endpoint URL for this provider
   */
  getDefaultEndpoint(): string;
  
  /**
   * Get available models for this provider
   */
  getAvailableModels(): Promise<ModelInfo[]>;
  
  /**
   * Calls the LLM with the given prompt and optional parameters
   * @param prompt The prompt to send to the LLM
   * @param options Optional parameters for the LLM call
   * @returns Promise resolving to the LLM response text
   */
  callLLM(prompt: string, options?: LLMOptions): Promise<string>;
  
  /**
   * Validate the connection to the LLM provider
   */
  validateConnection(): Promise<boolean>;
  
  /**
   * Whether this provider requires an API key
   */
  requiresApiKey(): boolean;
  
  /**
   * Whether this provider allows specifying a custom endpoint
   */
  requiresEndpoint(): boolean;
}

/**
 * Provider types supported by the plugin
 */
export enum ProviderType {
  REQUESTY = 'requesty',
  OPENROUTER = 'openrouter',
  OPENAI = 'openai',
  LOCAL = 'local'
}

/**
 * Default configuration for providers
 */
export const DEFAULT_TIMEOUT_MS = 60000;
export const DEFAULT_TEMPERATURE = 0.3;
export const DEFAULT_SYSTEM_PROMPT = "You are a helpful assistant that analyzes content.";