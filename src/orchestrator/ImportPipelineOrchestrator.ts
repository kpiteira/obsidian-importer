import { getLogger } from "../utils/importerLogger";
/**
 * ImportPipelineOrchestrator
 * Encapsulates the import pipeline: URL validation → content type detection → content/metadata download → LLM processing → note generation.
 * Exposes progress and error events for UI subscription.
 * Uses dependency injection for handlers/services.
 */

export type ImportPipelineProgress =
  | { stage: 'validating_url' }
  | { stage: 'detecting_content_type' }
  | { stage: 'downloading_content' }
  | { stage: 'processing_with_llm' }
  | { stage: 'writing_note' }
  | { stage: 'completed'; notePath: string };

export type ImportPipelineError = {
  stage: string;
  userMessage: string;
  error?: unknown;
};

export type ProgressCallback = (progress: ImportPipelineProgress) => void;
export type ErrorCallback = (error: ImportPipelineError) => void;

export interface IUrlValidator {
  validate(url: string): Promise<void>;
}

export interface IContentTypeDetector {
  detect(url: string): Promise<string>;
}

export interface IContentHandler {
  downloadContent(url: string): Promise<any>;
  /**
   * Returns the folder name for this content type, given the metadata.
   * @param metadata The metadata object returned from downloadContent
   */
  getFolderName(metadata: any): string;
}

export interface ILLMProcessor {
  process(content: any, metadata?: any): Promise<string>;
}

export interface INoteWriter {
  /**
   * Pure file writer: writes the note to the specified folder and filename.
   * @param folderPath Folder path (relative to vault root)
   * @param filename Note filename (should be sanitized and unique)
   * @param content Markdown content for the note (including frontmatter if needed)
   * @returns The full note path (folderPath/filename)
   */
  writeNote(folderPath: string, filename: string, content: string): Promise<string>;
}

export interface ImportPipelineDependencies {
  urlValidator: IUrlValidator;
  contentTypeDetector: IContentTypeDetector;
  contentHandlers: Record<string, IContentHandler>;
  llmProcessor: ILLMProcessor;
  noteWriter: INoteWriter;
  logger?: {
    info: (...args: unknown[]) => void;
    warn: (...args: unknown[]) => void;
    error: (...args: unknown[]) => void;
    debugLog: (...args: unknown[]) => void;
  };
}

export class ImportPipelineOrchestrator {
  private progressCallbacks: ProgressCallback[] = [];
  private errorCallbacks: ErrorCallback[] = [];
  private deps: ImportPipelineDependencies;

  constructor(deps: ImportPipelineDependencies) {
    this.deps = deps;
  }

  onProgress(cb: ProgressCallback) {
    this.progressCallbacks.push(cb);
  }

  onError(cb: ErrorCallback) {
    this.errorCallbacks.push(cb);
  }

  private emitProgress(progress: ImportPipelineProgress) {
    for (const cb of this.progressCallbacks) cb(progress);
  }

  private emitError(error: ImportPipelineError) {
    for (const cb of this.errorCallbacks) cb(error);
    getLogger().error(
      `[ImportPipelineOrchestrator] Error at stage "${error.stage}": ${error.userMessage}`,
      error.error
    );
  }

