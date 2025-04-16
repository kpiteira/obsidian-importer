import { ContentTypeHandler } from "./ContentTypeHandler";
import { YouTubeHandler } from "./YouTubeHandler";

// Registry for all handlers (singleton)
let handlers: ContentTypeHandler[] = [];

/**
 * Register a content type handler
 * @param handler Handler to register
 */
export function registerContentTypeHandler(handler: ContentTypeHandler): void {
  handlers.push(handler);
}

/**
 * Reset all registered handlers (useful for testing)
 */
export function resetContentTypeHandlers(): void {
  handlers = [];
}

/**
 * Detect content type based on URL
 * @param url URL to detect content type for
 * @returns Handler for the detected content type, or null if none found
 */
export function detectContentType(url: URL): ContentTypeHandler | null {
  for (const handler of handlers) {
    if (handler.detect(url)) {
      return handler;
    }
  }
  return null;
}

/**
 * Get all registered handlers
 * @returns Array of all registered content type handlers
 */
export function getAllContentTypeHandlers(): ContentTypeHandler[] {
  return [...handlers];
}

// Pre-register default handlers
registerContentTypeHandler(new YouTubeHandler());