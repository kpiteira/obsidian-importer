import { getLogger } from "../utils/importerLogger";
import { ContentTypeHandler } from "../handlers/ContentTypeHandler";
import { detectContentType } from "../handlers/typeDispatcher";
import { ContentTypeRegistry } from "../handlers/ContentTypeRegistry";
import { PluginSettings } from "../utils/settings";
import { sanitizeFilename } from "../utils/sanitize";
import { LLMProvider as ServiceLLMProvider, LLMOptions } from "../services/LLMProvider";

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

/**
 * Interface for a minimal LLM provider that takes a prompt and returns the LLM's markdown response.
 */
export interface LLMProvider {
  callLLM(prompt: string, options?: LLMOptions): Promise<string>;
}

/**
 * Interface for a content downloader, responsible for fetching content and metadata for a given URL.
 */

/**
 * Interface for note writing.
 */

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
  settings: PluginSettings;
  llmProvider: ServiceLLMProvider; // Use the imported LLMProvider interface
  noteWriter: INoteWriter;
  logger?: {
    info: (...args: unknown[]) => void;
    warn: (...args: unknown[]) => void;
    error: (...args: unknown[]) => void;
    debugLog: (...args: unknown[]) => void;
  };
  contentTypeRegistry?: ContentTypeRegistry; // Add ContentTypeRegistry as optional dependency
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

  /**
   * Runs the import pipeline for a given URL.
   * Emits progress and error events.
   *
   * Pipeline stages:
   * 1. URL validation
   * 2. Handler selection (by content type or URL)
   * 3. Content download
   * 4. LLM prompt generation and processing
   * 5. LLM response parsing
   * 6. Note writing
   *
   * Each content type handler is responsible for prompt construction and LLM response parsing.
   */
  async run(url: string): Promise<void> {
    const logger = this.deps.logger;
    let handler: ContentTypeHandler | null;
    let content: any;
    let metadata: any;
    let llmPrompt: string;
    let llmRawResponse: string;
    let llmParsed: any;
    let noteContent: string;
    let notePath: string;

    // 1. URL Validation (basic) and content type detection
    this.emitProgress({ stage: 'validating_url' });
    try {
      // Basic URL format validation
      let urlObj: URL;
      try {
        urlObj = new URL(url);
      } catch (err) {
        throw { userMessage: "Invalid URL format. Please enter a complete URL including 'https://'." };
      }
      
      // Content type detection using registry if available, fallback to old method
      if (this.deps.contentTypeRegistry) {
        logger?.debugLog?.("Using ContentTypeRegistry for content type detection");
        handler = await this.deps.contentTypeRegistry.detectContentType(url);
      } else {
        logger?.debugLog?.("Using legacy detection method");
        handler = detectContentType(urlObj);
      }
      
      if (!handler) {
        throw { 
          userMessage: `This content type is not supported yet. Currently, only YouTube videos are supported.`
        };
      }
    } catch (err: any) {
      let userMessage = "Invalid or unsupported URL.";
      if (err?.userMessage) userMessage = err.userMessage;
      else if (err?.name === "NetworkError") userMessage = "Network connection error. Please check your internet connection and try again.";
      else if (typeof err === "string") userMessage = err;
      logger?.error?.("[URL Validation] Error:", userMessage, err);
      this.emitError({
        stage: "validating_url",
        userMessage,
        error: err
      });
      return;
    }

    // 2. Handler Selection (Content Type Detection) - now handled above

    // 3. Content Download (direct via handler)
    this.emitProgress({ stage: 'downloading_content' });
    try {
      const result = await handler.download(url);
      content = result.content;
      metadata = result.metadata;
      logger?.debugLog?.("[Content Download] Content and metadata:", content, metadata);
    } catch (err: any) {
      let userMessage = "Failed to download content. Please check your network connection or the source URL.";
      if (err?.userMessage) userMessage = err.userMessage;
      else if (err?.name === "TranscriptUnavailableError") userMessage = "This video doesn't have an available transcript. Try a different video or one with captions enabled.";
      else if (err?.name === "NetworkError") userMessage = "Network connection issue while downloading content. Please check your internet and try again.";
      else if (typeof err === "string") userMessage = err;
      logger?.error?.("[Content Download] Error:", userMessage, err);
      this.emitError({
        stage: "downloading_content",
        userMessage,
        error: err
      });
      return;
    }

    // 4. LLM Prompt Generation and Processing
    this.emitProgress({ stage: 'processing_with_llm' });
    try {
      llmPrompt = handler.getPrompt(metadata);
      
      // Use the new LLMProvider interface
      const llmOptions: LLMOptions = {
        systemPrompt: "You are a helpful assistant that analyzes content."
      };
      
      llmRawResponse = await this.deps.llmProvider.callLLM(llmPrompt, llmOptions);
      
      if(!handler.validateLLMOutput(handler.parseLLMResponse(llmRawResponse))){
        throw new Error("LLM output validation failed. The AI response doesn't match the expected format.");
      }
      noteContent = llmRawResponse;
    } catch (err: any) {
      let userMessage = "AI processing failed. Please verify your API key and try again.";
      if (err?.userMessage) userMessage = err.userMessage;
      else if (err?.name === "LLMError") userMessage = "Error connecting to the AI service. Please check your API key and endpoint in settings.";
      else if (err?.message?.includes("validate")) userMessage = "The AI generated an invalid response format. Try with a different model or check your settings.";
      else if (typeof err === "string") userMessage = err;
      logger?.error?.("[LLM Processing] Error:", userMessage, err);
      this.emitError({
        stage: "processing_with_llm",
        userMessage,
        error: err
      });
      return;
    }

    // 5. Note Writing
    this.emitProgress({ stage: 'writing_note' });
    try {
      // 5.1 Determine folder path from handler (if available)
      const folderPath = this.deps.settings.defaultFolder + '/' + handler.getFolderName();

      // 5.2 Generate filename using note title and date
      const title = metadata?.title || "Imported Note";
      let filename = sanitizeFilename(title) + ".md";

      // 5.3 TODO: Optionally resolve filename conflicts (requires reading existing files in folder)
      // For now, assume filename is unique

      // 5.6 Write note using pure file writer
      notePath = await this.deps.noteWriter.writeNote(folderPath, filename, handler.getNoteContent(noteContent, metadata));
    } catch (err: any) {
      let userMessage = "Failed to create the note in your vault.";
      if (err?.userMessage) userMessage = err.userMessage;
      else if (err?.code === "EACCES" || err?.code === "EPERM") userMessage = "Permission denied while writing the note. Check your vault permissions.";
      else if (err?.name === "FileIOError") userMessage = "File system error while saving the note. Verify the folder path exists in settings.";
      else if (err?.message?.includes("already exists")) userMessage = "A note with this name already exists. Future versions will handle this better.";
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