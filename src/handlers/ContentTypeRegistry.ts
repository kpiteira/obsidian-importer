import { getLogger } from "../utils/importerLogger";
import { ContentTypeHandler } from "./ContentTypeHandler";

/**
 * Registry for managing multiple content type handlers with URL detection and caching capabilities.
 * 
 * The registry provides:
 * - Registration of handlers
 * - Fast content type detection with caching
 * - Two-phase detection strategy: URL-based first, content-based as fallback
 */
export class ContentTypeRegistry {
  private handlers: ContentTypeHandler[] = [];
  private detectionCache: Map<string, string> = new Map();
  private pageContentCache: Map<string, string> = new Map();
  private logger = getLogger();

  /**
   * Register a content type handler with the registry
   * @param handler The handler to register
   */
  register(handler: ContentTypeHandler): void {
    this.handlers.push(handler);
    this.logger.debugLog(`Registered handler for content type: ${handler.type}`);
  }

  /**
   * Get all registered content type handlers
   * @returns Array of registered handlers
   */
  getHandlers(): ContentTypeHandler[] {
    return [...this.handlers];
  }

  /**
   * Detect the appropriate content type handler for a URL
   * - First checks cache
   * - Then tries URL-based detection
   * - Falls back to content-based detection in future slices
   * 
   * @param url The URL to detect content type for
   * @returns The matching content type handler or null if none found
   */
  async detectContentType(url: string): Promise<ContentTypeHandler | null> {
    this.logger.debugLog(`Detecting content type for URL: ${url}`);
    
    // Check cache first for fast lookups
    if (this.detectionCache.has(url)) {
      const handlerType = this.detectionCache.get(url);
      const handler = this.handlers.find(h => h.type === handlerType);
      
      if (handler) {
        this.logger.debugLog(`Using cached handler for URL: ${url}, type: ${handler.type}`);
        return handler;
      } else {
        // Handler was removed or changed, clear this cache entry
        this.detectionCache.delete(url);
      }
    }
    
    // URL-based detection (fast)
    try {
      const urlObj = new URL(url);
      for (const handler of this.handlers) {
        if (handler.detect(urlObj)) {
          // Cache the result
          this.detectionCache.set(url, handler.type);
          this.logger.debugLog(`Detected content type via URL: ${handler.type}`);
          return handler;
        }
      }
    } catch (err) {
      this.logger.error(`Invalid URL format: ${url}`, err);
      return null;
    }
    
    // Content-based detection will be implemented in future slices
    
    this.logger.warn(`No content handler found for URL: ${url}`);
    return null;
  }

  /**
   * Clear the detection and page content caches
   */
  clearCache(): void {
    this.detectionCache.clear();
    this.pageContentCache.clear();
    this.logger.debugLog("ContentTypeRegistry cache cleared");
  }

  /**
   * Get the size of the detection cache
   * @returns Number of entries in the detection cache
   */
  getCacheSize(): number {
    return this.detectionCache.size;
  }
}