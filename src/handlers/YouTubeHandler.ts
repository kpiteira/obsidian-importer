import { extractYouTubeVideoId, generateYouTubeEmbedHtml } from "../utils/youtube";
import { ContentTypeHandler } from "./ContentTypeHandler";
import { fetchYouTubeTranscript } from "../services/YouTubeTranscriptService";
import { YouTubeVideoData } from "../models/YouTubeVideoData";
import { requestUrl, RequestUrlResponse } from "obsidian";

import { extractTranscriptFromHtml } from "../services/YouTubeTranscriptService";
import { IContentHandler } from "../orchestrator/ImportPipelineOrchestrator";
import { getLogger } from "../utils/importerLogger";

export class YouTubeHandler implements ContentTypeHandler, IContentHandler {
  public readonly type = "youtube";

  /**
   * Detects if the given URL is a YouTube video (youtube.com or youtu.be).
   * @param url The URL to check
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
   * Downloads the YouTube transcript and extracts video metadata.
   * @param url The YouTube video URL (string or URL)
   * @returns { content, metadata } where content is the transcript and metadata matches YouTubeVideoData
   */
  async downloadContent(url: string): Promise<{ content: string; metadata: YouTubeVideoData }> {
    // Extract videoId
    const videoId = extractYouTubeVideoId(url);
    if (!videoId) {
      throw new Error("Invalid YouTube URL: cannot extract video ID");
    }

    // Fetch video page
    const videoPageResponse: RequestUrlResponse = await requestUrl({ url: `https://www.youtube.com/watch?v=${videoId}` });
    const html = videoPageResponse.text;

    // Extract transcript from HTML
    const transcript = await extractTranscriptFromHtml(html);

    // Helper to extract meta tag content
    function getMeta(name: string): string | undefined {
      const og = html.match(new RegExp(`<meta[^>]+property=[\"']og:${name}[\"'][^>]+content=[\"']([^\"']+)[\"']`, "i"));
      if (og) return og[1];
      const nameTag = html.match(new RegExp(`<meta[^>]+name=[\"']${name}[\"'][^>]+content=[\"']([^\"']+)[\"']`, "i"));
      return nameTag ? nameTag[1] : undefined;
    }

    // Extract metadata fields
    const title = getMeta("title") || "";
    const author = getMeta("video:director") || getMeta("site_name") || "";
    const authorUrl = getMeta("video:director:url") || "";
    const thumbnailUrl = getMeta("image") || "";
    const providerName = getMeta("site_name") || "YouTube";
    const providerUrl = "https://www.youtube.com";
    const htmlEmbed = getMeta("video:url") ? generateYouTubeEmbedHtml(videoId) : "";
    const width = 560;
    const height = 315;
    const version = "1.0";
    const type = "video";

    // Thumbnail dimensions (not always available)
    let thumbnailWidth = 0, thumbnailHeight = 0;
    const thumbDimMatch = html.match(/<meta[^>]+property=[\"']og:image:width[\"'][^>]+content=[\"'](\d+)[\"']/i);
    if (thumbDimMatch) thumbnailWidth = parseInt(thumbDimMatch[1], 10);
    const thumbDimMatchH = html.match(/<meta[^>]+property=[\"']og:image:height[\"'][^>]+content=[\"'](\d+)[\"']/i);
    if (thumbDimMatchH) thumbnailHeight = parseInt(thumbDimMatchH[1], 10);

    const metadata: YouTubeVideoData = {
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
      version,
      type,
      transcript // Optionally include transcript in metadata for pipeline compatibility
    };

    return { content: transcript, metadata };
  }

  /**
   * Returns the folder name for YouTube notes.
   * @param metadata The metadata object returned from downloadContent
   */
  getFolderName(metadata: any): string {
    // Optionally use metadata fields to customize folder structure
    return "Sources/YouTube";
  }
}