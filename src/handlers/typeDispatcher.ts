import { ContentTypeHandler } from "./ContentTypeHandler";
import { YouTubeHandler } from "./YouTubeHandler";
import { MediumHandler } from "./MediumHandler";
import { RecipeHandler } from "./RecipeHandler";
import { RestaurantHandler } from "./RestaurantHandler";
import { MovieHandler } from "./MovieHandler";
import { getLogger } from "../utils/importerLogger";

// Registry for all handlers (singleton)
let handlers: ContentTypeHandler[] = [];

/**
 * Register a content type handler
 * @param handler Handler to register
 */
export function registerContentTypeHandler(handler: ContentTypeHandler): void {
  handlers.push(handler);
  getLogger().debugLog(`Registered content type handler: ${handler.type}`);
}

/**
 * Reset all registered handlers (useful for testing)
 */
export function resetContentTypeHandlers(): void {
  handlers = [];
  getLogger().debugLog("Reset all content type handlers");
}

/**
 * Detect content type based on URL
 * @param url URL to detect content type for
 * @returns Handler for the detected content type, or null if none found
 */
export function detectContentType(url: URL): ContentTypeHandler | null {
  for (const handler of handlers) {
    if (handler.detect(url)) {
      getLogger().debugLog(`Detected content type: ${handler.type} for URL: ${url.toString()}`);
      return handler;
    }
  }
  getLogger().debugLog(`No content type handler found for URL: ${url.toString()}`);
  return null;
}

/**
 * Get all registered handlers
 * @returns Array of all registered content type handlers
 */
export function getAllContentTypeHandlers(): ContentTypeHandler[] {
  return [...handlers];
}

/**
 * Get all handlers that require content-based detection
 * @returns Array of content handlers that require LLM detection
 */
export function getContentDetectionHandlers(): ContentTypeHandler[] {
  return handlers.filter(h => h.requiresContentDetection());
}

// Pre-register default handlers
registerContentTypeHandler(new YouTubeHandler());
registerContentTypeHandler(new MediumHandler());
registerContentTypeHandler(new RecipeHandler());
registerContentTypeHandler(new RestaurantHandler());
registerContentTypeHandler(new MovieHandler());