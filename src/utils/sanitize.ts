// Utility to sanitize filenames/paths for cross-platform compatibility in Obsidian Importer

/**
 * Sanitizes a string for safe use as a filename or path segment.
 * - Removes invalid characters: / \ : * ? " < > | (Windows, macOS, Linux)
 * - Trims leading/trailing whitespace, dots, and dashes
 * - Replaces consecutive spaces with a single space
 * - Optionally truncates to 50 characters (configurable)
 * - Avoids reserved Windows names (CON, PRN, AUX, NUL, COM1-9, LPT1-9)
 * @param input The proposed filename or path segment
 * @param maxLength Maximum length of the sanitized filename (default: 50)
 * @returns Sanitized filename string
 */
export function sanitizeFilename(input: string, maxLength = 255): string {
  // Remove invalid characters
  let sanitized = input.replace(/[\/\\:*?"<>|]/g, "");

  // Replace multiple spaces with a single space
  sanitized = sanitized.replace(/\s+/g, " ");

  // Trim leading/trailing whitespace, dots, and dashes
  sanitized = sanitized.trim().replace(/^[.\s-]+|[.\s-]+$/g, "");

  // Truncate to maxLength
  if (sanitized.length > maxLength) {
    sanitized = sanitized.slice(0, maxLength).trim();
  }

  // Avoid reserved Windows device names (case-insensitive)
  const reserved = [
    "CON", "PRN", "AUX", "NUL",
    "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8", "COM9",
    "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9"
  ];
  if (reserved.includes(sanitized.toUpperCase())) {
    sanitized = `_${sanitized}`;
  }

  // Fallback for empty result
  if (!sanitized) {
    sanitized = "untitled";
  }

  return sanitized;
}