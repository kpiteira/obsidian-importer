/**
 * YouTube-specific utility functions.
 */

/**
 * Extracts the YouTube video ID from a given URL string.
 * Supports all common YouTube URL formats (watch, youtu.be, embed, shorts, etc.).
 * Returns the video ID if found, otherwise returns null.
 */
export function extractYouTubeVideoId(url: string): string | null {
  if (typeof url !== 'string') return null;
  let match: RegExpMatchArray | null;

  // 1. youtu.be/VIDEOID
  match = url.match(/(?:https?:\/\/)?(?:www\.)?youtu\.be\/([\w-]{11})(?:[?&].*)?$/);
  if (match) return match[1];

  // 2. youtube.com/watch?v=VIDEOID
  match = url.match(/(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?(?:.*&)?v=([\w-]{11})(?:[&?#].*)?$/);
  if (match) return match[1];

  // 3. youtube.com/embed/VIDEOID
  match = url.match(/(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([\w-]{11})(?:[?&].*)?$/);
  if (match) return match[1];

  // 4. youtube.com/shorts/VIDEOID
  match = url.match(/(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([\w-]{11})(?:[?&].*)?$/);
  if (match) return match[1];

  // 5. youtube.com/v/VIDEOID
  match = url.match(/(?:https?:\/\/)?(?:www\.)?youtube\.com\/v\/([\w-]{11})(?:[?&].*)?$/);
  if (match) return match[1];

  // 6. youtube.com/attribution_link?...u=%2Fwatch%3Fv%3DVIDEOID%26...
  match = url.match(/[?&]v=([\w-]{11})/);
  if (match) return match[1];

  return null;
}

/**
 * Generates the standard YouTube embed HTML for a given video ID.
 * @param videoId The YouTube video ID
 * @returns The iframe embed HTML string
 */
export function generateYouTubeEmbedHtml(videoId: string): string {
  if (!videoId) return "";
  return `<iframe width="560" height="315" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen></iframe>`;
}