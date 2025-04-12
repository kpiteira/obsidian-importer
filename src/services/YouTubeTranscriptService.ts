import { extractYouTubeVideoId } from "../utils/url";
import { requestUrl, RequestUrlResponse } from "obsidian";
/**
 * Custom error for YouTube transcript fetching failures.
 */
export class YouTubeTranscriptError extends Error {
  code: YouTubeTranscriptErrorCode;
  constructor(code: YouTubeTranscriptErrorCode, message: string) {
    super(message);
    this.name = "YouTubeTranscriptError";
    this.code = code;
  }
}

export type YouTubeTranscriptErrorCode =
  | "INVALID_URL"
  | "FETCH_VIDEO_FAILED"
  | "PLAYER_RESPONSE_NOT_FOUND"
  | "PLAYER_RESPONSE_PARSE_ERROR"
  | "NO_CAPTIONS"
  | "NO_CAPTION_TRACKS"
  | "FETCH_CAPTIONS_FAILED"
  | "CAPTIONS_PARSE_ERROR"
  | "UNKNOWN";

/**
 * Fetches the transcript for a given YouTube video.
 * This implementation fetches the video page, extracts caption tracks, and fetches the transcript from the correct URL,
 * modeled after obsidian-yt-video-summarizer.
 * Only English ("en") transcripts are fetched if available, otherwise falls back to the first available track.
 * @param url The YouTube video URL.
 * @returns The transcript as plain text.
 */
export async function fetchYouTubeTranscript(url: string): Promise<string> {
  try {
    const videoId = extractYouTubeVideoId(url);
    if (!videoId) {
      throw new YouTubeTranscriptError(
        "INVALID_URL",
        "Invalid YouTube URL or unable to extract video ID."
      );
    }

    // Fetch the YouTube video page
    let videoPageResponse: RequestUrlResponse;
    try {
      videoPageResponse = await requestUrl({ url: `https://www.youtube.com/watch?v=${videoId}` });
    } catch (err) {
      throw new YouTubeTranscriptError(
        "FETCH_VIDEO_FAILED",
        "Network error while fetching YouTube video page."
      );
    }
    if (videoPageResponse.status !== 200) {
      throw new YouTubeTranscriptError(
        "FETCH_VIDEO_FAILED",
        "Failed to fetch YouTube video page."
      );
    }
    const videoPageBody = videoPageResponse.text;

    // LOG: Show first 200 chars of video page body for debugging
    console.log("[YouTubeTranscriptService] videoPageBody (first 200):", videoPageBody.slice(0, 200));

    // Try multiple regexes for ytInitialPlayerResponse extraction
    let playerResponseMatch =
      videoPageBody.match(/var ytInitialPlayerResponse = (.*?});/) ||
      videoPageBody.match(/ytInitialPlayerResponse\s*=\s*(\{.*?\});/) ||
      videoPageBody.match(/window\["ytInitialPlayerResponse"\]\s*=\s*(\{.*?\});/);

    // LOG: Show if playerResponseMatch was found and a preview
    if (!playerResponseMatch) {
      console.error("[YouTubeTranscriptService] ytInitialPlayerResponse NOT FOUND");
      throw new YouTubeTranscriptError(
        "PLAYER_RESPONSE_NOT_FOUND",
        "Failed to extract player response from video page."
      );
    } else {
      console.log("[YouTubeTranscriptService] ytInitialPlayerResponse found, preview:", playerResponseMatch[1].slice(0, 100));
    }

    let playerResponse: any;
    try {
      playerResponse = JSON.parse(playerResponseMatch[1]);
    } catch (err) {
      console.error("[YouTubeTranscriptService] Failed to parse player response JSON:", err);
      throw new YouTubeTranscriptError(
        "PLAYER_RESPONSE_PARSE_ERROR",
        "Failed to parse player response JSON."
      );
    }

    // Find available caption tracks
    const captionTracks =
      playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
    // LOG: Output captionTracks for debugging
    console.log("[YouTubeTranscriptService] captionTracks:", JSON.stringify(captionTracks, null, 2));

    if (!captionTracks) {
      console.error("[YouTubeTranscriptService] No captionTracks found in player response");
      throw new YouTubeTranscriptError(
        "NO_CAPTION_TRACKS",
        "No caption tracks found in player response."
      );
    }
    if (!captionTracks.length) {
      console.error("[YouTubeTranscriptService] captionTracks array is empty");
      throw new YouTubeTranscriptError(
        "NO_CAPTIONS",
        "No captions available for this video."
      );
    }

    // Prefer English, otherwise fallback to first available
    const track =
      captionTracks.find((t: any) => t.languageCode === "en") ||
      captionTracks[0];

    if (!track || !track.baseUrl) {
      throw new YouTubeTranscriptError(
        "NO_CAPTION_TRACKS",
        "No valid caption track found."
      );
    }

    const captionsUrl = track.baseUrl;

    // Fetch the captions XML
    let captionsResponse: RequestUrlResponse;
    try {
      // LOG: Output the captionsUrl being fetched
      console.log("[YouTubeTranscriptService] Fetching captionsUrl:", captionsUrl);
      captionsResponse = await requestUrl({ url: captionsUrl });
    } catch (err) {
      throw new YouTubeTranscriptError(
        "FETCH_CAPTIONS_FAILED",
        "Network error while fetching transcript."
      );
    }
    if (captionsResponse.status !== 200) {
      throw new YouTubeTranscriptError(
        "FETCH_CAPTIONS_FAILED",
        "Failed to fetch transcript."
      );
    }
    const xml = captionsResponse.text;

    // Parse XML and extract transcript text
    let xmlDoc: Document;
    try {
      // Use DOMParser if available, otherwise fallback to xmldom (for Node/Obsidian context)
      let parser: any;
      if (typeof DOMParser !== "undefined") {
        parser = new DOMParser();
        xmlDoc = parser.parseFromString(xml, "text/xml");
      } else {
        // @ts-ignore
        const { DOMParser: NodeDOMParser } = require("xmldom");
        parser = new NodeDOMParser();
        xmlDoc = parser.parseFromString(xml, "text/xml");
      }
    } catch (err) {
      throw new YouTubeTranscriptError(
        "CAPTIONS_PARSE_ERROR",
        "Failed to parse captions XML."
      );
    }
    const texts = Array.from(xmlDoc.getElementsByTagName("text"));
    if (!texts.length) {
      throw new YouTubeTranscriptError(
        "CAPTIONS_PARSE_ERROR",
        "No transcript text found in captions XML."
      );
    }
    // Decode HTML entities in Node/Obsidian context
    function decodeHTMLEntities(html: string): string {
      if (typeof document !== "undefined") {
        const txt = document.createElement("textarea");
        txt.innerHTML = html;
        return txt.value;
      } else {
        // Node/Obsidian fallback
        return html
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/&#10;/g, "\n")
          .replace(/&#39;/g, "'")
          .replace(/&nbsp;/g, " ");
      }
    }
    const transcript = texts
      .map((el) => {
        const html = el.textContent || "";
        return decodeHTMLEntities(html);
      })
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    return transcript;
  } catch (err: any) {
    if (err instanceof YouTubeTranscriptError) {
      throw err;
    }
    throw new YouTubeTranscriptError(
      "UNKNOWN",
      err?.message || "Unknown error occurred while fetching YouTube transcript."
    );
  }
}