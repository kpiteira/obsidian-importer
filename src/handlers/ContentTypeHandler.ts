import { LLMOutput } from "../services/LLMProvider";

/**
 * Base metadata interface that all content type handlers should extend
 */
export interface ContentMetadata {
  title?: string;
  url?: string;
  type?: string;
  // Any other common metadata fields
  [key: string]: any; // Allow for handler-specific fields
}

/**
 * Interface defining a content handler for a specific content type.
 * Each handler is responsible for:
 * 1. Detecting if it can handle a given URL
 * 2. Downloading and extracting content 
 * 3. Generating a prompt for LLM processing
 * 4. Parsing the LLM response
 * 5. Generating the final note content
 */
export interface ContentTypeHandler {
  /**
   * The type identifier for this handler (e.g., "youtube", "medium", "github")
   */
  readonly type: string;
  
  /**
   * Legacy URL detection method (synchronous)
   * @deprecated Use canHandleUrl instead
   */
  detect(url: URL): boolean;
  
  /**
   * Enhanced URL-based detection that can perform async checks
   * Called by ContentTypeRegistry in the first phase of detection
   */
  canHandleUrl(url: URL): Promise<boolean>;
  
  /**
   * Indicates if this handler requires content-based detection
   * Returns true if the handler can't reliably detect content by URL alone
   */
  requiresContentDetection(): boolean;
  
  /**
   * Lists API keys required by this handler
   * Used to validate required keys before attempting to process content
   */
  getRequiredApiKeys(): string[];
  
  /**
   * Downloads and processes content from a URL.
   * Returns a unified content object with both content and metadata.
   * 
   * @param url The URL to fetch content from
   * @param cachedContent Optional pre-fetched content if available
   * @returns Promise resolving to a unified content object with content and metadata
   */
  download(url: string, cachedContent?: string): Promise<{
    /**
     * The handler-specific content object, which may include both the primary content
     * and any metadata. All handlers should return a consistent structure for their type.
     */
    unifiedContent: ContentMetadata
  }>;
  
  /**
   * Generates the LLM prompt for this content type
   * @param unifiedContent The unified content object returned by download()
   * @returns The prompt string to send to the LLM
   */
  getPrompt(unifiedContent: ContentMetadata): string;
  
  /**
   * Parses the LLM markdown response into a structured object
   * @param markdown The raw markdown response from the LLM
   * @returns The parsed structured output
   */
  parseLLMResponse(markdown: string): LLMOutput;
  
  /**
   * Validates the LLM output to ensure it meets expected format and content requirements
   * @param output The LLM output to validate
   * @returns true if valid, throws error if invalid
   */
  validateLLMOutput(output: LLMOutput): boolean;
  
  /**
   * Gets the folder name for this content type
   * @param unifiedContent The unified content object
   * @returns The folder name to use when saving notes
   */
  getFolderName(unifiedContent?: ContentMetadata): string;
  
  /**
   * Generates the final note content to be written to the file
   * @param markdown The processed markdown content from the LLM
   * @param unifiedContent The unified content object
   * @returns The complete note content
   */
  getNoteContent(markdown: string, unifiedContent: ContentMetadata): string;
}