# 🏗️ Obsidian Importer – Architecture Document (Current Implementation)

## 1. High-Level Architecture

The Obsidian Importer plugin follows an orchestrator-based architecture for processing a URL into a final Obsidian note:

```
User Input (URL)
   ↓
UrlInputModal (UI Layer)
   ↓
ImportPipelineOrchestrator (Coordination)
   ↓
Content Type Detection → Content Download → LLM Processing → Note Creation
```

This orchestrated pipeline provides centralized error handling, progress reporting, and clean separation of concerns.

---

## 2. Core Components

### 2.1 Entry Point (Plugin Main)

#### ✅ What it does

- Initializes the plugin, settings, and logger
- Registers the command palette item
- Sets up the settings tab
- Delegates to the orchestrator for the main functionality

#### 🧱 Implementation

```ts
export default class MyPlugin extends Plugin {
  settings: PluginSettings;

  async onload() {
    await this.loadSettings();
    const logger = getLogger();
    logger.setDebugMode(this.settings.debug);
    
    const orchestrator = await createImportPipelineOrchestrator(this.app, this.settings, logger);

    this.addCommand({
      id: 'open-url-input-modal',
      name: 'Import from URL...',
      callback: () => {
        new UrlInputModal(this.app, this.settings, logger).open();
      }
    });

    this.addSettingTab(new ImporterSettingTab(this.app, this));
  }
}
```

### 2.2 URL Input Modal (UI Layer)

#### ✅ What it does

- Presents a modal dialog for URL input
- Performs basic validation
- Delegates to the orchestrator for the import process
- Shows progress and error feedback

#### 🧱 Implementation

The `UrlInputModal` class handles user input and feedback, with a focus on user experience rather than business logic.

### 2.3 Orchestrator (Core Logic Coordinator)

#### ✅ What it does

- Coordinates the entire import pipeline
- Manages state transitions between stages
- Provides progress reporting through callbacks
- Centralizes error handling
- Acts as a facade for the underlying services

#### 🧱 Implementation

```ts
export class ImportPipelineOrchestrator {
  private deps: ImportPipelineDependencies;
  private progressCallbacks: ProgressCallback[] = [];
  private errorCallbacks: ErrorCallback[] = [];

  constructor(deps: ImportPipelineDependencies) {
    this.deps = deps;
  }

  onProgress(cb: ProgressCallback) {
    this.progressCallbacks.push(cb);
  }

  onError(cb: ErrorCallback) {
    this.errorCallbacks.push(cb);
  }

  async run(url: string): Promise<void> {
    // 1. URL Validation
    this.emitProgress({ stage: 'validating_url' });
    // Validation logic...

    // 2. Content Type Detection
    this.emitProgress({ stage: 'detecting_content_type' });
    // Detection logic...

    // 3. Content Download
    this.emitProgress({ stage: 'downloading_content' });
    // Download logic...

    // 4. LLM Processing
    this.emitProgress({ stage: 'processing_with_llm' });
    // Processing logic...

    // 5. Note Writing
    this.emitProgress({ stage: 'writing_note' });
    // Writing logic...

    // 6. Completed
    this.emitProgress({ stage: 'completed', notePath });
  }
}
```

#### 📌 Pipeline Stages

The orchestrator explicitly defines a sequence of stages:

1. `validating_url`: Ensures the URL is well-formed
2. `detecting_content_type`: Identifies what kind of content the URL points to
3. `downloading_content`: Fetches the content and metadata
4. `processing_with_llm`: Sends data to the LLM for analysis
5. `writing_note`: Generates and saves the Obsidian note
6. `completed`: Signals successful completion

Each stage emits progress updates and has dedicated error handling.

### 2.4 Content Type Handlers

#### ✅ What it does

- Implements a strategy pattern for different content types
- Currently supports YouTube videos via `YouTubeHandler`
- Provides a common interface for future content handlers

#### 🧱 Implementation

```ts
export interface ContentTypeHandler {
  type: string;
  detect(url: URL): boolean;
  downloadContent(url: string): Promise<any>;
  getPrompt(content: any): string;
  parseLLMResponse(response: string): any;
  validateLLMOutput(parsed: any): boolean;
  getNoteContent(llmResponse: string, metadata: ContentMetadata): string;
  getFolderName(): string;
}
```

