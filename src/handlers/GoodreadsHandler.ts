// filepath: /Users/karl/Documents/dev/obsidian-importer/src/handlers/GoodreadsHandler.ts
import { ContentMetadata, ContentTypeHandler } from "./ContentTypeHandler";
import { fetchWebPageContent } from "../utils/webFetcher";
import { LLMOutput } from "../services/LLMProvider";
import { getLogger } from "../utils/importerLogger";

/**
 * Structure for Goodreads book LLM responses
 * @interface GoodreadsLLMOutput
 * @extends {LLMOutput}
 */
export interface GoodreadsLLMOutput extends LLMOutput {
  summary: string;
  themes: string[];
  highlights: string[];
  key_concepts: string[];
}

/**
 * Interface representing Goodreads book metadata and content
 * @interface GoodreadsBookData
 * @extends {ContentMetadata}
 */
export interface GoodreadsBookData extends ContentMetadata {
  title: string;
  author: string;
  author_url?: string;
  book_url: string;
  published_date?: string;
  cover_image?: string;
  isbn?: string;
  pages?: string;
  rating?: string;
  content: string;
}

/**
 * Handler for Goodreads book content, implementing the ContentTypeHandler interface.
 * This handler is responsible for detecting Goodreads URLs, downloading book content,
 * generating LLM prompts for book information extraction, and parsing LLM responses.
 * 
 * @class GoodreadsHandler
 * @implements {ContentTypeHandler}
 */
export class GoodreadsHandler implements ContentTypeHandler {
  /** @type {string} Type identifier for this content handler */
  public readonly type = "goodreads";

  /**
   * The Goodreads-specific prompt template for LLM book analysis.
   * 
   * @private
   * @static
   * @type {string}
   */
  private static readonly GOODREADS_PROMPT_TEMPLATE = `
You are analyzing a Goodreads book page for "{{title}}" by {{author}}. 

The book information from Goodreads might be limited, so please use your knowledge about this book to help provide a comprehensive analysis.

Please provide the following information about this book:

1. A concise summary of the book's content and main ideas (3-5 sentences)
2. Key themes explored in the book (3-7 themes)
3. Key highlights or important points from the book (5-7 bullet points)
4. Key concepts introduced or explored in the book (3-5 concepts with brief explanations)

Book information from Goodreads:
{{content}}

If the Goodreads information is limited, please supplement with your knowledge about this book. It's important to provide accurate information.

Format your response in JSON format with the following structure:
{
  "summary": "The concise summary text...",
  "themes": ["Theme 1", "Theme 2", ...],
  "highlights": ["Highlight 1", "Highlight 2", ...],
  "key_concepts": ["Key concept 1", "Key concept 2", ...]
}
`;

  /**
   * Determines if this handler can process the given URL.
   * Checks if the hostname matches known Goodreads domains.
   * 
   * @param {URL} url - The URL to check
   * @returns {boolean} True if this handler can process the URL
   */
  detect(url: URL): boolean {
    const host = url.hostname.toLowerCase();
    return (
      host === "goodreads.com" ||
      host === "www.goodreads.com" ||
      host.endsWith(".goodreads.com")
    );
  }

  /**
   * Enhanced URL-based detection for ContentTypeRegistry.
   * For Goodreads, this simply uses the synchronous detect method
   * but returns a Promise as required by the registry interface.
   * 
   * @param {URL} url - The URL to check
   * @returns {Promise<boolean>} Promise resolving to true if this handler can process the URL
   */
  async canHandleUrl(url: URL): Promise<boolean> {
    return this.detect(url);
  }

  /**
   * Determines if this handler requires content-based detection.
   * Goodreads URLs can be identified by URL pattern alone, so no content-based
   * detection is required.
   * 
   * @returns {boolean} False as Goodreads detection is URL-based only
   */
  requiresContentDetection(): boolean {
    return false;
  }

  /**
   * Lists API keys required by this handler.
   * @returns Empty array as no API keys are required
   */
  getRequiredApiKeys(): string[] {
    return [];
  }

