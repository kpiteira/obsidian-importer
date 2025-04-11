import { ContentTypeHandler } from "./ContentTypeHandler";
import { YouTubeHandler } from "./YouTubeHandler";

/**
 * List of all available content type handlers.
 * Add new handlers to this array as needed.
 */
const handlers: ContentTypeHandler[] = [
  new YouTubeHandler(),
];

/**
 * Finds the first handler that can handle the given URL.
 * @param url The URL to check
 * @returns The matching handler, or null if none found
 */
export function detectContentType(url: URL): ContentTypeHandler | null {
  for (const handler of handlers) {
    if (handler.detect(url)) {
      return handler;
    }
  }
  return null;
}