/**
 * LLMInput is a placeholder type representing the structured input
 * to be sent to the LLM. Replace or extend this definition as needed.
 */
export interface LLMInput {
  // Example fields; extend as required for your use case
  content: string;
  [key: string]: any;
}

/**
 * LLMProvider abstracts interaction with different LLM APIs.
 * Implementations should handle provider-specific request/response logic.
 * 
 * - callLLM: Accepts structured input, API key, and prompt template.
 *   Returns a Promise resolving to the raw LLM response (Markdown).
 * - Extensible: API endpoint, model, and prompt template are configurable.
 */
export interface LLMProvider {
  /**
   * Calls the LLM with the given input, API key, and prompt template.
   * @param input Structured input for the LLM (e.g., transcript, metadata).
   * @param apiKey API key for authenticating with the LLM provider.
   * @param promptTemplate The prompt template to use for the LLM call.
   * @returns Promise resolving to the raw LLM response (Markdown).
   */
  callLLM(
    input: LLMInput,
    apiKey: string,
    promptTemplate: string
  ): Promise<string>;
}