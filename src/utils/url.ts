/**
 * Checks if a given URL string is a valid external URL (not localhost or private/internal IP).
 * Returns true if the URL is valid and external, false otherwise.
 */
export function isValidExternalUrl(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }

  const host = parsed.hostname.trim().toLowerCase();

  // Reject localhost and common variants
  if (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '::1'
  ) {
    return false;
  }

  // Reject IPv4 private ranges
  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const [_, a, b, c, d] = ipv4.map(Number);
    if (
      a === 10 || // 10.0.0.0/8
      (a === 192 && b === 168) || // 192.168.0.0/16
      (a === 172 && b >= 16 && b <= 31) // 172.16.0.0–172.31.255.255
    ) {
      return false;
    }
    // 127.0.0.1 already checked above, but for completeness:
    if (a === 127) {
      return false;
    }
  }

  // Optionally, reject IPv6 private addresses (fc00::/7, fe80::/10)
  if (host.includes(':')) {
    // IPv6
    if (
      host.startsWith('fc') || // Unique local address
      host.startsWith('fd') || // Unique local address
      host.startsWith('fe80') // Link-local address
    ) {
      return false;
    }
    if (host === '::1') {
      return false;
    }
  }

  return true;
}

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