### 2.5 Services Layer

#### ✅ What it does

- Provides focused services for specific functionality
- Implements interfaces to allow for substitution and testing
- Currently includes:
  - `LLMProvider`: Interface for LLM interaction
  - `RequestyProvider`: Implementation of LLM provider for Requesty
  - `YouTubeTranscriptService`: Handles YouTube transcript fetching

#### 🧱 LLM Provider Implementation

```ts
export interface LLMProvider {
  callLLM(prompt: string): Promise<string>;
}

export class RequestyProvider implements LLMProvider {
  // Implementation details
}
```

### 2.6 Utils

#### ✅ What it does

- Provides reusable utility functions
- Includes:
  - `noteWriter`: Handles file operations in Obsidian
  - `importerLogger`: Centralized logging
  - `sanitize`: Handles filename sanitization
  - `settings`: Manages plugin settings
  - `retryWithExponentialBackoff`: Implements resilient network operations
  - Other specialized utilities

---

## 3. Cross-Cutting Concerns

### 3.1 Error Handling

The implementation uses a typed error system with stage-specific handling:

```ts
export type ImportPipelineError = {
  stage: string;
  userMessage: string;
  error?: unknown;
};
```

Errors are emitted through callbacks and handled appropriately at different levels:
- Critical errors show as Obsidian notices
- All errors are logged with context
- UI components respond to error states

### 3.2 Logging

The implementation includes a centralized logger with:
- Debug mode toggle
- Context prefixing
- Error redaction for sensitive data

```ts
export function getLogger() {
  // Implementation details
}
```

### 3.3 Security

Security considerations include:
- API key redaction in logs
- URL validation and sanitization
- Safe file operations with sanitized paths
- Protection against server-side request forgery

### 3.4 Configuration

Settings are centrally managed with:
- Type-safe settings interface
- Defaults for each setting
- UI for configuration
- Persistence via Obsidian's API

```ts
export interface PluginSettings {
  apiKey: string;
  llmEndpoint: string;
  model: string;
  defaultFolder: string;
  debug: boolean;
}
```

---

## 4. Factory Pattern Usage

The implementation uses a factory pattern to construct the orchestrator with all its dependencies:

```ts
export async function createImportPipelineOrchestrator(
  app: App,
  settings: PluginSettings,
  logger: ReturnType<typeof getLogger>
) {
  const { RequestyProvider } = await import('../../src/services/RequestyProvider');

  // Instantiate RequestyProvider
  const requestyProvider = new RequestyProvider(
    () => ({
      endpoint: settings.llmEndpoint,
      model: settings.model,
      timeoutMs: 60000
    }),
    settings.apiKey
  );

  // Use NoteWriter directly
  const noteWriter = new NoteWriter(app);

  return new ImportPipelineOrchestrator({
    settings,
    llmProvider: requestyProvider,
    noteWriter,
    logger
  });
}
```

This pattern improves testability and dependency management.

---

## 5. V2 Considerations and Next Steps

### 5.1 Potential Enhancements

- **Additional Content Types**: Extend beyond YouTube with new handlers
- **Template Management**: Add UI for customizing prompts and templates
- **Local LLM Support**: Add providers for local LLMs like Ollama
- **Note Merging**: Support updating existing notes instead of always creating new ones
- **Enhanced Error Recovery**: Implement retries and partial success paths
- **Improved Metadata Extraction**: Add more comprehensive metadata extraction
- **Vault Integration**: Add support for auto-linking to existing notes

### 5.2 Technical Improvements

- **State Management**: Consider a more formal state management approach
- **Testing**: Expand test coverage, particularly for edge cases
- **Documentation**: Generate API documentation for maintainability
- **Performance Optimization**: Profile and optimize for larger content

---

## 6. Overall Architecture Evaluation

The actual implementation shows excellent software engineering practices:

- **Separation of Concerns**: Clear boundaries between components
- **Interface-Based Design**: Components interact through interfaces
- **Dependency Injection**: Services are provided to components rather than created
- **Error Handling**: Comprehensive error handling throughout
- **Configurability**: Extensive settings and configuration
- **Observability**: Progress reporting and logging

These characteristics should make extending the plugin for V2 relatively straightforward.