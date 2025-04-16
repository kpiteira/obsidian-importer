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
    
    // Build detailed prompt for the LLM that explains the available content types
    const truncatedContent = content.length > 3000 ? 
      content.substring(0, 3000) + "..." : 
      content;
    
    // Create type descriptions to help the LLM understand what each type means
    const typeDescriptions = {
      'recipe': 'Food preparation instructions with ingredients and steps',
      'restaurant': 'Information about a dining establishment including location, cuisine, hours',
      'movie': 'Film information including title, director, cast, plot summary',
      'generic': 'Generic web content that doesn\'t fit any specialized category'
    };
    
    // Build descriptions for available types only
    const typeDescriptionLines = availableTypes
      .map(type => `- ${type}: ${typeDescriptions[type as keyof typeof typeDescriptions] || type}`)
      .join('\n');
    
    const prompt = `
You are a specialized content classifier. Your task is to analyze a webpage URL and content sample to determine the most appropriate content type category.

URL: ${url}

Available content types:
${typeDescriptionLines}

Content sample:
"""
${truncatedContent}
"""

Based on the URL and content sample, which content type best describes this page?

Respond with ONLY a single word matching one of the available types listed above (e.g., "recipe", "movie", etc.).
Do not include any explanations or additional text. If none of the types match well, respond with "generic".
`;

    try {
      // Call LLM with a lower temperature for more consistent classification
      const response = await this.llmProvider.callLLM(prompt, {
        systemPrompt: "You are a precise content classification system. Your only job is to identify the type of content from a webpage sample.",
        temperature: 0.1
      });
      
      // Extract the content type from the response (get first line and clean it)
      let contentType = response
        .trim()
        .toLowerCase()
        .split('\n')[0]
        .replace(/['",.;]|^\s*|^I think this is|^This appears to be|^The content type is|^the page is about|^this is a/gi, '')
        .trim();
      
      this.logger.debugLog(`LLM raw classified content as: ${contentType}`);
      
      // Check if the contentType matches any of our handler types directly
      if (availableTypes.includes(contentType)) {
        return contentType;
      }
      
      // If not matched directly, try more flexible matching
      // Try removing hyphens for hyphenated responses 
      if (contentType.includes('-')) {
        const normalizedType = contentType.replace(/-/g, '');
        // Find handlers where the type without hyphens matches
        const matchingType = availableTypes.find(type => 
          type.replace(/-/g, '') === normalizedType
        );
        
        if (matchingType) {
          this.logger.debugLog(`Matched hyphenated response "${contentType}" to handler type "${matchingType}"`);
          return matchingType;
        }
      }
      
      // If LLM returned something not in our list, default to generic
      this.logger.warn(`LLM returned unrecognized content type: ${contentType}, defaulting to generic`);
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