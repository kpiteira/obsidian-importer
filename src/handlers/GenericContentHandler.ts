// filepath: /Users/karl/Documents/dev/obsidian-importer/src/handlers/GenericContentHandler.ts
import { ContentMetadata, ContentTypeHandler } from "./ContentTypeHandler";
import { LLMOutput } from "../services/LLMProvider";
import { fetchWebPageContent, extractMainContent } from "../utils/webFetcher";
import { getLogger } from "../utils/importerLogger";

/**
 * Base content metadata for generic content types.
 * All generic handler metadata should extend this interface.
 */
export interface GenericContentMetadata extends ContentMetadata {
  title: string;
  url: string;
  content: string;
  imageUrl?: string;
  author?: string;
  publishedDate?: string;
}

/**
 * Abstract base class for handlers that use content-based LLM detection.
 * Implements shared functionality for generic content types:
 * - Always returns true for requiresContentDetection()
 * - Implements shared content downloading
 * - Provides utility methods for HTML parsing
 */
export abstract class GenericContentHandler implements ContentTypeHandler {
  /**
   * Type identifier for the content handler.
   * Must be overridden by concrete implementations.
   */
  abstract readonly type: string;

  /**
   * Legacy URL detection method (synchronous)
   * @deprecated Use canHandleUrl instead
   */
  detect(url: URL): boolean {
    // Most generic handlers can't determine by URL alone
    return false;
  }

  /**
   * Enhanced URL-based detection that can perform async checks
   * Most generic handlers don't have specific domains, so default to false
   */
  async canHandleUrl(url: URL): Promise<boolean> {
    return this.detect(url);
  }

  /**
   * Generic handlers always require content-based detection
   */
  requiresContentDetection(): boolean {
    return true;
  }

  /**
   * Lists API keys required by this handler
   * Most generic handlers don't require API keys
   */
  getRequiredApiKeys(): string[] {
    return [];
  }

  /**
   * Downloads and processes content from a URL.
   * Handles fetch, extraction, and basic metadata parsing.
   * 
   * @param url The URL to fetch content from
   * @param cachedContent Optional pre-fetched content if available
   */
  async download(url: string, cachedContent?: string): Promise<{ unifiedContent: GenericContentMetadata }> {
    const logger = getLogger();
    logger.debugLog(`Downloading generic content from ${url}`);

    try {
      // Use cached content if available, otherwise fetch new content
      let html = cachedContent;
      if (!html) {
        html = await fetchWebPageContent(url);
      }

      // Extract metadata and content
      const title = this.extractTitle(html);
      const content = extractMainContent(html);
      const author = this.extractAuthor(html);
      const publishedDate = this.extractDate(html);
      const imageUrl = this.extractMainImage(html);

      // Create the unified content object
      const unifiedContent: GenericContentMetadata = {
        title: title || "Untitled Content",
        url,
        content,
        author,
        publishedDate,
        imageUrl
      };

      logger.debugLog(`Successfully extracted generic content: ${title}`);
      return { unifiedContent };
    } catch (error) {
      logger.error(`Error downloading generic content: ${error}`);
      throw new Error(`Failed to download content: ${error}`);
    }
  }

