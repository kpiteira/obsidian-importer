// filepath: /Users/karl/Documents/dev/obsidian-importer/src/handlers/MediumHandler.ts
import { requestUrl } from "obsidian";
import { ContentMetadata, ContentTypeHandler } from "./ContentTypeHandler";
import { fetchWebPageContent } from "../utils/webFetcher";
import { LLMOutput } from "../services/LLMProvider";
import { getLogger } from "../utils/importerLogger";

/**
 * Structure for Medium article LLM responses
 * @interface MediumLLMOutput
 * @extends {LLMOutput}
 */
export interface MediumLLMOutput extends LLMOutput {
  summary: string;
  highlights: string[];
  topics: string[];
}

/**
 * Interface representing Medium article metadata and content
 * @interface MediumArticleData
 * @extends {ContentMetadata}
 */
export interface MediumArticleData extends ContentMetadata {
  title: string;
  author: string;
  publishedDate?: string;
  readingTime?: string;
  url: string;
  content: string;
}

/**
 * Handler for Medium article content, implementing the ContentTypeHandler interface.
 * This handler is responsible for detecting Medium URLs, downloading article content,
 * generating LLM prompts for article summarization, and parsing LLM markdown responses.
 * 
 * @class MediumHandler
 * @implements {ContentTypeHandler}
 */
export class MediumHandler implements ContentTypeHandler {
  /** @type {string} Type identifier for this content handler */
  public readonly type = "medium";

  /**
   * The Medium-specific prompt template for LLM summarization.
   * 
   * @private
   * @static
   * @type {string}
   */
  private static readonly MEDIUM_PROMPT_TEMPLATE = `
You are reading a Medium article titled "{{title}}" by {{author}}.
Please analyze this article and provide:
1. A concise summary of the main points (3-4 sentences)
2. 3-5 key highlights or quotes from the article
3. A list of key topics or concepts discussed

Article content:
{{content}}

Format your response in JSON format with the following structure:
{
  "summary": "The summary text...",
  "highlights": ["Highlight 1", "Highlight 2", ...],
  "topics": ["Topic 1", "Topic 2", ...]
}
`;

  /**
   * Determines if this handler can process the given URL.
   * Checks if the hostname matches known Medium domains.
   * 
   * @param {URL} url - The URL to check
   * @returns {boolean} True if this handler can process the URL
   */
  detect(url: URL): boolean {
    const host = url.hostname.toLowerCase();
    return (
      host === "medium.com" ||
      host.endsWith(".medium.com")
    );
  }

  /**
   * Enhanced URL-based detection for ContentTypeRegistry.
   * For Medium, this simply uses the synchronous detect method
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
   * Medium URLs can be identified by URL pattern alone, so no content-based
   * detection is required.
   * 
   * @returns {boolean} False as Medium detection is URL-based only
   */
  requiresContentDetection(): boolean {
    return false;
  }

  /**
   * Lists API keys required by this handler. Medium API doesn't require keys.
   * @returns Empty array as no API keys are required
   */
  getRequiredApiKeys(): string[] {
    return [];
  }

