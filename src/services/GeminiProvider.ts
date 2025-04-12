import { LLMProvider, LLMInput } from "./LLMProvider";
import { redactApiKey } from "../utils/redact";
import { getLogger } from "../utils/importerLogger";
import { GenerativeModel, GoogleGenerativeAI } from "@google/generative-ai";

/**
 * GeminiProvider implements the LLMProvider interface for Google Gemini API.
 * Uses dependency-injected settings and provides robust error handling.
 */
export class GeminiProvider implements LLMProvider {
  private model: GenerativeModel;

  /**
   * @param getSettings Function returning { model, maxTokens, temperature }
   */
  constructor(private getSettings: () => { model: string; maxTokens: number; temperature: number }) {
    const { model, maxTokens, temperature } = this.getSettings();
    // Model instance is created once per provider instance
    // API key is provided at call time, not stored
    this.model = null as any; // Will be initialized on first callLLM
  }

  /**
   * Calls the Gemini LLM API.
   * @param input Structured input for the LLM.
   * @param apiKey API key for Gemini.
   * @returns Promise resolving to the raw LLM response (Markdown).
   */
  async callLLM(input: LLMInput, apiKey: string): Promise<string> {
    const { model, maxTokens, temperature } = this.getSettings();
    const prompt = typeof input.content === "string" ? input.content : JSON.stringify(input);

    try {
      // Initialize Gemini client and model for each call (ensures no API key is stored)
      const genAI = new GoogleGenerativeAI(apiKey);
      const geminiModel = genAI.getGenerativeModel({
        model,
        generationConfig: {
          maxOutputTokens: maxTokens,
          temperature,
        },
      });

      const result = await geminiModel.generateContent(prompt);
      const response = await result.response;

      if (!response || typeof response.text !== "function") {
        getLogger().error("Gemini LLM response parsing error: Invalid response format", response);
        throw new Error(redactApiKey("Invalid response format from Gemini API.", apiKey));
      }

      return await response.text();
    } catch (error: any) {
      // Always redact API key in error messages
      throw new Error(
        redactApiKey(
          `Gemini API error: ${error && error.message ? error.message : String(error)}`,
          apiKey
        )
      );
    }
  }
}