/**
 * Interface for content type handlers in the strategy-based handler architecture.
 * Each handler is responsible for detecting, prompting, and parsing content of a specific type.
 */
import { LLMOutput } from "../services/LLMProvider";

export interface ContentMetadata {
  title: string;
}

export interface ContentTypeHandler {
  /**
   * The unique type string for this handler (e.g., "youtube").
   * Used to identify the handler within the dispatcher and for logging or debugging.
   */
  type: string;

  /**
   * Determines if this handler can process the given URL.
   * Used by the dispatcher to select the appropriate handler for a given input.
   * @param url The URL to check.
   * @returns True if this handler can process the URL, false otherwise.
   */
  detect(url: URL): boolean;
  
  /**
   * Enhanced URL-based detection for ContentTypeRegistry.
   * By default, uses the detect(url) method.
   * @param url The URL to check
   * @returns Promise resolving to true if this handler can process the URL
   */
  canHandleUrl?(url: URL): Promise<boolean>;
  
  /**
   * Determines if this handler requires content-based detection.
   * Used by the registry to decide which detection strategy to use.
   * @returns True if content-based detection is required, false if URL-based detection is sufficient
   */
  requiresContentDetection?(): boolean;

  /**
   * Generates the LLM prompt for this content type, based on provided metadata.
   * This method encapsulates the prompt engineering logic specific to the content type.
   * @param metadata Arbitrary metadata required to construct the prompt (e.g., video title, transcript).
   * @returns The prompt string to send to the LLM.
   */
  getPrompt(metadata: ContentMetadata): string;

  /**
   * Parses the LLM's markdown response into a structured output for this content type.
   * This method encapsulates the parsing logic specific to the content type's expected output.
   * @param markdown The markdown string returned by the LLM.
   * @returns The parsed output as an LLMOutput object.
   */
  parseLLMResponse(markdown: string): LLMOutput;

  /**
   * Validates the LLM output for this content type.
   * Throws an error if the output is invalid.
   * @param output The LLM output object to validate.
   */
  validateLLMOutput(output: LLMOutput): true;
  /**
   * Downloads the content and metadata for the given URL.
   * @param url The URL to download content from.
   * @returns An object containing the content and metadata.
   */
  download(url: string): Promise<{ content: any; metadata: ContentMetadata }>;

  /**
   * 
   * @param markdown The markdown string returned by the LLM.
   * @param metadata The metadata generated during the download process.
   * @returns The note content to be written to the file.
   */
  getNoteContent(markdown: string, metadata: ContentMetadata): string;

  /**
   * Returns the folder name for YouTube notes.
   */
  getFolderName(): string
}

/**
 * Example: Implementation of ContentTypeHandler for YouTube videos.
 *
 * class YouTubeHandler implements ContentTypeHandler {
 *   type = "youtube";
 *
 *   detect(url: URL): boolean {
 *     // Checks if the URL is a YouTube video link.
 *     return url.hostname.includes("youtube.com") || url.hostname.includes("youtu.be");
 *   }
 *
 *   getPrompt(metadata: any): string {
 *     // Constructs a prompt using video metadata (e.g., title, transcript).
 *     return `Summarize the following YouTube video:\nTitle: ${metadata.title}\nTranscript: ${metadata.transcript}`;
 *   }
 *
 *   parseLLMResponse(markdown: string): LLMOutput {
 *     // Parses the markdown response from the LLM into a structured summary object.
 *     return { summary: markdown.trim() };
 *   }
 * }
 */