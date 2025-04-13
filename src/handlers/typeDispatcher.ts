import { ContentTypeHandler } from "./ContentTypeHandler";
import { YouTubeHandler } from "./YouTubeHandler";

/**
 * Central registry and dispatcher for all available content type handlers.
 *
 * - Handlers must implement the ContentTypeHandler interface.
 * - To add support for a new content type, implement ContentTypeHandler and add an instance to the handlers array.
 * - The dispatcher selects the appropriate handler for a given URL using handler.detect(url).
 */
const handlers: ContentTypeHandler[] = [
  new YouTubeHandler(),
];

/**
 * Selects the appropriate ContentTypeHandler for a given URL.
 *
 * @param url The URL to check.
 * @returns The first matching handler, or null if none found.
 *
 * Usage:
 *   const handler = detectContentType(new URL("https://youtube.com/..."));
 *   if (handler) {
 *     // Use handler.getPrompt, handler.parseLLMResponse, etc.
 *   }
 */
export function detectContentType(url: URL): ContentTypeHandler | null {
  for (const handler of handlers) {
    if (handler.detect(url)) {
      return handler;
    }
  }
  return null;
}