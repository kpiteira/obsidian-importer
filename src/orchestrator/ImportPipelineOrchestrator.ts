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
}

export interface ILLMProcessor {
  process(content: any, metadata?: any): Promise<string>;
}

export interface INoteWriter {
  writeNote(content: string, metadata?: any): Promise<string>;
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
    if (this.deps.logger) {
      this.deps.logger.error(
        `[ImportPipelineOrchestrator] Error at stage "${error.stage}": ${error.userMessage}`,
        error.error
      );
    }
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
  async run(url: string): Promise<void> {
    const logger = this.deps.logger;
    let contentType: string | undefined;
    let handler: IContentHandler | undefined;
    let content: any;
    let metadata: any;
    let noteContent: string;
    let notePath: string;

    logger?.info?.("Starting import pipeline for URL:", url);

    // 1. URL Validation
    this.emitProgress({ stage: 'validating_url' });
    logger?.debugLog?.("Validating URL:", url);
    try {
      await this.deps.urlValidator.validate(url);
    } catch (err: any) {
      // Map known error types to user-friendly messages
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
    logger?.debugLog?.("Detecting content type for URL:", url);
    try {
      contentType = await this.deps.contentTypeDetector.detect(url);
      logger?.info?.("Detected content type:", contentType);
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
    logger?.debugLog?.("Downloading content for URL:", url, "with handler:", contentType);
    try {
      // Do not log actual content or sensitive metadata!
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
    logger?.debugLog?.("Processing content with LLM for URL:", url, "contentType:", contentType);
    try {
      // Do not log content or metadata
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

    // 5. Note Writing
    this.emitProgress({ stage: 'writing_note' });
    logger?.debugLog?.("Writing note for URL:", url, "contentType:", contentType);
    try {
      notePath = await this.deps.noteWriter.writeNote(noteContent, metadata);
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
    logger?.info?.("Import pipeline completed for URL:", url, "Note path:", notePath);
  }
}