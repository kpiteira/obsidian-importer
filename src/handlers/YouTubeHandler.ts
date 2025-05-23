import { extractYouTubeVideoId, generateYouTubeEmbedHtml } from "../utils/youtube";
import { ContentTypeHandler } from "./ContentTypeHandler";
import { requestUrl, RequestUrlResponse } from "obsidian";
import { extractTranscriptFromHtml } from "../services/YouTubeTranscriptService";
import { LLMOutput } from "../services/LLMProvider";
import { ContentMetadata } from '../handlers/ContentTypeHandler';
import { getLogger } from "../utils/importerLogger";

/**
 * Structured output for YouTube LLM responses, extending the base LLMOutput.
 * @interface YouTubeLLMOutput
 * @extends {LLMOutput}
 * @property {string} summary - A concise summary of the video content
 * @property {string[]} keyPoints - Array of key points extracted from the video
 * @property {string[]} keyConcepts - Array of important concepts or technical terms mentioned
 */
export interface YouTubeLLMOutput extends LLMOutput {
  summary: string;
  keyPoints: string[];
  keyConcepts: string[];
}

/**
 * Interface representing YouTube video metadata as returned by the oEmbed API,
 * with additional fields for internal processing.
 * 
 * @interface YouTubeVideoData
 * @extends {ContentMetadata}
 * @property {string} videoId - The YouTube video ID
 * @property {string} author - The channel name
 * @property {string} authorUrl - URL to the YouTube channel
 * @property {string} thumbnailUrl - URL to the video thumbnail
 * @property {number} thumbnailWidth - Width of the thumbnail image
 * @property {number} thumbnailHeight - Height of the thumbnail image
 * @property {string} providerName - Name of the content provider (always "YouTube")
 * @property {string} providerUrl - URL to the provider (always YouTube's URL)
 * @property {string} html - HTML embed code for the video
 * @property {number} width - Width of the embedded player
 * @property {number} height - Height of the embedded player
 * @property {string} [transcript] - Optional transcript text of the video
 */
export interface YouTubeVideoData extends ContentMetadata {
  videoId: string;
  author: string;
  authorUrl: string;
  thumbnailUrl: string;
  thumbnailWidth: number;
  thumbnailHeight: number;
  providerName: string;
  providerUrl: string;
  html: string;
  width: number;
  height: number;
  transcript?: string;
}

/**
 * Handler for YouTube video content, implementing the ContentTypeHandler interface.
 * This handler is responsible for detecting YouTube URLs, downloading video transcripts,
 * generating LLM prompts for video summarization, and parsing LLM markdown responses.
 * All YouTube-specific prompt and parsing logic is fully self-contained within this class,
 * in compliance with the strategy-based architecture.
 * 
 * @class YouTubeHandler
 * @implements {ContentTypeHandler}
 */
export class YouTubeHandler implements ContentTypeHandler {
  /** @type {string} Type identifier for this content handler */
  public readonly type = "youtube";

  /**
   * The YouTube-specific prompt template for LLM summarization.
   * This template instructs the LLM to generate a comprehensive summary,
   * key points, technical terms, and conclusion from video transcripts.
   * 
   * @private
   * @static
   * @type {string}
   */
  private static readonly YOUTUBE_PROMPT_TEMPLATE = `
You are a specialized assistant for creating comprehensive video summaries from subtitles. The subtitles have been automatically generated by YouTube and may contain transcription errors, especially with technical terms, software names, and specialized vocabulary.

## Task

Create a concise yet comprehensive summary of the video based on the provided subtitles.

## Handling Transcription Errors

- Correct obvious transcription errors based on context and your domain knowledge
- Pay special attention to technical terms, software names, programming languages, and IDE plugins which are frequently misrecognized
- If multiple interpretations are possible, choose the most likely one based on the video's context

## Output Structure

\`\`\`
## Summary
[Write a comprehensive summary of the main topic and key message]

## Key points
- [Key point 1]
- [Key point 2]
- [Additional key points...]

## Technical terms
- **[[Term 1]]**: [Explanation of term 1]
- **[[Term 2]]**: [Explanation of term 2]
- [Additional terms as needed...]

## Conclusion
[Write a brief conclusion]
\`\`\`

Note: Include all sections. If there are no technical terms, omit that section entirely.

Subtitles: {{transcript}}
`;

