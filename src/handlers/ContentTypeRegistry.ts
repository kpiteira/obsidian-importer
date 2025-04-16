import { ContentTypeHandler } from "./ContentTypeHandler";
import { fetchWebPageContent, extractMainContent } from "../utils/webFetcher";
import { LLMProvider } from "../services/LLMProvider";
import { getLogger } from "../utils/importerLogger";

/**
 * Registry for content type handlers with two-phase detection strategy:
 * 1. URL-based detection (fast)
 * 2. Content-based detection (using LLM)
 */
export class ContentTypeRegistry {
  private handlers: ContentTypeHandler[] = [];
  private detectionCache: Map<string, string> = new Map();
  private pageContentCache: Map<string, string> = new Map();
  private llmProvider?: LLMProvider;
  private logger = getLogger();
  
  /**
   * Constructs a new ContentTypeRegistry
   * @param llmProvider Optional LLM provider for content-based detection
   */
  constructor(llmProvider?: LLMProvider) {
    this.llmProvider = llmProvider;
  }
  
  /**
   * Registers a content type handler with the registry
   * @param handler The handler to register
   */
  register(handler: ContentTypeHandler): void {
    this.handlers.push(handler);
    this.logger.debugLog(`Registered content type handler: ${handler.type}`);
  }

  /**
   * Gets all registered handlers
   * @returns Array of registered content type handlers
   */
  getHandlers(): ContentTypeHandler[] {
    return [...this.handlers];
  }
  
  /**
   * Gets a handler by its type identifier
   * @param type The handler type identifier to look up
   * @returns The requested handler or undefined if not found
   */
  getHandlerByType(type: string): ContentTypeHandler | undefined {
    return this.handlers.find(h => h.type === type);
  }

  /**
   * Detect the content type for a given URL using the two-phase detection strategy:
   * 1. URL-based detection (fast path)
   * 2. Content-based detection with LLM (expensive fallback)
   * 
   * @param url The URL to detect content type for
   * @returns Promise resolving to the appropriate content type handler
   * @throws Error if no handler can be determined
   */
  async detectContentType(url: string): Promise<ContentTypeHandler> {
    // Check cache first
    if (this.detectionCache.has(url)) {
      const handlerType = this.detectionCache.get(url);
      const handler = this.handlers.find(h => h.type === handlerType);
      if (handler) {
        this.logger.debugLog(`Using cached content type handler: ${handler.type} for ${url}`);
        return handler;
      }
    }
    
    let urlObj: URL;
    try {
      urlObj = new URL(url);
    } catch (error) {
      throw new Error(`Invalid URL format: ${url}`);
    }
    
    // URL-based detection first (fast)
    this.logger.debugLog(`Attempting URL-based detection for: ${url}`);
    for (const handler of this.handlers) {
      if (await handler.canHandleUrl(urlObj)) {
        this.logger.debugLog(`URL-based detection succeeded with handler: ${handler.type}`);
        this.detectionCache.set(url, handler.type);
        return handler;
      }
    }
    
    // Content-based detection for generic types (expensive)
    this.logger.debugLog(`URL-based detection failed, trying content-based detection for: ${url}`);
    const genericHandlers = this.handlers.filter(h => h.requiresContentDetection());
    
    if (genericHandlers.length > 0 && this.llmProvider) {
      // Only fetch the content once and cache it
      if (!this.pageContentCache.has(url)) {
        try {
          this.logger.debugLog(`Fetching web page content for: ${url}`);
          const content = await fetchWebPageContent(url);
          this.pageContentCache.set(url, content);
        } catch (error: unknown) {
          const errorMessage = error instanceof Error 
            ? error.message 
            : 'Unknown error';
          this.logger.error(`Error fetching web page content for content-based detection: ${errorMessage}`);
          throw new Error(`Failed to fetch content for detection: ${errorMessage}`);
        }
      }
      
      const pageContent = this.pageContentCache.get(url)!;
      const extractedContent = extractMainContent(pageContent);
      
      try {
        const contentType = await this.determineContentTypeWithLLM(
          url, extractedContent, genericHandlers.map(h => h.type)
        );
        
        const handler = this.handlers.find(h => h.type === contentType);
        if (handler) {
          this.logger.debugLog(`Content-based detection succeeded with handler: ${handler.type}`);
          this.detectionCache.set(url, handler.type);
          return handler;
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error 
          ? error.message 
          : 'Unknown error';
        this.logger.error(`Error in content-based detection: ${errorMessage}`);
        // Continue to fallback logic
      }
    }
    
    // If we have a fallback handler that accepts any content, use it
    const fallbackHandler = this.handlers.find(h => h.type === 'generic');
    if (fallbackHandler) {
      this.logger.debugLog(`Using fallback generic handler for: ${url}`);
      this.detectionCache.set(url, fallbackHandler.type);
      return fallbackHandler;
    }
    
    throw new Error("Could not determine content type for this URL");
  }
  
  /**
   * Uses the LLM to determine the content type based on the URL and page content
   * 
   * @param url The URL of the page
   * @param content The page content
   * @param availableTypes Array of available content type identifiers
   * @returns Promise resolving to the determined content type
   */
  private async determineContentTypeWithLLM(
    url: string, 
    content: string, 
    availableTypes: string[]
  ): Promise<string> {
    if (!this.llmProvider) {
      throw new Error("LLM provider is required for content-based detection");
    }
    
    // Build concise prompt for the LLM
    const truncatedContent = content.length > 2000 ? 
      content.substring(0, 2000) + "..." : 
      content;
    
    const prompt = `
I need you to identify the content type of this web page. Based on the URL and extracted content sample, classify this as one of the following types: ${availableTypes.join(', ')}.
 
URL: ${url}
Content sample: 
"${truncatedContent}"

Return your answer as a single word matching one of the available types. If none match, return "generic".
`;

    try {
      const response = await this.llmProvider.callLLM(prompt, {
        systemPrompt: "You are a content classification system. Your job is to determine the type of content from a URL and sample.",
        temperature: 0.2
      });
      
      // Extract the content type from the response (get first line and clean it)
      const contentType = response
        .trim()
        .split('\n')[0]
        .replace(/['",.;]|^\s*|^I think this is a?|^This appears to be a?|^The content type is a?/gi, '')
        .trim()
        .toLowerCase();
      
      // Check if the returned type is in our available types
      if (availableTypes.includes(contentType)) {
        return contentType;
      }
      
      // If LLM returned something not in our list, default to generic
      return 'generic';
    } catch (error: unknown) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Unknown error';
      this.logger.error(`Error calling LLM for content detection: ${errorMessage}`);
      throw new Error(`LLM content detection failed: ${errorMessage}`);
    }
  }
  
  /**
   * Clears all cache entries
   */
  clearCache(): void {
    this.detectionCache.clear();
    this.pageContentCache.clear();
  }
  
  /**
   * Gets the cached content for a URL if available
   * @param url The URL to get cached content for
   * @returns The cached content or undefined if not in cache
   */
  getCachedContent(url: string): string | undefined {
    return this.pageContentCache.get(url);
  }
  
  /**
   * Gets the current size of the detection cache
   * @returns Number of items in the cache
   */
  getCacheSize(): number {
    return this.detectionCache.size;
  }
}