  /**
   * Downloads the Medium article content and extracts metadata.
   * 
   * @param {string} url The Medium article URL
   * @returns {Promise<{unifiedContent: MediumArticleData}>} The unified content object
   * @throws {Error} If article content can't be fetched
   */
  async download(url: string, cachedContent?: string): Promise<{ unifiedContent: MediumArticleData }> {
    const logger = getLogger();
    logger.debugLog(`Downloading Medium article from ${url}`);
    
    try {
      // Use cached content if available, otherwise fetch new content
      let html = cachedContent;
      if (!html) {
        html = await fetchWebPageContent(url);
      }
      
      // Extract metadata from the HTML
      const title = this.extractTitle(html);
      const author = this.extractAuthor(html);
      const publishedDate = this.extractPublishedDate(html);
      const readingTime = this.extractReadingTime(html);
      const content = this.extractMainContent(html);
      
      if (!title || !content) {
        throw new Error("Failed to extract required content from Medium article");
      }
      
      const unifiedContent: MediumArticleData = {
        title,
        author: author || "Unknown Author",
        publishedDate,
        readingTime,
        url,
        content
      };
      
      logger.debugLog(`Successfully extracted Medium article: ${title}`);
      return { unifiedContent };
    } catch (error) {
      logger.error(`Error downloading Medium article: ${error}`);
      throw new Error(`Failed to download Medium article: ${error}`);
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
    
    // Fallback to title tag
    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    if (titleMatch && titleMatch[1]) {
      return titleMatch[1].replace(" – Medium", "").trim();
    }
    
    // Last resort, look for h1 tags
    const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
    if (h1Match && h1Match[1]) {
      return h1Match[1].trim();
    }
    
    return "Untitled Medium Article";
  }

  /**
   * Extract the author from the HTML content
   * @param {string} html The HTML content
   * @returns {string} The extracted author name
   */
  private extractAuthor(html: string): string {
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
    
    // Look for author in the HTML structure (common Medium pattern)
    const htmlAuthorMatch = html.match(/class="[^"]*author[^"]*"[^>]*>([^<]+)</i);
    if (htmlAuthorMatch && htmlAuthorMatch[1]) {
      return htmlAuthorMatch[1].trim();
    }
    
    return "Unknown Author";
  }

  /**
   * Extract the published date from the HTML content
   * @param {string} html The HTML content
   * @returns {string|undefined} The extracted published date
   */
  private extractPublishedDate(html: string): string | undefined {
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
        // If date parsing fails, return the raw string
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
   * Extract the reading time from the HTML content
   * @param {string} html The HTML content
   * @returns {string|undefined} The extracted reading time
   */
  private extractReadingTime(html: string): string | undefined {
    // Medium typically includes reading time in the article
    const readTimeMatch = html.match(/(\d+)\s+min(?:ute)?s?\s+read/i);
    if (readTimeMatch && readTimeMatch[1]) {
      return `${readTimeMatch[1]} min read`;
    }
    
    return undefined;
  }

  /**
   * Extract the main content from the HTML
   * @param {string} html The HTML content
   * @returns {string} The extracted main content
   */
  private extractMainContent(html: string): string {
    // First try to find the content in the article element
    const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
    if (articleMatch && articleMatch[1]) {
      return this.cleanHtml(articleMatch[1]);
    }
    
    // Try to find content in main section
    const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
    if (mainMatch && mainMatch[1]) {
      return this.cleanHtml(mainMatch[1]);
    }
    
    // Look for div with content class
    const contentDivMatch = html.match(/<div[^>]+class="[^"]*(?:content|article-content)[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
    if (contentDivMatch && contentDivMatch[1]) {
      return this.cleanHtml(contentDivMatch[1]);
    }
    
    // If all else fails, try to get all paragraphs as a fallback
    const paragraphs = html.match(/<p[^>]*>[\s\S]*?<\/p>/ig);
    if (paragraphs && paragraphs.length > 0) {
      return this.cleanHtml(paragraphs.join(' '));
    }
    
    throw new Error("Could not extract content from Medium article");
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
   * Generates the LLM prompt for Medium article analysis by inserting
   * the article content into the template.
   * 
   * @param {MediumArticleData} metadata - The article metadata including content
   * @returns {string} The complete prompt to send to the LLM
   */
  getPrompt(metadata: any): string {
    const logger = getLogger();
    const data = metadata as MediumArticleData;
    
    // Verify we have the needed data
    if (!data.content || data.content.length === 0) {
      logger.error("MediumHandler.getPrompt: No content found in metadata", data);
      throw new Error("No content available for this article.");
    }
    
    if (!data.title) {
      logger.warn("MediumHandler.getPrompt: No title found in metadata, using placeholder");
      data.title = "Untitled Medium Article";
    }
    
    if (!data.author) {
      logger.warn("MediumHandler.getPrompt: No author found in metadata, using placeholder");
      data.author = "Unknown Author";
    }
    
    // Create the prompt with content inserted
    let prompt = MediumHandler.MEDIUM_PROMPT_TEMPLATE;
    prompt = prompt.replace("{{title}}", data.title);
    prompt = prompt.replace("{{author}}", data.author);
    prompt = prompt.replace("{{content}}", data.content);
    
    return prompt;
  }

  /**
   * Parses the LLM's response into a structured MediumLLMOutput object.
   * 
   * @param {string} markdown - The raw response from the LLM
   * @returns {MediumLLMOutput} The parsed structured output
   */
  parseLLMResponse(markdown: string): MediumLLMOutput {
    const logger = getLogger();
    logger.debugLog("Parsing LLM response for Medium article");
    
    try {
      // Try to extract JSON from the response
      const jsonMatch = markdown.match(/```(?:json)?\s*({[\s\S]*?})\s*```/) || 
                       markdown.match(/{[\s\S]*"summary"[\s\S]*"highlights"[\s\S]*"topics"[\s\S]*}/);
      
      if (jsonMatch && jsonMatch[1]) {
        const parsedResponse = JSON.parse(jsonMatch[1]);
        
        // Validate the structure
        if (typeof parsedResponse.summary !== 'string' || 
            !Array.isArray(parsedResponse.highlights) || 
            !Array.isArray(parsedResponse.topics)) {
          throw new Error("Invalid JSON structure in LLM response");
        }
        
        logger.debugLog("Successfully parsed JSON response from LLM");
        return parsedResponse as MediumLLMOutput;
      }
      
      // Fallback: manually extract sections if JSON parsing failed
      logger.warn("Failed to parse JSON response, falling back to manual extraction");
      return this.manuallyExtractSections(markdown);
    } catch (error) {
      logger.error(`Error parsing LLM response: ${error}`);
      // Fallback to manual extraction
      return this.manuallyExtractSections(markdown);
    }
  }

  /**
   * Manually extracts summary, highlights, and topics from markdown text
   * Used as a fallback when JSON parsing fails
   * 
   * @param {string} markdown The markdown text to parse
   * @returns {MediumLLMOutput} The extracted sections
   */
  private manuallyExtractSections(markdown: string): MediumLLMOutput {
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
    
    const highlightsSection = extractSection('Highlights') || 
                             extractSection('Key highlights') ||
                             extractSection('Key quotes');
    
    const topicsSection = extractSection('Key Topics') || 
                         extractSection('Topics') || 
                         extractSection('Concepts');
    
    const output: MediumLLMOutput = {
      summary: summarySection,
      highlights: extractListItems(highlightsSection),
      topics: extractListItems(topicsSection)
    };
    
    this.validateLLMOutput(output);
    return output;
  }

  /**
   * Validates the structure and content of a MediumLLMOutput object.
   * 
   * @param {LLMOutput} output - The LLM output to validate
   * @returns {true} - Returns true if valid, throws error if invalid
   * @throws {Error} If the output format doesn't match expectations
   */
  validateLLMOutput(output: LLMOutput): true {
    const logger = getLogger();
    const mediumOutput = output as MediumLLMOutput;
    
    // Add logging to help with debugging
    logger.debugLog("Validating Medium LLM output", { 
      hasSummary: Boolean(mediumOutput?.summary), 
      highlightsLength: mediumOutput?.highlights?.length,
      topicsLength: mediumOutput?.topics?.length
    });
    
    if (!mediumOutput || typeof mediumOutput !== 'object') {
      throw new Error('MediumLLMOutput is missing or not an object.');
    }
    
    // Summary validation
    if (typeof mediumOutput.summary !== 'string' || mediumOutput.summary.trim() === '') {
      logger.warn('MediumLLMOutput.summary is missing or empty. Creating placeholder.');
      mediumOutput.summary = "No summary provided by the LLM.";
    }
    
    // Highlights validation - more lenient
    if (!Array.isArray(mediumOutput.highlights)) {
      logger.warn('MediumLLMOutput.highlights is not an array. Creating empty array.');
      mediumOutput.highlights = [];
    }
    
    if (mediumOutput.highlights.length === 0) {
      // Generate a highlight from the summary if none exists
      const sentences = mediumOutput.summary.split(/[.!?]+/);
      if (sentences.length > 0 && sentences[0].trim()) {
        mediumOutput.highlights = [sentences[0].trim() + '.'];
        logger.warn('MediumLLMOutput.highlights was empty. Auto-generated from summary.');
      } else {
        mediumOutput.highlights = ["No highlights available."];
      }
    }
    
    // Topics validation
    if (!Array.isArray(mediumOutput.topics)) {
      logger.warn('MediumLLMOutput.topics is not an array. Creating empty array.');
      mediumOutput.topics = [];
    }
    
    if (mediumOutput.topics.length === 0) {
      // Try to extract some topics from the summary
      const words = mediumOutput.summary.split(' ');
      const potentialTopics = words.filter(word => 
        word.length > 4 && 
        word.charAt(0) === word.charAt(0).toUpperCase() && 
        !word.match(/^(This|That|These|Those|Their|There|They|When|Where|What|Why|How|And|The|But|For|With)$/i)
      );
      
      if (potentialTopics.length > 0) {
        mediumOutput.topics = potentialTopics.slice(0, 3).map(topic => topic.replace(/[,.;:"]/, ''));
        logger.warn('MediumLLMOutput.topics was empty. Auto-generated from summary.');
      } else {
        mediumOutput.topics = ["Medium article"];
      }
    }
    
    logger.debugLog("Medium LLM output validated successfully");
    return true;
  }

  /**
   * Returns the folder name for Medium notes.
   * Used by the orchestrator to determine where to save notes.
   * 
   * @returns {string} The folder name for Medium content
   */
  getFolderName(): string {
    return "Medium";
  }

  /**
   * Generates the final note content to be written to the file.
   * Combines metadata and LLM-processed content into a well-formatted note.
   * 
   * @param {string} markdown - The processed markdown content from the LLM
   * @param {MediumArticleData} metadata - The article metadata
   * @returns {string} The complete note content
   */
  getNoteContent(markdown: string, metadata: MediumArticleData): string {
    const logger = getLogger();
    logger.debugLog("Generating final note content for Medium article");
    
    try {
      // Parse the LLM response for structured data
      const parsedContent = this.parseLLMResponse(markdown);
      
      // Generate the note according to the template specification
      const noteContent = [
        `# ${metadata.title}`,
        '',
        `Author: ${metadata.author}  🔗 [Read on Medium](${metadata.url})`,
        '',
        '## Summary',
        parsedContent.summary,
        '',
        '## Highlights',
        ...parsedContent.highlights.map(highlight => `- ${highlight}`),
        '',
        '## Key Topics',
        ...parsedContent.topics.map(topic => `- ${topic}`),
        '',
        '## Metadata'
      ];
      
      // Add optional metadata if available
      if (metadata.publishedDate) {
        noteContent.push(`- Published: ${metadata.publishedDate}`);
      }
      
      if (metadata.readingTime) {
        noteContent.push(`- Read time: ${metadata.readingTime}`);
      }
      
      return noteContent.join('\n');
    } catch (error) {
      logger.error(`Error formatting note content: ${error}`);
      throw new Error(`Failed to format note content: ${error}`);
    }
  }
}