  /**
   * Determines if this handler can process the given URL.
   * Checks if the hostname matches known YouTube domains.
   * 
   * @param {URL} url - The URL to check
   * @returns {boolean} True if this handler can process the URL
   */
  detect(url: URL): boolean {
    const host = url.hostname.toLowerCase();
    return (
      host === "youtube.com" ||
      host === "www.youtube.com" ||
      host === "youtu.be" ||
      host === "www.youtu.be"
    );
  }

  /**
   * Enhanced URL-based detection for ContentTypeRegistry.
   * For YouTube, this simply uses the synchronous detect method
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
   * YouTube URLs can be identified by URL pattern alone, so no content-based
   * detection is required.
   * 
   * @returns {boolean} False as YouTube detection is URL-based only
   */
  requiresContentDetection(): boolean {
    return false;
  }

  /**
   * Lists API keys required by this handler. YouTube API doesn't require keys.
   * @returns Empty array as no API keys are required
   */
  getRequiredApiKeys(): string[] {
    return [];
  }

  /**
   * Generates the LLM prompt for YouTube video summarization by inserting
   * the video transcript into the template.
   * 
   * @param {YouTubeVideoData} metadata - The video metadata including transcript
   * @returns {string} The complete prompt to send to the LLM
   */
  getPrompt(metadata: any): string {
    // Get the transcript from metadata and ensure it's a string
    const transcript = metadata?.transcript || "";
    
    // Add logging to debug transcript issues
    const logger = getLogger();
    logger.debugLog(`YouTubeHandler.getPrompt: transcript length is ${transcript.length} characters`);
    
    if (!transcript || transcript.length === 0) {
      logger.error("YouTubeHandler.getPrompt: No transcript found in metadata", metadata);
      throw new Error("No transcript available for this video. Please try another video with captions enabled.");
    }
    
    // Show a preview of the transcript (first 100 chars) for debugging
    const transcriptPreview = transcript.length > 100 ? 
      transcript.substring(0, 100) + '...' : 
      transcript;
    logger.debugLog(`Transcript preview: "${transcriptPreview}"`);
    
    // Create the prompt with the transcript inserted
    const prompt = YouTubeHandler.YOUTUBE_PROMPT_TEMPLATE.replace("{{transcript}}", transcript);
    
    // Verify the transcript was inserted correctly
    if (prompt.includes("{{transcript}}")) {
      logger.error("YouTubeHandler.getPrompt: Transcript placeholder not replaced in prompt");
      throw new Error("Failed to insert transcript into prompt template.");
    }
    
    // Return the prompt with the transcript inserted
    return prompt;
  }

  /**
   * Parses the LLM's markdown response into a structured YouTubeLLMOutput object.
   * Extracts Summary, Key Points, and Technical Terms sections.
   * 
   * @param {string} markdown - The raw markdown response from the LLM
   * @returns {YouTubeLLMOutput} The parsed structured output
   */
  parseLLMResponse(markdown: string): YouTubeLLMOutput {
    /**
     * Helper to extract section content by heading
     * @param {string} heading - The section heading to extract
     * @returns {string} The extracted section content
     */
    function extractSection(heading: string): string {
      const pattern = new RegExp(`^##\\s*${heading}\\s*\\n([\\s\\S]*?)(?=^##\\s|\\Z)`, 'im');
      const match = markdown.match(pattern);
      return match ? match[1].trim() : '';
    }

    /**
     * Helper to parse a Markdown list into array of strings
     * @param {string} section - The markdown section containing list items
     * @returns {string[]} Array of list item text
     */
    function parseList(section: string): string[] {
      if (!section) return [];
      const lines = section.split('\n');
      const items: string[] = [];
      for (const line of lines) {
        const itemMatch = line.match(/^\s*(?:[-*]|\d+\.)\s+(.*)$/);
        if (itemMatch && itemMatch[1].trim()) {
          items.push(itemMatch[1].trim());
        }
      }
      if (items.length === 0 && section.trim()) {
        if (lines.length === 1) {
          items.push(section.trim());
        }
      }
      return items;
    }

    /**
     * Helper to parse technical terms section into array of strings
     * @param {string} section - The markdown section containing technical terms
     * @returns {string[]} Array of parsed technical terms
     */
    function parseTechnicalTermsAsStrings(section: string): string[] {
      if (!section) return [];
      const lines = section.split('\n');
      const terms: string[] = [];
      for (const line of lines) {
        const match = line.match(/^\s*[-*]\s+\*\*\[\[(.+?)\]\]\*\*:\s*(.+)$/);
        if (match) {
          terms.push(`${match[1].trim()}: ${match[2].trim()}`);
        }
      }
      return terms;
    }

    const summarySection = extractSection('Summary');
    const keyPointsSection = extractSection('Key points');
    const technicalTermsSection = extractSection('Technical terms');

    const result: YouTubeLLMOutput = {
      summary: summarySection,
      keyPoints: parseList(keyPointsSection),
      keyConcepts: parseTechnicalTermsAsStrings(technicalTermsSection),
    };
    this.validateLLMOutput(result);
    return result;
  }