  /**
   * Extract the title from HTML content
   * @param html The HTML content
   */
  protected extractTitle(html: string): string {
    // Try various meta tags first (most reliable)
    const ogTitleMatch = html.match(/<meta[^>]+property=['"]og:title['"][^>]+content=['"]([^'"]+)['"]/i);
    if (ogTitleMatch && ogTitleMatch[1]) {
      return ogTitleMatch[1];
    }

    // Try title tag
    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    if (titleMatch && titleMatch[1]) {
      return titleMatch[1].trim();
    }

    // Try h1 tags
    const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
    if (h1Match && h1Match[1]) {
      return h1Match[1].trim();
    }

    return "Untitled Content";
  }

  /**
   * Extract the author from HTML content
   * @param html The HTML content
   */
  protected extractAuthor(html: string): string | undefined {
    // Try meta tags first
    const authorMatch = html.match(/<meta[^>]+name=['"]author['"][^>]+content=['"]([^'"]+)['"]/i);
    if (authorMatch && authorMatch[1]) {
      return authorMatch[1];
    }

    // Try schema.org author markup
    const schemaAuthorMatch = html.match(/"author"\s*:\s*{\s*"@type"\s*:\s*"Person"\s*,\s*"name"\s*:\s*"([^"]+)"/);
    if (schemaAuthorMatch && schemaAuthorMatch[1]) {
      return schemaAuthorMatch[1];
    }

    return undefined;
  }

  /**
   * Extract the published date from HTML content
   * @param html The HTML content
   */
  protected extractDate(html: string): string | undefined {
    // Try meta tags for published date
    const dateMatch = html.match(/<meta[^>]+property=['"]article:published_time['"][^>]+content=['"]([^'"]+)['"]/i);
    if (dateMatch && dateMatch[1]) {
      try {
        const date = new Date(dateMatch[1]);
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      } catch (e) {
        return dateMatch[1];
      }
    }

    // Try schema.org published date
    const schemaDateMatch = html.match(/"datePublished"\s*:\s*"([^"]+)"/);
    if (schemaDateMatch && schemaDateMatch[1]) {
      try {
        const date = new Date(schemaDateMatch[1]);
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      } catch (e) {
        return schemaDateMatch[1];
      }
    }

    return undefined;
  }

  /**
   * Extract the main image from HTML content
   * @param html The HTML content
   */
  protected extractMainImage(html: string): string | undefined {
    // Try OG image first (most reliable for social sharing)
    const ogImageMatch = html.match(/<meta[^>]+property=['"]og:image['"][^>]+content=['"]([^'"]+)['"]/i);
    if (ogImageMatch && ogImageMatch[1]) {
      return ogImageMatch[1];
    }

    // Try schema.org image
    const schemaImageMatch = html.match(/"image"\s*:\s*"([^"]+)"/);
    if (schemaImageMatch && schemaImageMatch[1]) {
      return schemaImageMatch[1];
    }

    // Try finding the first image with reasonable dimensions (avoid icons)
    const imgMatch = html.match(/<img[^>]+src=['"]([^'"]+)['"][^>]*(?:width=['"](\d+)['"][^>]*height=['"](\d+)['"]|height=['"](\d+)['"][^>]*width=['"](\d+)['"])/i);
    if (imgMatch) {
      const width = parseInt(imgMatch[2] || imgMatch[5] || '0', 10);
      const height = parseInt(imgMatch[3] || imgMatch[4] || '0', 10);
      
      // Only use if image has reasonable dimensions (not tiny icons/buttons)
      if (width >= 200 || height >= 200) {
        return imgMatch[1];
      }
    }

    // Try any img with alt text (more likely to be content-relevant)
    // The pattern now looks for img tags that have both src and alt attributes, regardless of order
    const imgTags = html.match(/<img[^>]+>/ig) || [];
    for (const imgTag of imgTags) {
      // Check if the tag has both src and alt attributes
      if (imgTag.includes('alt=') && imgTag.includes('src=')) {
        const srcMatch = imgTag.match(/src=['"]([^'"]+)['"]/i);
        if (srcMatch && srcMatch[1]) {
          return srcMatch[1];
        }
      }
    }

    return undefined;
  }

  /**
   * Abstract method for generating the LLM prompt.
   * Must be implemented by concrete handlers.
   */
  abstract getPrompt(unifiedContent: GenericContentMetadata): string;

  /**
   * Abstract method for parsing the LLM response.
   * Must be implemented by concrete handlers.
   */
  abstract parseLLMResponse(markdown: string): LLMOutput;

  /**
   * Abstract method for validating LLM output.
   * Must be implemented by concrete handlers.
   */
  abstract validateLLMOutput(output: LLMOutput): boolean;

  /**
   * Abstract method for generating the note content.
   * Must be implemented by concrete handlers.
   */
  abstract getNoteContent(markdown: string, unifiedContent: GenericContentMetadata): string;

  /**
   * Abstract method for getting the folder name.
   * Must be implemented by concrete handlers.
   */
  abstract getFolderName(unifiedContent?: GenericContentMetadata): string;
}