/**
 * Generalized (empty) LLM output interface. Extend for specific use cases.
 */
export interface LLMOutput {}


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
   * Calls the LLM with the given input and API key.
   * @param input Structured input for the LLM (e.g., transcript, metadata).
   * @param apiKey API key for authenticating with the LLM provider.
   * @returns Promise resolving to the raw LLM response (Markdown).
   */
  callLLM(
    prompt: string,
    apiKey: string
  ): Promise<string>;
}