  /**
   * Validates the structure and content of a YouTubeLLMOutput object.
   * Now implements a more lenient validation approach for better compatibility
   * with different LLMs like Ollama.
   * 
   * @param {LLMOutput} output - The LLM output to validate
   * @returns {true} - Returns true if valid, throws error if invalid
   * @throws {Error} If the output format doesn't match expectations
   */
  public validateLLMOutput(output: LLMOutput): true {
    const logger = getLogger();
    const ytOutput = output as YouTubeLLMOutput;
    
    // Add logging to help with debugging
    logger.debugLog("Validating LLM output", { 
      hasSummary: Boolean(ytOutput?.summary), 
      keyPointsLength: ytOutput?.keyPoints?.length,
      keyConceptsLength: ytOutput?.keyConcepts?.length
    });
    
    if (!ytOutput || typeof ytOutput !== 'object') {
      throw new Error('YouTubeLLMOutput is missing or not an object.');
    }
    
    // Summary validation
    if (typeof ytOutput.summary !== 'string' || ytOutput.summary.trim() === '') {
      throw new Error('YouTubeLLMOutput.summary must be a non-empty string.');
    }
    
    // Key points validation - more lenient
    if (!Array.isArray(ytOutput.keyPoints)) {
      // If keyPoints is not an array but we have summary, create an empty array
      ytOutput.keyPoints = [];
      logger.warn('YouTubeLLMOutput.keyPoints is not an array. Creating empty array.');
    }
    
    if (ytOutput.keyPoints.length === 0 && ytOutput.summary) {
      // Auto-generate a key point from summary if it's missing
      ytOutput.keyPoints = [ytOutput.summary.split('.')[0] + '.'];
      logger.warn('YouTubeLLMOutput.keyPoints was empty. Auto-generated from summary.');
    }
    
    // Technical concepts validation - much more lenient
    if (!Array.isArray(ytOutput.keyConcepts)) {
      // If keyConcepts is not an array, create an empty array
      ytOutput.keyConcepts = [];
      logger.warn('YouTubeLLMOutput.keyConcepts is not an array. Creating empty array.');
    }
    
    if (ytOutput.keyConcepts.length === 0) {
      // Auto-generate a concept from summary if it's missing
      const words = ytOutput.summary.split(' ');
      for (let i = 0; i < words.length; i++) {
        const word = words[i];
        if (word.length > 5 && !word.match(/^(and|the|that|this|with|from|have|were|there)$/i)) {
          ytOutput.keyConcepts = [`${word}: Term related to the video content`];
          logger.warn(`YouTubeLLMOutput.keyConcepts was empty. Auto-generated using term: ${word}`);
          break;
        }
      }
      
      // If we still couldn't find a good term, use a generic one
      if (ytOutput.keyConcepts.length === 0) {
        ytOutput.keyConcepts = ['Video content: Main topic of the video'];
        logger.warn('YouTubeLLMOutput.keyConcepts was empty. Using generic placeholder.');
      }
    }
    
    logger.debugLog("LLM output validated successfully");
    return true;
  }

