import { Notice, App } from "obsidian";

/**
 * Pure file writer for notes in the Obsidian vault.
 * - Ensures the target folder exists (creates it if needed).
 * - Writes the note file.
 * - On any error, shows a user-friendly Notice as specified in the architecture.
 *
 * @param app Obsidian App instance
 */
export class NoteWriter {
  private app: App;
  constructor(app: App) {
    this.app = app;
  }

  /**
   * Writes a note to the specified folder and filename with the given content.
   * @param folderPath Folder path (relative to vault root)
   * @param filename Note filename (should be sanitized and unique)
   * @param content Markdown content for the note (including frontmatter if needed)
   * @returns The full note path (folderPath/filename)
   */
  async writeNote(folderPath: string, filename: string, content: string): Promise<string> {
    try {
      // Ensure folder exists
      await this.app.vault.createFolder(folderPath).catch((err) => {
        // If folder already exists, ignore; otherwise, show error
        if (!String(err).includes("Folder already exists")) {
          new Notice("Could not create the note folder. Check permissions or paths.");
          throw err;
        }
      });

      const fullPath = `${folderPath}/${filename}`;
      await this.app.vault.create(fullPath, content);
      return fullPath;
    } catch (err) {
      // Show actionable feedback as per architecture spec
      new Notice("Could not create the note. Check permissions or paths.");
      // Optionally log for debugging
      console.error("[ObsidianImporter] Note creation error:", err);
      throw err;
    }
  }
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