  /**
   * Downloads the Goodreads book content and extracts metadata.
   * 
   * @param {string} url The Goodreads book URL
   * @param {string} [cachedContent] Optional cached HTML content
   * @returns {Promise<{unifiedContent: GoodreadsBookData}>} The unified content object
   * @throws {Error} If book content can't be fetched
   */
  async download(url: string, cachedContent?: string): Promise<{ unifiedContent: GoodreadsBookData }> {
    const logger = getLogger();
    logger.debugLog(`Downloading Goodreads book from ${url}`);
    
    try {
      // Use cached content if available, otherwise fetch new content
      let html = cachedContent;
      if (!html) {
        html = await fetchWebPageContent(url);
      }
      
      // Extract metadata from the HTML
      const title = this.extractTitle(html);
      const author = this.extractAuthor(html);
      const author_url = this.extractAuthorUrl(html);
      const published_date = this.extractPublishedDate(html);
      const cover_image = this.extractCoverImage(html);
      const isbn = this.extractISBN(html);
      const pages = this.extractPages(html);
      const rating = this.extractRating(html);
      const content = this.extractMainContent(html);
      
      if (!title || !content) {
        throw new Error("Failed to extract required content from Goodreads book page");
      }
      
      const unifiedContent: GoodreadsBookData = {
        title,
        author: author || "Unknown Author",
        author_url,
        book_url: url,
        published_date,
        cover_image,
        isbn,
        pages,
        rating,
        content
      };
      
      logger.debugLog(`Successfully extracted Goodreads book: ${title}`);
      return { unifiedContent };
    } catch (error) {
      logger.error(`Error downloading Goodreads book: ${error}`);
      throw new Error(`Failed to download Goodreads book: ${error}`);
    }
  }

