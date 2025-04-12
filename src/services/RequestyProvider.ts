import { LLMProvider, LLMInput } from "./LLMProvider";
import { retryWithExponentialBackoff, isTransientError } from "../utils/retryWithExponentialBackoff";
import { redactApiKey } from "../utils/redact";
import { requestUrl, RequestUrlResponse } from "obsidian";
import { getLogger } from "../utils/importerLogger";
import { get } from "http";


/**
 * RequestyProvider implements the LLMProvider interface for the Requesty API.
 * Handles API call logic, error handling, and timeout management.
 */
export class RequestyProvider implements LLMProvider {
  private getSettings: () => { endpoint: string; model: string; timeoutMs: number };

  /**
   * @param getSettings Function that returns the latest { endpoint, model, timeoutMs }
   */
  constructor(getSettings: () => { endpoint: string; model: string; timeoutMs: number }) {
    this.getSettings = getSettings;
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
   * Calls the Requesty LLM API.
   * @param input Structured input for the LLM.
   * @param apiKey API key for Requesty.
   * @returns Promise resolving to the raw LLM response (Markdown).
   */
  async callLLM(
    input: LLMInput,
    apiKey: string
  ): Promise<string> {
    // Fetch latest settings dynamically
    const { endpoint, model, timeoutMs } = this.getSettings();

    // Use the code-defined default prompt template
    // Import at top: import { DEFAULT_YOUTUBE_PROMPT_TEMPLATE } from "./llmPrompts";
    // (If not already imported, add it.)
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { DEFAULT_YOUTUBE_PROMPT_TEMPLATE } = require("./llmPrompts");
    const prompt = this.renderPrompt(DEFAULT_YOUTUBE_PROMPT_TEMPLATE, input);
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
          setTimeout(() => reject(new Error(`Requesty API request timed out after ${timeoutMs / 1000} seconds.`)), timeoutMs)
        );
        const response = await Promise.race([responsePromise, timeoutPromise]) as RequestUrlResponse;
        if (response.status < 200 || response.status >= 300) {
          let errorMsg = `Requesty API error: ${response.status}`;
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
          throw new Error(redactApiKey("Invalid response format from Requesty API.", apiKey));
        }
  
        return data.choices[0].message.content;
      } catch (err: any) {
        if (err.message && err.message.includes("timed out")) {
          throw new Error(redactApiKey(err.message, apiKey));
        }
        // Do not include apiKey in error messages
        throw new Error(
          redactApiKey(
            `Failed to call Requesty API: ${err && err.message ? err.message : String(err)}`,
            apiKey
          )
        );
      }
    };

    return retryWithExponentialBackoff(doApiCall, isTransientError, 3, [500, 1000, 2000]);
  }
}