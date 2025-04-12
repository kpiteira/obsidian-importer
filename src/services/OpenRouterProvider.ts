import { LLMProvider, LLMInput } from "./LLMProvider";
import { retryWithExponentialBackoff, isTransientError } from "./retryWithExponentialBackoff";
import { redactApiKey } from "../utils/redact";

/**
 * OpenRouterProvider implements the LLMProvider interface for OpenRouter API.
 * Handles API call logic, error handling, and timeout management.
 */
export class OpenRouterProvider implements LLMProvider {
  private endpoint: string;
  private model: string;
  private timeoutMs: number;

  /**
   * @param options Optional configuration: { endpoint, model, timeoutMs }
   */
  constructor(options?: { endpoint?: string; model?: string; timeoutMs?: number }) {
    this.endpoint = options?.endpoint ?? "https://openrouter.ai/api/v1/chat/completions";
    this.model = options?.model ?? "google/gemini-2.0-flash-exp";
    this.timeoutMs = options?.timeoutMs ?? 30000; // default 30s
  }

  /**
   * Renders the prompt by replacing {{key}} in the template with input[key].
   */
  private renderPrompt(template: string, input: LLMInput): string {
    return template.replace(/{{\s*(\w+)\s*}}/g, (_, key) =>
      input[key] !== undefined ? String(input[key]) : ""
    );
  }

  /**
   * Calls the OpenRouter LLM API.
   * @param input Structured input for the LLM.
   * @param apiKey API key for OpenRouter.
   * @param promptTemplate The prompt template to use.
   * @returns Promise resolving to the raw LLM response (Markdown).
   */
  async callLLM(
    input: LLMInput,
    apiKey: string,
    promptTemplate: string
  ): Promise<string> {
    const prompt = this.renderPrompt(promptTemplate, input);

    const body = {
      model: this.model,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    };

    const doApiCall = async (): Promise<string> => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        const response = await fetch(this.endpoint, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!response.ok) {
          let errorMsg = `OpenRouter API error: ${response.status} ${response.statusText}`;
          // Try to extract error details from response body if available
          try {
            const errorData = await response.json();
            if (errorData && errorData.error && errorData.error.message) {
              errorMsg += ` - ${errorData.error.message}`;
            }
          } catch {
            // Ignore JSON parse errors
          }
          throw new Error(redactApiKey(errorMsg, apiKey));
        }

        const data = await response.json();
        if (
          !data ||
          !data.choices ||
          !Array.isArray(data.choices) ||
          !data.choices[0] ||
          !data.choices[0].message ||
          typeof data.choices[0].message.content !== "string"
        ) {
          throw new Error(redactApiKey("Invalid response format from OpenRouter API.", apiKey));
        }

        return data.choices[0].message.content;
      } catch (err: any) {
        if (err.name === "AbortError") {
          throw new Error(redactApiKey(`OpenRouter API request timed out after ${this.timeoutMs / 1000} seconds.`, apiKey));
        }
        // Do not include apiKey in error messages
        throw new Error(
          redactApiKey(
            `Failed to call OpenRouter API: ${err && err.message ? err.message : String(err)}`,
            apiKey
          )
        );
      } finally {
        clearTimeout(timeout);
      }
    };

    return retryWithExponentialBackoff(doApiCall, isTransientError, 3, [500, 1000, 2000]);
  }
}