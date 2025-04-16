import { requestUrl, RequestUrlResponse } from "obsidian";

/**
 * Fetches web page content from a given URL
 * This utility is used primarily for content-based detection in ContentTypeRegistry
 * 
 * @param url The URL to fetch content from
 * @returns Promise resolving to the page content as string
 * @throws Error if the fetch fails or returns non-200 status
 */
export async function fetchWebPageContent(url: string): Promise<string> {
  try {
    const response: RequestUrlResponse = await requestUrl({
      url,
      headers: {
        'User-Agent': 'Mozilla/5.0 ObsidianImporter/1.0'
      },
      throw: true // Throw if status code is not 2xx
    });

    // Return the page content
    return response.text;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Unknown error';
    throw new Error(`Failed to fetch web page content: ${errorMessage}`);
  }
}

/**
 * Extracts the main content from a web page, stripping navigation, headers, footers, etc.
 * Uses simple heuristics to identify the main content area.
 * 
 * @param htmlContent The full HTML content of the page
 * @returns The extracted main content
 */
export function extractMainContent(htmlContent: string): string {
  // Very basic content extraction: remove script tags, style tags and comments
  let content = htmlContent
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');

  // Extract text content from HTML by removing all tags
  content = content.replace(/<[^>]*>/g, ' ');
  
  // Normalize whitespace
  content = content.replace(/\s+/g, ' ').trim();
  
  // Limit content length to avoid overwhelming the LLM
  const MAX_CONTENT_LENGTH = 10000;
  if (content.length > MAX_CONTENT_LENGTH) {
    content = content.substring(0, MAX_CONTENT_LENGTH) + '...';
  }

  return content;
}