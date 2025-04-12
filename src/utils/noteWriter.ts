import { Notice, App } from "obsidian";
import { sanitizeFilename } from "./sanitize";

/**
 * Creates a note in the Obsidian vault with robust error handling and user feedback.
 * - Ensures the target folder exists (creates it if needed).
 * - Writes the note file.
 * - On any error, shows a user-friendly Notice as specified in the architecture.
 *
 * @param app Obsidian App instance
 * @param folderPath Folder path (relative to vault root)
 * @param filename Note filename (should be sanitized)
 * @param content Markdown content for the note
 */
export async function createNoteWithFeedback(
  app: App,
  folderPath: string,
  filename: string,
  content: string
): Promise<void> {
  try {
    // Ensure folder exists
    await app.vault.createFolder(folderPath).catch((err) => {
      // If folder already exists, ignore; otherwise, show error
      if (!String(err).includes("Folder already exists")) {
        new Notice("Could not create the note folder. Check permissions or paths.");
        throw err;
      }
    });

    const fullPath = `${folderPath}/${filename}`;
    await app.vault.create(fullPath, content);
  } catch (err) {
    // Show actionable feedback as per architecture spec
    new Notice("Could not create the note. Check permissions or paths.");
    // Optionally log for debugging
    console.error("[ObsidianImporter] Note creation error:", err);
    throw err;
  }
}
/**
 * Generates a note filename based on the video title, with a date prefix (YYYY-MM-DD) and sanitized title.
 * Does not perform file writing, folder creation, or error handling.
 *
 * @param title The video title to use for the note filename
 * @param date Optional Date object (defaults to today)
 * @returns The generated filename (e.g., "2025-04-11 My Video Title.md")
 */
export function generateNoteFilename(title: string, date: Date = new Date()): string {
  const datePrefix = date.toISOString().slice(0, 10); // YYYY-MM-DD
  const sanitizedTitle = sanitizeFilename(title);
  return `${datePrefix} ${sanitizedTitle}.md`;
}
/**
 * Generates YAML frontmatter for a note, including videoId, url, and importTimestamp.
 * The importTimestamp is always formatted as an ISO 8601 string.
 *
 * @param videoId The YouTube video ID
 * @param url The original video URL
 * @param importTimestamp The import timestamp (Date or ISO string)
 * @returns YAML frontmatter string for inclusion at the top of a Markdown note
 */
export function generateNoteFrontmatter(
  videoId: string,
  url: string,
  importTimestamp: Date | string
): string {
  const isoTimestamp = importTimestamp instanceof Date
    ? importTimestamp.toISOString()
    : new Date(importTimestamp).toISOString();
  return [
    '---',
    `videoId: ${videoId}`,
    `url: ${url}`,
    `importTimestamp: ${isoTimestamp}`,
    '---'
  ].join('\n');
}
/**
 * Displays a success notification with a clickable link to the newly created note.
 * Uses Obsidian's Notice system and the obsidian://open?path=... URI scheme for the link.
 *
 * @param app Obsidian App instance
 * @param notePath Path to the note file (relative to vault root, e.g., 'Imported/YouTube/2025-04-11 My Note.md')
 */
export function showNoteCreatedNotification(app: App, notePath: string): void {
  // Extract filename for display
  const filename = notePath.split("/").pop() || notePath;
  // Encode the path for the URI
  const encodedPath = encodeURIComponent(notePath);
  // Construct the obsidian URI
  const noteUri = `obsidian://open?path=${encodedPath}`;
  // Use HTML anchor for clickable link in the Notice
  const noticeContent = `Note created: <a href=\"${noteUri}\" target=\"_blank\">${filename}</a>`;
  new Notice(noticeContent, 8000); // Show for 8 seconds
}

/**
 * Resolves filename conflicts by generating a unique, sanitized filename.
 * - If the desired filename exists in the target directory, appends a number (e.g., " (1)", " (2)") before the extension.
 * - If all numbered variants up to 99 exist, appends a timestamp.
 * - Always preserves the ".md" extension and uses sanitizeFilename for the base name.
 *
 * @param desiredFilename The proposed filename (with or without ".md")
 * @param existingFilenames Array of filenames already present in the target directory (should include ".md")
 * @returns A unique, sanitized filename string (with ".md" extension)
 */
export function resolveFilenameConflict(
  desiredFilename: string,
  existingFilenames: string[]
): string {
  // Ensure .md extension
  let base = desiredFilename.endsWith('.md')
    ? desiredFilename.slice(0, -3)
    : desiredFilename;
  // Sanitize base name
  base = sanitizeFilename(base);
  let candidate = `${base}.md`;
  if (!existingFilenames.includes(candidate)) {
    return candidate;
  }
  // Try numbered variants
  for (let i = 1; i <= 99; i++) {
    const numbered = `${base} (${i}).md`;
    if (!existingFilenames.includes(numbered)) {
      return numbered;
    }
  }
  // Fallback: append timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `${base} (${timestamp}).md`;
}