  /**
   * Runs the import pipeline for a given URL.
   * Emits progress and error events.
   *
   * Error boundaries are established at each pipeline stage (URL validation, type detection,
   * content download, LLM processing, note writing). Each stage is wrapped in its own try/catch
   * to ensure robust error isolation, user-friendly error mapping, and detailed logging.
   * All errors are propagated to the UI via error events/callbacks with actionable messages.
   */
  // --- Utility functions for filename/frontmatter generation (moved from noteWriter) ---
  /**
   * Generates a note filename based on the title, with a date prefix (YYYY-MM-DD) and sanitized title.
   * @param title The note title
   * @param date Optional Date object (defaults to today)
   * @returns The generated filename (e.g., "2025-04-11 My Video Title.md")
   */
  private generateNoteFilename(title: string, date: Date = new Date()): string {
    const datePrefix = date.toISOString().slice(0, 10); // YYYY-MM-DD
    const sanitizedTitle = (title || "Untitled").replace(/[\\/:*?"<>|]/g, ""); // fallback sanitize
    return `${datePrefix} ${sanitizedTitle}.md`;
  }

  /**
   * Generates YAML frontmatter for a note, including videoId, url, and importTimestamp.
   * @param videoId The YouTube video ID
   * @param url The original video URL
   * @param importTimestamp The import timestamp (Date or ISO string)
   * @returns YAML frontmatter string for inclusion at the top of a Markdown note
   */
  private generateNoteFrontmatter(videoId: string, url: string, importTimestamp: Date | string): string {
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
   * Resolves filename conflicts by generating a unique, sanitized filename.
   * - If the desired filename exists in the target directory, appends a number (e.g., " (1)", " (2)") before the extension.
   * - If all numbered variants up to 99 exist, appends a timestamp.
   * - Always preserves the ".md" extension and uses sanitizeFilename for the base name.
   * @param desiredFilename The proposed filename (with or without ".md")
   * @param existingFilenames Array of filenames already present in the target directory (should include ".md")
   * @returns A unique, sanitized filename string (with ".md" extension)
   */
  private resolveFilenameConflict(desiredFilename: string, existingFilenames: string[]): string {
    let base = desiredFilename.endsWith('.md')
      ? desiredFilename.slice(0, -3)
      : desiredFilename;
    base = (base || "Untitled").replace(/[\\/:*?"<>|]/g, "");
    let candidate = `${base}.md`;
    if (!existingFilenames.includes(candidate)) {
      return candidate;
    }
    for (let i = 1; i <= 99; i++) {
      const numbered = `${base} (${i}).md`;
      if (!existingFilenames.includes(numbered)) {
        return numbered;
      }
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    return `${base} (${timestamp}).md`;
  }

  async run(url: string): Promise<void> {
    const logger = this.deps.logger;
    let contentType: string | undefined;
    let handler: IContentHandler | undefined;
    let content: any;
    let metadata: any;
    let noteContent: string;
    let notePath: string;

    // 1. URL Validation
    this.emitProgress({ stage: 'validating_url' });
    try {
      await this.deps.urlValidator.validate(url);
    } catch (err: any) {
      let userMessage = "Invalid or unsupported URL.";
      if (err?.userMessage) userMessage = err.userMessage;
      else if (err?.name === "NetworkError") userMessage = "Network error during URL validation.";
      else if (typeof err === "string") userMessage = err;
      logger?.error?.("[URL Validation] Error:", userMessage, err);
      this.emitError({
        stage: "validating_url",
        userMessage,
        error: err
      });
      return;
    }

    // 2. Content Type Detection
    this.emitProgress({ stage: 'detecting_content_type' });
    try {
      contentType = await this.deps.contentTypeDetector.detect(url);
    } catch (err: any) {
      let userMessage = "Could not determine the content type for the provided URL.";
      if (err?.userMessage) userMessage = err.userMessage;
      else if (err?.name === "NetworkError") userMessage = "Network error during content type detection.";
      else if (typeof err === "string") userMessage = err;
      logger?.error?.("[Content Type Detection] Error:", userMessage, err);
      this.emitError({
        stage: "detecting_content_type",
        userMessage,
        error: err
      });
      return;
    }

    handler = this.deps.contentHandlers[contentType];
    if (!handler) {
      logger?.warn?.("No handler found for content type:", contentType);
      const userMessage = `Unsupported content type: ${contentType}`;
      this.emitError({
        stage: "detecting_content_type",
        userMessage,
        error: { userMessage }
      });
      return;
    }

    // 3. Content Download
    this.emitProgress({ stage: 'downloading_content' });
    try {
      const result = await handler.downloadContent(url);
      content = result.content;
      metadata = result.metadata;
    } catch (err: any) {
      let userMessage = "Failed to download content. Please check your network connection or the source URL.";
      if (err?.userMessage) userMessage = err.userMessage;
      else if (err?.name === "TranscriptUnavailableError") userMessage = "Transcript is unavailable for this content.";
      else if (err?.name === "NetworkError") userMessage = "Network error during content download.";
      else if (typeof err === "string") userMessage = err;
      logger?.error?.("[Content Download] Error:", userMessage, err);
      this.emitError({
        stage: "downloading_content",
        userMessage,
        error: err
      });
      return;
    }

    // 4. LLM Processing
    this.emitProgress({ stage: 'processing_with_llm' });
    try {
      noteContent = await this.deps.llmProcessor.process(content, metadata);
    } catch (err: any) {
      let userMessage = "AI processing failed. Please try again later.";
      if (err?.userMessage) userMessage = err.userMessage;
      else if (err?.name === "LLMError") userMessage = "A problem occurred while processing with the AI model.";
      else if (typeof err === "string") userMessage = err;
      logger?.error?.("[LLM Processing] Error:", userMessage, err);
      this.emitError({
        stage: "processing_with_llm",
        userMessage,
        error: err
      });
      return;
    }

    // 5. Note Writing (all orchestration logic here)
    this.emitProgress({ stage: 'writing_note' });
    try {
      // 5.1 Determine folder path from handler
      const folderPath = handler.getFolderName(metadata);

      // 5.2 Generate filename using note title and date
      const title = metadata?.title || "Imported Note";
      const date = metadata?.importTimestamp ? new Date(metadata.importTimestamp) : new Date();
      let filename = this.generateNoteFilename(title, date);

      // 5.3 TODO: Optionally resolve filename conflicts (requires reading existing files in folder)
      // For now, assume filename is unique

      // 5.4 Generate YAML frontmatter/metadata
      const videoId = metadata?.videoId || "";
      const importUrl = url;
      const importTimestamp = date;
      const frontmatter = this.generateNoteFrontmatter(videoId, importUrl, importTimestamp);

      // 5.5 Assemble final note content (frontmatter + body)
      const finalContent = `${frontmatter}\n\n${noteContent}`;

      // 5.6 Write note using pure file writer
      notePath = await this.deps.noteWriter.writeNote(folderPath, filename, finalContent);
    } catch (err: any) {
      let userMessage = "Failed to write the note to your vault. Please check your file system permissions.";
      if (err?.userMessage) userMessage = err.userMessage;
      else if (err?.code === "EACCES" || err?.code === "EPERM") userMessage = "Permission denied while writing the note.";
      else if (err?.name === "FileIOError") userMessage = "A file system error occurred while saving the note.";
      else if (typeof err === "string") userMessage = err;
      logger?.error?.("[Note Writing] Error:", userMessage, err);
      this.emitError({
        stage: "writing_note",
        userMessage,
        error: err
      });
      return;
    }

    // 6. Completed
    this.emitProgress({ stage: 'completed', notePath });
  }
}