  /**
   * Downloads the YouTube transcript and extracts video metadata.
   * Uses the YouTube page HTML to gather metadata and transcript.
   * 
   * @param {string} url The YouTube video URL
   * @returns {Promise<{unifiedContent: YouTubeVideoData}>} The unified content object
   * @throws {Error} If video ID can't be extracted or transcript isn't available
   */
  async download(url: string, cachedContent?: string): Promise<{ unifiedContent: YouTubeVideoData }> {
    const videoId = extractYouTubeVideoId(url);
    if (!videoId) {
      throw new Error("Invalid YouTube URL: cannot extract video ID");
    }

    const videoPageResponse: RequestUrlResponse = await requestUrl({ url: `https://www.youtube.com/watch?v=${videoId}` });
    const html = videoPageResponse.text;

    const transcript = await extractTranscriptFromHtml(html);

    /**
     * Helper function to extract metadata from HTML meta tags
     * @param {string} name - The meta tag name/property to extract
     * @returns {string | undefined} The extracted value or undefined if not found
     */
    function getMeta(name: string): string | undefined {
      const og = html.match(new RegExp(`<meta[^>]+property=[\"']og:${name}[\"'][^>]+content=[\"']([^\"']+)[\"']`, "i"));
      if (og) return og[1];
      const nameTag = html.match(new RegExp(`<meta[^>]+name=[\"']${name}[\"'][^>]+content=[\"']([^\"']+)[\"']`, "i"));
      return nameTag ? nameTag[1] : undefined;
    }

    const AUTHOR_REGEX = /"author":"([^"]+)"/;
    const CHANNEL_ID_REGEX = /"channelId":"([^"]+)"/;

    const title = getMeta("title") || "";
    const author = html.match(AUTHOR_REGEX)?.[1] || getMeta("video:director") || getMeta("site_name") || "";
    const authorUrl = html.match(CHANNEL_ID_REGEX)?.[1] || getMeta("video:director:url") || "";
    const thumbnailUrl = getMeta("image") || "";
    const providerName = getMeta("site_name") || "YouTube";
    const providerUrl = "https://www.youtube.com";
    const htmlEmbed = getMeta("video:url") ? generateYouTubeEmbedHtml(videoId) : "";
    const width = Number.parseInt(getMeta("video:width") || "560");
    const height = Number.parseInt(getMeta("video:height") || "315");

    let thumbnailWidth = 0, thumbnailHeight = 0;
    const thumbDimMatch = html.match(/<meta[^>]+property=[\"']og:image:width[\"'][^>]+content=[\"'](\d+)[\"']/i);
    if (thumbDimMatch) thumbnailWidth = parseInt(thumbDimMatch[1], 10);
    const thumbDimMatchH = html.match(/<meta[^>]+property=[\"']og:image:height[\"'][^>]+content=[\"'](\d+)[\"']/i);
    if (thumbDimMatchH) thumbnailHeight = parseInt(thumbDimMatchH[1], 10);

    const unifiedContent: YouTubeVideoData = {
      videoId,
      title,
      author,
      authorUrl,
      thumbnailUrl,
      thumbnailWidth,
      thumbnailHeight,
      providerName,
      providerUrl,
      html: htmlEmbed,
      width,
      height,
      transcript  // This is now properly part of the unified content
    };

    return { unifiedContent };
  }

  /**
   * Returns the folder name for YouTube notes.
   * Used by the orchestrator to determine where to save notes.
   * 
   * @returns {string} The folder name for YouTube content
   */
  getFolderName(): string {
    return "YouTube";
  }

  /**
   * Generates the final note content to be written to the file.
   * Combines metadata and LLM-processed content into a well-formatted note.
   * 
   * @param {string} markdown - The processed markdown content from the LLM
   * @param {YouTubeVideoData} metadata - The video metadata
   * @returns {string} The complete note content
   */
  getNoteContent(markdown: string, metadata: YouTubeVideoData): string {
    const noteContent = [
      `![Thumbnail](${metadata.thumbnailUrl})\n`,
      `Author: [${metadata.author}](${metadata.authorUrl})\n`,
      `Video: [Watch here](https://www.youtube.com/watch?v=${metadata.videoId})\n`,
      markdown,
    ];
    return noteContent.join("\n");
  }
}