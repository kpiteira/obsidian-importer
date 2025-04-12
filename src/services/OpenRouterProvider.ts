import { LLMProvider, LLMInput } from "./LLMProvider";
import { retryWithExponentialBackoff, isTransientError } from "./retryWithExponentialBackoff";
import { redactApiKey } from "../utils/redact";
import { getLogger } from "../utils/importerLogger";
import { requestUrl, RequestUrlResponse } from "obsidian";
import { get } from "http";

/**
 * OpenRouterProvider implements the LLMProvider interface for OpenRouter API.
 * Handles API call logic, error handling, and timeout management.
 */
export class OpenRouterProvider implements LLMProvider {
  private getSettings: () => { endpoint: string; model: string; timeoutMs: number };

  /**
   * @param options Optional configuration: { endpoint, model, timeoutMs }
   */
  /**
   * @param getSettings Function that returns the latest settings: { endpoint, model, timeoutMs }
   */
  constructor(getSettings: () => { endpoint: string; model: string; timeoutMs: number }) {
    this.getSettings = getSettings;
    const { endpoint, model, timeoutMs } = this.getSettings();
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
   * @returns Promise resolving to the raw LLM response (Markdown).
   */
  async callLLM(
    input: LLMInput,
    apiKey: string
  ): Promise<string> {
    // Use the code-defined default prompt template
    // Import at top: import { DEFAULT_YOUTUBE_PROMPT_TEMPLATE } from "./llmPrompts";
    // (If not already imported, add it.)
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { DEFAULT_YOUTUBE_PROMPT_TEMPLATE } = require("./llmPrompts");
    const prompt = this.renderPrompt(DEFAULT_YOUTUBE_PROMPT_TEMPLATE, input);
    const { endpoint, model, timeoutMs } = this.getSettings();
    const body = {
      model,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    };

    const doApiCall = async (): Promise<string> => {
      // Use Obsidian's requestUrl to bypass CORS restrictions in the desktop app.
      // Timeout is handled by racing the request against a timeout Promise.
      try {
        const responsePromise = requestUrl({
          url: endpoint,
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
          contentType: "application/json",
        });

        // Timeout logic: race the request against a timeout
        const timeoutPromise = new Promise<RequestUrlResponse>((_, reject) =>
          setTimeout(() => reject(new Error(`OpenRouter API request timed out after ${timeoutMs / 1000} seconds.`)), timeoutMs)
        );
        const response = await Promise.race([responsePromise, timeoutPromise]) as RequestUrlResponse;
        if (response.status < 200 || response.status >= 300) {
          let errorMsg = `OpenRouter API error: ${response.status}`;
          // Try to extract error details from response body if available
          try {
            const errorData = response.json ? await response.json : JSON.parse(response.text);
            if (errorData && errorData.error && errorData.error.message) {
              errorMsg += ` - ${errorData.error.message}`;
            }
          } catch {
            // Ignore JSON parse errors
          }
          throw new Error(redactApiKey(errorMsg, apiKey));
        }

        // Parse response JSON
        const data = response.json ? await response.json : JSON.parse(response.text);
        if (
          !data ||
          !data.choices ||
          !Array.isArray(data.choices) ||
          !data.choices[0] ||
          !data.choices[0].message ||
          typeof data.choices[0].message.content !== "string"
        ) {
          getLogger().error("LLM response parsing error: Invalid response format", data);
          throw new Error(redactApiKey("Invalid response format from OpenRouter API.", apiKey));
        }
  
        return data.choices[0].message.content;
      } catch (err: any) {
        getLogger().error("OpenRouter LLM call failed", err && err.message ? err.message : err);
        if (err.message && err.message.includes("timed out")) {
          throw new Error(redactApiKey(err.message, apiKey));
        }
        // Do not include apiKey in error messages
        throw new Error(
          redactApiKey(
            `Failed to call OpenRouter API: ${err && err.message ? err.message : String(err)}`,
            apiKey
          )
        );
      }
    };

    return retryWithExponentialBackoff(doApiCall, isTransientError, 3, [500, 1000, 2000]);
  }
}