  /**
   * Extract the title from the HTML content
   * @param {string} html The HTML content
   * @returns {string} The extracted title
   */
  private extractTitle(html: string): string {
    // Try to get title from meta tags first (most reliable)
    const ogTitleMatch = html.match(/<meta[^>]+property=['"]og:title['"][^>]+content=['"]([^'"]+)['"]/i);
    if (ogTitleMatch && ogTitleMatch[1]) {
      return ogTitleMatch[1];
    }
    
    // Try book title from specific Goodreads markup
    const bookTitleMatch = html.match(/<h1[^>]*id=['"]bookTitle['"][^>]*>([^<]+)<\/h1>/i);
    if (bookTitleMatch && bookTitleMatch[1]) {
      return bookTitleMatch[1].trim();
    }
    
    // Fallback to title tag
    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    if (titleMatch && titleMatch[1]) {
      return titleMatch[1].replace(" - Goodreads", "").trim();
    }
    
    return "Untitled Book";
  }

  /**
   * Extract the author from the HTML content
   * @param {string} html The HTML content
   * @returns {string} The extracted author name
   */
  private extractAuthor(html: string): string {
    // Try meta tags first
    const authorMatch = html.match(/<meta[^>]+name=['"]author['"][^>]+content=['"]([^'"]+)['"]/i) ||
                       html.match(/<meta[^>]+property=['"](?:og:|book:)author['"][^>]+content=['"]([^'"]+)['"]/i);
    if (authorMatch && authorMatch[1]) {
      return authorMatch[1];
    }
    
    // Try Goodreads specific author markup
    const goodreadsAuthorMatch = html.match(/<span[^>]*itemprop=['"]author['"][^>]*>[\s\S]*?<span[^>]*itemprop=['"]name['"][^>]*>([^<]+)<\/span>/i) ||
                               html.match(/<div[^>]*class=["']authorName["'][^>]*>(.*?)<\/div>/i);
    if (goodreadsAuthorMatch && goodreadsAuthorMatch[1]) {
      return goodreadsAuthorMatch[1].trim();
    }
    
    // Try alternate Goodreads author markup
    const authorLinkMatch = html.match(/<a[^>]*class="[^"]*authorName[^"]*"[^>]*>([^<]+)<\/a>/i) ||
                           html.match(/<a[^>]*href="\/author\/show\/[^"]*"[^>]*>([^<]+)<\/a>/i) ||
                           html.match(/<span[^>]*>(?:(?:by|By|BY)[\s:]+)<\/span>[\s\n]*<span[^>]*><a[^>]*>([^<]+)<\/a>/i);
    if (authorLinkMatch && authorLinkMatch[1]) {
      return authorLinkMatch[1].trim();
    }

    // Try literal "by Author Name" pattern
    const byAuthorMatch = html.match(/by\s+<a[^>]*>([^<]+)<\/a>/i) ||
                        html.match(/by\s+([A-Z][a-zA-Z\s.-]+)/i);
    if (byAuthorMatch && byAuthorMatch[1]) {
      return byAuthorMatch[1].trim();
    }
    
    return "Unknown Author";
  }

  /**
   * Extract the author URL from the HTML content
   * @param {string} html The HTML content
   * @returns {string|undefined} The extracted author URL
   */
  private extractAuthorUrl(html: string): string | undefined {
    // Try to find author URL in the Goodreads author link
    const authorLinkMatch = html.match(/<a[^>]*class="[^"]*authorName[^"]*"[^>]*href="([^"]+)"[^>]*>/i);
    if (authorLinkMatch && authorLinkMatch[1]) {
      // Make absolute URL if it's relative
      if (authorLinkMatch[1].startsWith('/')) {
        return `https://www.goodreads.com${authorLinkMatch[1]}`;
      }
      return authorLinkMatch[1];
    }
    
    // Try alternate author link format
    const altAuthorLinkMatch = html.match(/<span[^>]*itemprop=['"]author['"][^>]*>[\s\S]*?<a[^>]*href="([^"]+)"[^>]*>/i);
    if (altAuthorLinkMatch && altAuthorLinkMatch[1]) {
      // Make absolute URL if it's relative
      if (altAuthorLinkMatch[1].startsWith('/')) {
        return `https://www.goodreads.com${altAuthorLinkMatch[1]}`;
      }
      return altAuthorLinkMatch[1];
    }
    
    return undefined;
  }

  /**
   * Extract the published date from the HTML content
   * @param {string} html The HTML content
   * @returns {string|undefined} The extracted published date
   */
  private extractPublishedDate(html: string): string | undefined {
    // Try to find published date in the details section using careful regex for full dates
    const publishedMatch = html.match(/Published[\s\n]*(?:.*?)?\b([A-Z][a-z]+\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4})\b/i) ||
                          html.match(/Published[\s\n]*(?:.*?)?\b((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4})\b/i);
    
    if (publishedMatch && publishedMatch[1]) {
      // Ensure month names are properly capitalized
      let date = publishedMatch[1];
      const monthMatch = date.match(/^([a-z]+)/i);
      if (monthMatch && monthMatch[1]) {
        const month = monthMatch[1];
        const properMonth = month.charAt(0).toUpperCase() + month.slice(1).toLowerCase();
        date = date.replace(month, properMonth);
      }
      return date.trim();
    }
    
    // Try to find abbreviated month format
    const abbrMonthMatch = html.match(/Published[\s\n]*(?:.*?)?\b([A-Z][a-z]{2}\s+\d{1,2},?\s+\d{4})\b/i);
    if (abbrMonthMatch && abbrMonthMatch[1]) {
      return abbrMonthMatch[1].trim();
    }
    
    // Try to find year only
    const yearMatch = html.match(/Published[\s\n]*(?:.*?)?\b(\d{4})\b/i);
    if (yearMatch && yearMatch[1]) {
      return yearMatch[1].trim();
    }
    
    return undefined;
  }

  /**
   * Extract the cover image from the HTML content
   * @param {string} html The HTML content
   * @returns {string|undefined} The extracted cover image URL
   */
  private extractCoverImage(html: string): string | undefined {
    // Try og:image meta tag first (most reliable)
    const ogImageMatch = html.match(/<meta[^>]+property=['"]og:image['"][^>]+content=['"]([^'"]+)['"]/i);
    if (ogImageMatch && ogImageMatch[1]) {
      return ogImageMatch[1];
    }
    
    // Try Goodreads book cover image
    const coverImgMatch = html.match(/<img[^>]*id=['"]coverImage['"][^>]*src=['"]([^'"]+)['"]/i);
    if (coverImgMatch && coverImgMatch[1]) {
      return coverImgMatch[1];
    }
    
    // Try alternate cover image
    const altCoverMatch = html.match(/<div[^>]*class="[^"]*bookCover[^"]*"[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"[^>]*>/i);
    if (altCoverMatch && altCoverMatch[1]) {
      return altCoverMatch[1];
    }
    
    return undefined;
  }

  /**
   * Extract the ISBN from the HTML content
   * @param {string} html The HTML content
   * @returns {string|undefined} The extracted ISBN
   */
  extractISBN(html: string): string | undefined {
    // Try to find ISBN-13
    const isbn13Match = html.match(/ISBN13: <[^>]+>([0-9-]+)</i) || 
                       html.match(/ISBN.*?([0-9]{3}[-\s][0-9]{10})/i);
    if (isbn13Match && isbn13Match[1]) {
      return isbn13Match[1].trim();
    }
    
    // Try to find ISBN-10
    const isbn10Match = html.match(/ISBN: <[^>]+>([0-9X-]+)</i) ||
                       html.match(/ISBN.*?([0-9]{9}[0-9X])/i);
    if (isbn10Match && isbn10Match[1]) {
      return isbn10Match[1].trim();
    }
    
    // Try to find any ISBN in the text
    const genericIsbnMatch = html.match(/ISBN:?\s*([0-9-X]{10,17})/i);
    if (genericIsbnMatch && genericIsbnMatch[1]) {
      return genericIsbnMatch[1].trim();
    }
    
    return undefined;
  }

  /**
   * Extract the number of pages from the HTML content
   * @param {string} html The HTML content
   * @returns {string|undefined} The extracted page count
   */
  extractPages(html: string): string | undefined {
    // Try to find page count
    const pagesMatch = html.match(/([0-9,]+)\s*pages/i) || 
                      html.match(/([0-9,]+)\s*p(age|g|ages)/i);
    if (pagesMatch && pagesMatch[1]) {
      return pagesMatch[1].trim();
    }
    
    return undefined;
  }

  /**
   * Extract the rating from the HTML content
   * @param {string} html The HTML content
   * @returns {string|undefined} The extracted rating
   */
  extractRating(html: string): string | undefined {
    // Try to find average rating
    const ratingMatch = html.match(/Average rating\s*([0-9.]+)/i) ||
                       html.match(/class="average"[^>]*>([0-9.]+)/i) ||
                       html.match(/itemprop="ratingValue"[^>]*>([0-9.]+)/i);
    if (ratingMatch && ratingMatch[1]) {
      return ratingMatch[1].trim();
    }
    
    return undefined;
  }

  /**
   * Extract the main content from the HTML
   * @param {string} html The HTML content
   * @returns {string} The extracted main content
   */
  private extractMainContent(html: string): string {
    // First try to find the description/summary content
    let content = '';
    
    // Try to find the book description
    const descriptionMatch = html.match(/<div[^>]*id=['"]description['"][^>]*>[\s\S]*?<span[^>]*>([^<]+(?:<[^>]+>[^<]+)*)<\/span>/i) ||
                            html.match(/<div[^>]*class="readable stacked"[^>]*>([\s\S]*?)<\/div>/i);
    if (descriptionMatch && descriptionMatch[1]) {
      content += this.cleanHtml(descriptionMatch[1]) + '\n\n';
    }
    
    // Try to add book details
    const detailsMatch = html.match(/<div[^>]*class="[^"]*book_details[^"]*"[^>]*>([\s\S]*?)<\/div>/i) ||
                        html.match(/<div[^>]*class="[^"]*infoBoxRowItem[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
    if (detailsMatch && detailsMatch[1]) {
      content += this.cleanHtml(detailsMatch[1]) + '\n\n';
    }
    
    // Try to add any available book information
    const infoMatch = html.match(/<div[^>]*id=['"]details['"][^>]*>([\s\S]*?)<\/div>/i) ||
                     html.match(/<div[^>]*id=['"]bookDataBox['"][^>]*>([\s\S]*?)<\/div>/i);
    if (infoMatch && infoMatch[1]) {
      content += this.cleanHtml(infoMatch[1]) + '\n\n';
    }
    
    // If we still have no content, try to get any text from the page
    if (content.trim().length === 0) {
      // Try to find content in main section
      const mainMatch = html.match(/<div[^>]*class="[^"]*mainContentContainer[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
      if (mainMatch && mainMatch[1]) {
        content = this.cleanHtml(mainMatch[1]);
      } else {
        // If all else fails, try to get all paragraphs as a fallback
        const paragraphs = html.match(/<p[^>]*>[\s\S]*?<\/p>/ig);
        if (paragraphs && paragraphs.length > 0) {
          content = this.cleanHtml(paragraphs.join(' '));
        }
      }
    }
    
    if (content.trim().length === 0) {
      throw new Error("Could not extract content from Goodreads book page");
    }
    
    return content;
  }

  /**
   * Clean HTML content by removing tags, scripts, and excess whitespace
   * @param {string} html The HTML content to clean
   * @returns {string} Clean text content
   */
  private cleanHtml(html: string): string {
    // Remove scripts and style tags first
    let cleanedContent = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, '');
    
    // Remove all HTML tags
    cleanedContent = cleanedContent.replace(/<[^>]*>/g, ' ');
    
    // Decode HTML entities
    cleanedContent = cleanedContent.replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
    
    // Normalize whitespace
    cleanedContent = cleanedContent.replace(/\s+/g, ' ').trim();
    
    return cleanedContent;
  }

  /**
   * Generates the LLM prompt for Goodreads book analysis by inserting
   * the book content into the template.
   * 
   * @param {GoodreadsBookData} metadata - The book metadata including content
   * @returns {string} The complete prompt to send to the LLM
   */
  getPrompt(metadata: any): string {
    const logger = getLogger();
    const data = metadata as GoodreadsBookData;
    
    // Verify we have the needed data
    if (!data.content || data.content.length === 0) {
      logger.error("GoodreadsHandler.getPrompt: No content found in metadata", data);
      throw new Error("No content available for this book.");
    }
    
    if (!data.title) {
      logger.warn("GoodreadsHandler.getPrompt: No title found in metadata, using placeholder");
      data.title = "Untitled Book";
    }
    
    if (!data.author) {
      logger.warn("GoodreadsHandler.getPrompt: No author found in metadata, using placeholder");
      data.author = "Unknown Author";
    }
    
    // Create the prompt with content inserted
    let prompt = GoodreadsHandler.GOODREADS_PROMPT_TEMPLATE;
    prompt = prompt.replace("{{title}}", data.title);
    prompt = prompt.replace("{{author}}", data.author);
    prompt = prompt.replace("{{content}}", data.content);
    
    return prompt;
  }

  /**
   * Parses the LLM's response into a structured GoodreadsLLMOutput object.
   * 
   * @param {string} markdown - The raw response from the LLM
   * @returns {GoodreadsLLMOutput} The parsed structured output
   */
  parseLLMResponse(markdown: string): GoodreadsLLMOutput {
    const logger = getLogger();
    logger.debugLog("Parsing LLM response for Goodreads book");
    
    try {
      // Try to extract JSON from the response
      const jsonMatch = markdown.match(/```(?:json)?\s*({[\s\S]*?})\s*```/) || 
                       markdown.match(/{[\s\S]*"summary"[\s\S]*"themes"[\s\S]*"highlights"[\s\S]*"key_concepts"[\s\S]*}/);
      
      if (jsonMatch && jsonMatch[1]) {
        const parsedResponse = JSON.parse(jsonMatch[1]);
        
        // Validate the structure
        if (typeof parsedResponse.summary !== 'string' || 
            !Array.isArray(parsedResponse.themes) || 
            !Array.isArray(parsedResponse.highlights) || 
            !Array.isArray(parsedResponse.key_concepts)) {
          logger.warn("Invalid JSON structure in LLM response, falling back to manual extraction", parsedResponse);
          return this.manuallyExtractSections(markdown);
        }
        
        return parsedResponse as GoodreadsLLMOutput;
      } else {
        logger.warn("Could not find JSON in LLM response, falling back to manual extraction");
        return this.manuallyExtractSections(markdown);
      }
    } catch (error) {
      logger.warn(`Error parsing LLM JSON response: ${error}, falling back to manual extraction`);
      return this.manuallyExtractSections(markdown);
    }
  }

  /**
   * Manually extracts summary, themes, highlights and key concepts from markdown text
   * Used as a fallback when JSON parsing fails
   * 
   * @param {string} markdown The markdown text to parse
   * @returns {GoodreadsLLMOutput} The extracted sections
   */
  private manuallyExtractSections(markdown: string): GoodreadsLLMOutput {
    const logger = getLogger();
    logger.debugLog("Manually extracting sections from markdown response");
    
    // Helper to extract content between headings
    function extractSection(heading: string): string {
      const pattern = new RegExp(`## ${heading}\\s*([\\s\\S]*?)(?=## |$)`, 'i');
      const match = markdown.match(pattern);
      return match ? match[1].trim() : '';
    }
    
    // Extract list items from a section
    function extractListItems(section: string): string[] {
      if (!section) return [];
      
      const items: string[] = [];
      const lines = section.split('\n');
      
      for (const line of lines) {
        // Match lines starting with -, *, or numbers followed by a period or parenthesis
        const match = line.match(/^\s*(?:[-*•]|\d+[).:])\s+(.*)/);
        if (match && match[1].trim()) {
          items.push(match[1].trim());
        }
      }
      
      return items;
    }
    
    // Extract different sections
    const summarySection = extractSection('Summary') || 
                          markdown.match(/summary[:\s]+(.*?)(?=\n\n|\n##|$)/is)?.[1]?.trim() || '';
    
    const themesSection = extractSection('Themes') || 
                         extractSection('Key themes');
    
    const highlightsSection = extractSection('Highlights') || 
                             extractSection('Key highlights');
    
    const conceptsSection = extractSection('Key concepts') || 
                           extractSection('Main concepts');
    
    const output: GoodreadsLLMOutput = {
      summary: summarySection,
      themes: extractListItems(themesSection),
      highlights: extractListItems(highlightsSection),
      key_concepts: extractListItems(conceptsSection)
    };
    
    this.validateLLMOutput(output);
    return output;
  }

  /**
   * Validates the structure and content of a GoodreadsLLMOutput object.
   * 
   * @param {LLMOutput} output - The LLM output to validate
   * @returns {true} - Returns true if valid, throws error if invalid
   * @throws {Error} If the output format doesn't match expectations
   */
  validateLLMOutput(output: LLMOutput): true {
    const logger = getLogger();
    const goodreadsOutput = output as GoodreadsLLMOutput;
    
    // Add logging to help with debugging
    logger.debugLog("Validating Goodreads LLM output", { 
      hasSummary: Boolean(goodreadsOutput?.summary), 
      themesLength: goodreadsOutput?.themes?.length,
      highlightsLength: goodreadsOutput?.highlights?.length,
      keyConceptsLength: goodreadsOutput?.key_concepts?.length
    });
    
    if (!goodreadsOutput || typeof goodreadsOutput !== 'object') {
      throw new Error('GoodreadsLLMOutput is missing or not an object.');
    }
    
    // Summary validation
    if (typeof goodreadsOutput.summary !== 'string' || goodreadsOutput.summary.trim() === '') {
      logger.warn('GoodreadsLLMOutput.summary is missing or empty. Creating placeholder.');
      goodreadsOutput.summary = "No summary provided by the LLM.";
    }
    
    // Themes validation
    if (!Array.isArray(goodreadsOutput.themes)) {
      logger.warn('GoodreadsLLMOutput.themes is not an array. Creating empty array.');
      goodreadsOutput.themes = [];
    }
    
    if (goodreadsOutput.themes.length === 0) {
      // Try to extract some themes from the summary
      const words = goodreadsOutput.summary.split(' ');
      const potentialThemes = words.filter(word => 
        word.length > 4 && 
        word.charAt(0) === word.charAt(0).toUpperCase() && 
        !word.match(/^(This|That|These|Those|Their|There|They|When|Where|What|Why|How|And|The|But|For|With)$/i)
      );
      
      if (potentialThemes.length > 0) {
        goodreadsOutput.themes = potentialThemes.slice(0, 3).map(theme => theme.replace(/[,.;:"]/, ''));
        logger.warn('GoodreadsLLMOutput.themes was empty. Auto-generated from summary.');
      } else {
        goodreadsOutput.themes = ["Literature"];
      }
    }
    
    // Highlights validation
    if (!Array.isArray(goodreadsOutput.highlights)) {
      logger.warn('GoodreadsLLMOutput.highlights is not an array. Creating empty array.');
      goodreadsOutput.highlights = [];
    }
    
    if (goodreadsOutput.highlights.length === 0) {
      // Generate a highlight from the summary if none exists
      const sentences = goodreadsOutput.summary.split(/[.!?]+/);
      if (sentences.length > 0 && sentences[0].trim()) {
        goodreadsOutput.highlights = [sentences[0].trim() + '.'];
        logger.warn('GoodreadsLLMOutput.highlights was empty. Auto-generated from summary.');
      } else {
        goodreadsOutput.highlights = ["No highlights available."];
      }
    }
    
    // Key concepts validation
    if (!Array.isArray(goodreadsOutput.key_concepts)) {
      logger.warn('GoodreadsLLMOutput.key_concepts is not an array. Creating empty array.');
      goodreadsOutput.key_concepts = [];
    }
    
    if (goodreadsOutput.key_concepts.length === 0) {
      goodreadsOutput.key_concepts = ["No key concepts available."];
      logger.warn('GoodreadsLLMOutput.key_concepts was empty. Added placeholder.');
    }
    
    logger.debugLog("Goodreads LLM output validated successfully");
    return true;
  }

  /**
   * Returns the folder name for Goodreads notes.
   * Used by the orchestrator to determine where to save notes.
   * 
   * @returns {string} The folder name for Goodreads content
   */
  getFolderName(): string {
    return "Books";
  }

  /**
   * Generates the final note content to be written to the file.
   * Combines metadata and LLM-processed content into a well-formatted note.
   * 
   * @param {string} markdown - The processed markdown content from the LLM
   * @param {GoodreadsBookData} metadata - The book metadata
   * @returns {string} The complete note content
   */
  getNoteContent(markdown: string, metadata: GoodreadsBookData): string {
    const logger = getLogger();
    logger.debugLog("Generating final note content for Goodreads book", {
      title: metadata.title,
      hasAuthor: Boolean(metadata.author),
      hasPublishedDate: Boolean(metadata.published_date),
      hasCoverImage: Boolean(metadata.cover_image)
    });
    
    try {
      // Parse the LLM output to get structured content
      const parsedContent = this.parseLLMResponse(markdown);
      
      // Construct the note content following the Goodreads template
      const noteContent = [
        `# ${metadata.title}`,
        '',
        `Author: [${metadata.author}](${metadata.author_url || ''})`,  
        `🔗 [View on Goodreads](${metadata.book_url})`,
      ];
      
      // Add optional metadata
      if (metadata.published_date) {
        noteContent.push(`📅 Published: ${metadata.published_date}`);
      }
      
      noteContent.push('');
      
      // Add cover image if available
      if (metadata.cover_image) {
        noteContent.push(`![Cover](${metadata.cover_image})`);
        noteContent.push('');
      }
      
      // Add summary
      noteContent.push('## Summary');
      noteContent.push(parsedContent.summary);
      noteContent.push('');
      
      // Add themes
      noteContent.push('## Themes');
      parsedContent.themes.forEach(theme => {
        noteContent.push(`- ${theme}`);
      });
      noteContent.push('');
      
      // Add highlights
      noteContent.push('## Key Highlights');
      parsedContent.highlights.forEach(highlight => {
        noteContent.push(`- ${highlight}`);
      });
      noteContent.push('');
      
      // Add key concepts with double brackets for Obsidian links
      noteContent.push('## Key Concepts');
      parsedContent.key_concepts.forEach(concept => {
        // Wrap the concept name in double brackets for Obsidian links
        const conceptWithLink = concept.includes(':') 
          ? `- [[${concept.split(':')[0].trim()}]]: ${concept.split(':').slice(1).join(':').trim()}`
          : `- [[${concept}]]`;
        noteContent.push(conceptWithLink);
      });
      noteContent.push('');
      
      // Add additional metadata
      noteContent.push('## Metadata');
      if (metadata.isbn) {
        noteContent.push(`- ISBN: ${metadata.isbn}`);
      }
      if (metadata.pages) {
        noteContent.push(`- Pages: ${metadata.pages}`);
      }
      if (metadata.rating) {
        noteContent.push(`- Rating: ${metadata.rating}`);
      }
      
      return noteContent.join('\n');
    } catch (error) {
      logger.error(`Error generating note content: ${error}`);
      
      // Create a simplified note as fallback
      return [
        `# ${metadata.title}`,
        '',
        `Author: ${metadata.author}`,
        `🔗 [View on Goodreads](${metadata.book_url})`,
        '',
        '> Error processing book content. Please try importing again.',
        '',
        '## Metadata',
        metadata.isbn ? `- ISBN: ${metadata.isbn}` : '',
        metadata.pages ? `- Pages: ${metadata.pages}` : '',
        metadata.rating ? `- Rating: ${metadata.rating}` : '',
        metadata.published_date ? `- Published: ${metadata.published_date}` : ''
      ].filter(line => line !== '').join('\n');
    }
  }
}