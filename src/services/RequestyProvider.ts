import { LLMProvider } from "./LLMProvider";
import { retryWithExponentialBackoff, isTransientError } from "./retryWithExponentialBackoff";
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
  private apiKey: string;

  /**
   * @param getSettings Function that returns the latest { endpoint, model, timeoutMs }
   * @param apiKey API key for Requesty
   */
  constructor(
    getSettings: () => { endpoint: string; model: string; timeoutMs: number },
    apiKey: string
  ) {
    this.getSettings = getSettings;
    this.apiKey = apiKey;
  }


  /**
   * Calls the Requesty LLM API.
   * @param input Structured input for the LLM.
   * @param apiKey API key for Requesty.
   * @returns Promise resolving to the raw LLM response (Markdown).
   */
  async callLLM(
    prompt: string
  ): Promise<string> {
    // Fetch latest settings dynamically
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
      try {
        const responsePromise = requestUrl({
          url: endpoint,
          method: "POST",
          headers: {
            "Authorization": `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
          contentType: "application/json",
        });
        const timeoutPromise = new Promise<RequestUrlResponse>((_, reject) =>
          setTimeout(() => reject(new Error(`Requesty API request timed out after ${timeoutMs / 1000} seconds.`)), timeoutMs)
        );
        const response = await Promise.race([responsePromise, timeoutPromise]) as RequestUrlResponse;
        if (response.status < 200 || response.status >= 300) {
          let errorMsg = `Requesty API error: ${response.status}`;
          try {
            const errorData = response.json ? await response.json : JSON.parse(response.text);
            if (errorData && errorData.error && errorData.error.message) {
              errorMsg += ` - ${errorData.error.message}`;
            }
          } catch {
            // Ignore JSON parse errors
          }
          throw new Error(redactApiKey(errorMsg, this.apiKey));
        }

        const data = response.json ? await response.json : JSON.parse(response.text);
        if (
          !data ||
          !data.choices ||
          !Array.isArray(data.choices) ||
          !data.choices[0] ||
          !data.choices[0].message ||
          typeof data.choices[0].message.content !== "string"
        ) {
          throw new Error(redactApiKey("Invalid response format from Requesty API.", this.apiKey));
        }
        return data.choices[0].message.content;
      } catch (err: any) {
        if (err.message && err.message.includes("timed out")) {
          throw new Error(redactApiKey(err.message, this.apiKey));
        }
        throw new Error(
          redactApiKey(
            `Failed to call Requesty API: ${err && err.message ? err.message : String(err)}`,
            this.apiKey
          )
        );
      }
    };

    return retryWithExponentialBackoff(doApiCall, isTransientError, 3, [500, 1000, 2000]);
  }
}