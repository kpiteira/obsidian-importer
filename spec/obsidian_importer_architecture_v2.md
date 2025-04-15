# 🏗️ Obsidian Importer V2 – Architecture Document

## 1. High-Level Architecture

Building on the MVP's orchestrator-based architecture, the V2 architecture expands to support multiple content types and LLM providers while maintaining the same core flow:

```
User Input (URL)
   ↓
UrlInputModal (UI Layer)
   ↓
ImportPipelineOrchestrator (Coordination)
   ↓
Content Type Detection → Content Download → LLM Processing → Note Creation
   ↑                        ↑                  ↑
Content Type Registry    Web Scraping      Provider Registry
```

The key architectural enhancements include:
- A content type registry for managing multiple content handlers
- An LLM provider registry for supporting multiple LLM services
- Enhanced error handling with actionable user feedback
- Improved progress reporting

---

## 2. Core Components

### 2.1 Entry Point (Plugin Main)

#### ✅ What it does
- Initializes the plugin, settings, and logger
- Registers the command palette item
- Sets up the enhanced settings tab with provider selection
- Creates and configures the content type registry and provider registry
- Delegates to the orchestrator for the main functionality

#### 🧱 Implementation

```ts
export default class ObsidianImporterPlugin extends Plugin {
  settings: PluginSettings;
  contentTypeRegistry: ContentTypeRegistry;
  providerRegistry: LLMProviderRegistry;
  
  async onload() {
    // Initialize registries
    this.contentTypeRegistry = new ContentTypeRegistry();
    this.providerRegistry = new LLMProviderRegistry();
    
    // Register content handlers
    this.contentTypeRegistry.register(new YouTubeHandler());
    this.contentTypeRegistry.register(new MediumHandler());
    this.contentTypeRegistry.register(new GoodreadsHandler());
    this.contentTypeRegistry.register(new RecipeHandler());
    this.contentTypeRegistry.register(new RestaurantHandler());
    this.contentTypeRegistry.register(new MovieHandler());
    
    // Register LLM providers
    this.providerRegistry.register(new RequestyProvider());
    this.providerRegistry.register(new OpenRouterProvider());
    this.providerRegistry.register(new OpenAIProvider());
    this.providerRegistry.register(new OllamaProvider());
    
    // Load settings
    await this.loadSettings();
    
    // Register command
    this.addCommand({
      id: 'import-from-url',
      name: 'Import from URL',
      callback: () => new UrlInputModal(this.app, this).open()
    });
    
    // Add settings tab
    this.addSettingTab(new ImprovedSettingTab(this.app, this));
  }
}
```

### 2.2 URL Input Modal (UI Layer)

The URL input modal is enhanced with improved progress reporting while maintaining its simple interface:

```ts
export class UrlInputModal extends Modal {
  constructor(app: App, plugin: ObsidianImporterPlugin) {
    super(app);
    this.plugin = plugin;
  }
  
  onOpen() {
    // Similar to MVP implementation, with enhanced progress reporting
    
    // Create orchestrator with current provider from settings
    const currentProvider = this.plugin.providerRegistry.getProvider(
      this.plugin.settings.selectedProvider
    );
    
    const orchestrator = createImportPipelineOrchestrator(
      this.app,
      this.plugin.settings,
      getLogger(),
      currentProvider,
      this.plugin.contentTypeRegistry
    );
    
    // Setup UI elements with improved progress reporting
    
    // Track progress with percentage/step information
    orchestrator.on('progress', (stage, detail, stepNumber, totalSteps) => {
      // Update progress display with more detailed information
    });
    
    // Handle completion by opening the created note
    orchestrator.on('complete', (notePath) => {
      this.close();
      // Open the created note
      this.app.workspace.openLinkText(notePath, '', true);
    });
  }
}
```

### 2.3 Content Type Registry

A new component for V2 that manages content type handlers and implements an efficient detection strategy:

```ts
export class ContentTypeRegistry {
  private handlers: ContentTypeHandler[] = [];
  private detectionCache: Map<string, string> = new Map();
  private pageContentCache: Map<string, string> = new Map();
  
  register(handler: ContentTypeHandler): void {
    this.handlers.push(handler);
  }
  
  async detectContentType(url: string): Promise<ContentTypeHandler> {
    // Check cache first
    if (this.detectionCache.has(url)) {
      const handlerType = this.detectionCache.get(url);
      return this.handlers.find(h => h.type === handlerType)!;
    }
    
    // URL-based detection first (fast)
    for (const handler of this.handlers) {
      if (await handler.canHandleUrl(new URL(url))) {
        this.detectionCache.set(url, handler.type);
        return handler;
      }
    }
    
    // Content-based detection for generic types (expensive)
    // Only fetch the content once and cache it
    if (!this.pageContentCache.has(url)) {
      const content = await fetchWebPageContent(url);
      this.pageContentCache.set(url, content);
    }
    
    const pageContent = this.pageContentCache.get(url)!;
    
    // Use LLM to determine content type for generic handlers
    // Group the handlers that need content-based detection
    const genericHandlers = this.handlers.filter(
      h => h.requiresContentDetection()
    );
    
    if (genericHandlers.length > 0) {
      const contentType = await this.determineContentTypeWithLLM(
        url, pageContent, genericHandlers.map(h => h.type)
      );
      
      const handler = this.handlers.find(h => h.type === contentType);
      if (handler) {
        this.detectionCache.set(url, handler.type);
        return handler;
      }
    }
    
    throw new Error("Could not determine content type for this URL");
  }
  
  private async determineContentTypeWithLLM(
    url: string, 
    content: string, 
    possibleTypes: string[]
  ): Promise<string> {
    // Implement LLM-based content type detection
    // This is called only once per URL for generic content types
    // Return the detected content type
  }
  
  // Clear cache methods for testing and memory management
  clearCache(): void {
    this.detectionCache.clear();
    this.pageContentCache.clear();
  }
}
```

### 2.4 Enhanced Content Type Handler Interface

The content type handler interface is expanded to support the V2 requirements:

```ts
export interface ContentTypeHandler {
  type: string;
  
  // For URL-based detection
  canHandleUrl(url: URL): Promise<boolean>;
  
  // Does this handler require content-based detection?
  requiresContentDetection(): boolean;
  
  // Core functionality
  downloadContent(url: string, cachedContent?: string): Promise<any>;
  getPrompt(content: any): string;
  parseLLMResponse(response: string): any;
  validateLLMOutput(parsed: any): boolean;
  getNoteContent(llmResponse: string, metadata: ContentMetadata): string;
  getFolderName(): string;
  
  // For error handling
  getRequiredApiKeys(): string[];
}
```

## 2.5 LLM Provider Registry and Interface

The LLM provider architecture follows a hierarchy pattern to maximize code reuse while maintaining flexibility:

```typescript
// Base LLM Provider Interface
export interface LLMProvider {
  getName(): string;
  getDefaultEndpoint(): string;
  getAvailableModels(): Promise<ModelInfo[]>;
  callLLM(prompt: string, options?: LLMOptions): Promise<string>;
  validateConnection(): Promise<boolean>;
  requiresApiKey(): boolean;
  requiresEndpoint(): boolean;
}

// Base class for OpenAI-compatible providers
export abstract class BaseOpenAIProvider implements LLMProvider {
  protected apiKey: string;
  protected endpoint: string;
  protected modelId: string;

  constructor(apiKey: string, endpoint: string, modelId: string) {
    this.apiKey = apiKey;
    this.endpoint = endpoint;
    this.modelId = modelId;
  }

  // Shared implementation for all OpenAI-compatible APIs
  async callLLM(prompt: string, options?: LLMOptions): Promise<string> {
    const endpoint = options?.endpoint || this.endpoint;
    const model = options?.model || this.modelId;
    
    try {
      const response = await fetch(`${endpoint}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: 'system', content: 'You are a helpful assistant that analyzes content.' },
            { role: 'user', content: prompt }
          ],
          temperature: options?.temperature || 0.3,
          max_tokens: options?.maxTokens || 1000
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new LLMAPIError(
          `API request failed: ${response.status} ${response.statusText}`,
          response.status,
          errorData
        );
      }
      
      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      // Enhanced error handling with provider-specific context
      if (error instanceof LLMAPIError) {
        throw error;
      }
      throw new LLMAPIError(`Error calling ${this.getName()} API: ${error.message}`, 500, {});
    }
  }

  // Methods that must be implemented by specific providers
  abstract getName(): string;
  abstract getDefaultEndpoint(): string;
  abstract getAvailableModels(): Promise<ModelInfo[]>;
  
  // Default implementations that can be overridden
  async validateConnection(): Promise<boolean> {
    try {
      await this.getAvailableModels();
      return true;
    } catch (error) {
      return false;
    }
  }
  
  requiresApiKey(): boolean {
    return true; // Most OpenAI-compatible providers require an API key
  }
  
  requiresEndpoint(): boolean {
    return true; // Most OpenAI-compatible providers allow custom endpoints
  }
}

// Provider registry for managing multiple LLM providers
export class LLMProviderRegistry {
  private providers: Map<string, LLMProvider> = new Map();
  
  register(provider: LLMProvider): void {
    this.providers.set(provider.getName(), provider);
  }
  
  getProvider(name: string): LLMProvider {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new Error(`Provider ${name} not found`);
    }
    return provider;
  }
  
  getProviderNames(): string[] {
    return Array.from(this.providers.keys());
  }
}
```

### 2.6 Enhanced Orchestrator

The orchestrator is enhanced to work with the new registries and provide detailed progress reporting:

```ts
export class ImportPipelineOrchestrator {
  private deps: ImportPipelineDependencies;
  private progressListeners: ProgressListener[] = [];
  private errorListeners: ErrorListener[] = [];
  private completeListeners: CompleteListener[] = [];
  
  constructor(deps: ImportPipelineDependencies) {
    this.deps = deps;
  }
  
  async import(url: string): Promise<void> {
    const TOTAL_STEPS = 5;
    let currentStep = 0;
    
    try {
      // Stage 1: URL validation
      this.emitProgress('validating_url', 'Validating URL', ++currentStep, TOTAL_STEPS);
      // Implementation
      
      // Stage 2: Content type detection
      this.emitProgress('detecting_content_type', 'Detecting content type', ++currentStep, TOTAL_STEPS);
      const handler = await this.deps.contentTypeRegistry.detectContentType(url);
      
      // Stage 3: Content download
      this.emitProgress('downloading_content', `Downloading ${handler.type} content`, ++currentStep, TOTAL_STEPS);
      // Implementation
      
      // Stage 4: LLM processing
      this.emitProgress('processing_with_llm', 'Processing with LLM', ++currentStep, TOTAL_STEPS);
      // Implementation
      
      // Stage 5: Note creation
      this.emitProgress('writing_note', 'Creating note in Obsidian', ++currentStep, TOTAL_STEPS);
      // Implementation
      
      // Complete
      this.emitComplete(notePath);
      
    } catch (error) {
      this.handleError(error);
    }
  }
  
  private emitProgress(stage: string, message: string, step: number, totalSteps: number): void {
    for (const listener of this.progressListeners) {
      listener(stage, message, step, totalSteps);
    }
  }
  
  // Event subscription methods
  on(event: 'progress', listener: ProgressListener): void;
  on(event: 'error', listener: ErrorListener): void;
  on(event: 'complete', listener: CompleteListener): void;
  on(event: string, listener: any): void {
    switch (event) {
      case 'progress':
        this.progressListeners.push(listener as ProgressListener);
        break;
      case 'error':
        this.errorListeners.push(listener as ErrorListener);
        break;
      case 'complete':
        this.completeListeners.push(listener as CompleteListener);
        break;
    }
  }
}
```

### 2.7 Factory Method Enhancement

The factory method for creating the orchestrator is enhanced to work with the new architecture:

```ts
export async function createImportPipelineOrchestrator(
  app: App,
  settings: PluginSettings,
  logger: ReturnType<typeof getLogger>,
  llmProvider: LLMProvider,
  contentTypeRegistry: ContentTypeRegistry
) {
  // Create orchestrator with dependencies including the registries
  return new ImportPipelineOrchestrator({
    settings,
    llmProvider,
    noteWriter: new NoteWriter(app),
    logger,
    contentTypeRegistry
  });
}
```

---

## 3. Enhanced Settings

### 3.1 Provider Selection UI

```ts
export class ImprovedSettingTab extends PluginSettingTab {
  display(): void {
    const { containerEl } = this;
    
    containerEl.empty();
    
    new Setting(containerEl)
      .setName('LLM Provider')
      .setDesc('Select which provider to use for LLM processing')
      .addDropdown(dropdown => {
        // Get provider names from registry
        const providers = this.plugin.providerRegistry.getProviderNames();
        providers.forEach(providerName => {
          dropdown.addOption(providerName, providerName);
        });
        
        dropdown.setValue(this.plugin.settings.selectedProvider);
        dropdown.onChange(async (value) => {
          this.plugin.settings.selectedProvider = value;
          
          // Update provider-specific fields
          this.updateProviderSpecificSettings();
          
          await this.plugin.saveSettings();
        });
      });
      
    // Provider-specific settings container
    const providerSettingsContainer = containerEl.createDiv();
    this.renderProviderSpecificSettings(providerSettingsContainer);
  }
  
  private renderProviderSpecificSettings(container: HTMLElement): void {
    const provider = this.plugin.providerRegistry.getProvider(
      this.plugin.settings.selectedProvider
    );
    
    container.empty();
    
    // API Key if needed
    if (provider.requiresApiKey()) {
      new Setting(container)
        .setName('API Key')
        .setDesc(`API Key for ${provider.getName()}`)
        .addText(text => {
          text.setPlaceholder('Enter API key')
            .setValue(this.plugin.settings.apiKeys[provider.getName()] || '')
            .onChange(async (value) => {
              this.plugin.settings.apiKeys[provider.getName()] = value;
              await this.plugin.saveSettings();
            });
        });
    }
    
    // Endpoint if needed
    if (provider.requiresEndpoint()) {
      new Setting(container)
        .setName('Endpoint')
        .setDesc(`API Endpoint for ${provider.getName()}`)
        .addText(text => {
          text.setPlaceholder('Enter endpoint')
            .setValue(
              this.plugin.settings.endpoints[provider.getName()] || 
              provider.getDefaultEndpoint()
            )
            .onChange(async (value) => {
              this.plugin.settings.endpoints[provider.getName()] = value;
              await this.plugin.saveSettings();
            });
        });
    }
    
    // Model selection
    new Setting(container)
      .setName('Model')
      .setDesc(`Select which model to use with ${provider.getName()}`)
      .addDropdown(async dropdown => {
        try {
          const models = await provider.getAvailableModels();
          models.forEach(model => {
            dropdown.addOption(model.id, `${model.name}`);
          });
          
          dropdown.setValue(this.plugin.settings.models[provider.getName()] || models[0].id);
          dropdown.onChange(async (value) => {
            this.plugin.settings.models[provider.getName()] = value;
            await this.plugin.saveSettings();
          });
        } catch (error) {
          // Handle error getting models
          // Add a text input instead
          dropdown.addOption('custom', 'Custom Model ID');
        }
      });
  }
}
```

---

## 4. Error Handling Enhancement

### 4.1 Actionable Error System

```ts
export enum ErrorCategory {
  NETWORK,
  AUTHENTICATION,
  AUTHORIZATION,
  INVALID_INPUT,
  LLM_FAILURE,
  CONTENT_PROCESSING,
  NOTE_CREATION,
  UNKNOWN
}

export interface EnhancedError {
  category: ErrorCategory;
  stage: string;
  userMessage: string;
  technicalDetails?: string;
  isActionable: boolean;
  suggestedAction?: string;
  error?: unknown;
}

export function categorizeError(error: unknown, stage: string): EnhancedError {
  // Categorize errors and provide actionable information
  
  if (error instanceof NetworkError) {
    return {
      category: ErrorCategory.NETWORK,
      stage,
      userMessage: "Network connection failed",
      isActionable: true,
      suggestedAction: "Check your internet connection and try again"
    };
  }
  
  if (error instanceof AuthenticationError) {
    return {
      category: ErrorCategory.AUTHENTICATION,
      stage,
      userMessage: "Authentication failed with the LLM provider",
      isActionable: true,
      suggestedAction: "Please check your API key in the settings"
    };
  }
  
  // Additional error categories
  
  return {
    category: ErrorCategory.UNKNOWN,
    stage,
    userMessage: "An unexpected error occurred",
    isActionable: false,
    error
  };
}
```

### 4.2 Enhanced Error Handling in Orchestrator

```ts
private handleError(error: unknown, stage: string): void {
  const enhancedError = categorizeError(error, stage);
  
  // Log detailed error for developers
  this.deps.logger.error(
    `Error in ${stage}: ${enhancedError.technicalDetails || enhancedError.userMessage}`,
    enhancedError.error
  );
  
  // Only show actionable errors to users
  if (enhancedError.isActionable) {
    // Show user-friendly notice with suggested action
    new Notice(
      `${enhancedError.userMessage}. ${enhancedError.suggestedAction || ''}`,
      5000
    );
  } else {
    new Notice(
      "An error occurred during import. Check the console for details.",
      3000
    );
  }
  
  // Emit error event for UI to respond
  for (const listener of this.errorListeners) {
    listener(enhancedError);
  }
}
```

---

## 5. Model Implementation for Specific Content Types

### 5.1 Medium Handler

```ts
export class MediumHandler implements ContentTypeHandler {
  type = 'medium';
  
  async canHandleUrl(url: URL): Promise<boolean> {
    return url.hostname === 'medium.com' || 
           url.hostname.endsWith('.medium.com');
  }
  
  requiresContentDetection(): boolean {
    return false;
  }
  
  async downloadContent(url: string): Promise<any> {
    // Fetch the Medium article content
    const content = await fetchWebPageContent(url);
    
    // Parse important metadata
    const title = extractTitle(content);
    const author = extractAuthor(content);
    const publishedDate = extractPublishedDate(content);
    const readingTime = extractReadingTime(content);
    
    return {
      url,
      title,
      author,
      publishedDate,
      readingTime,
      content: extractMainContent(content)
    };
  }
  
  getPrompt(content: any): string {
    return `
      You are reading a Medium article titled "${content.title}" by ${content.author}.
      Please analyze this article and provide:
      1. A concise summary of the main points (3-4 sentences)
      2. 3-5 key highlights or quotes from the article
      3. A list of key topics or concepts discussed
      
      Article content:
      ${content.content}
      
      Format your response in JSON format with the following structure:
      {
        "summary": "The summary text...",
        "highlights": ["Highlight 1", "Highlight 2", ...],
        "topics": ["Topic 1", "Topic 2", ...]
      }
    `;
  }
  
  parseLLMResponse(response: string): any {
    return parseJSONFromString(response);
  }
  
  validateLLMOutput(parsed: any): boolean {
    return (
      parsed &&
      typeof parsed.summary === 'string' &&
      Array.isArray(parsed.highlights) &&
      Array.isArray(parsed.topics)
    );
  }
  
  getNoteContent(llmResponse: any, metadata: any): string {
    return `# ${metadata.title}

Author: ${metadata.author}  🔗 [Read on Medium](${metadata.url})

## Summary
${llmResponse.summary}

## Highlights
${llmResponse.highlights.map(h => `- ${h}`).join('\n')}

## Key Topics
${llmResponse.topics.map(t => `- [[${t}]]`).join('\n')}

## Metadata
- Published: ${metadata.publishedDate}
- Read time: ${metadata.readingTime}
`;
  }
  
  getFolderName(): string {
    return 'Medium Articles';
  }
  
  getRequiredApiKeys(): string[] {
    return []; // No specific API keys required for Medium
  }
}
```

### 5.2 Similar implementations for other content types

Each content type will follow a similar pattern but with specialized:
- URL detection logic
- Content extraction approach
- Prompt engineering
- Note formatting

---

## 6. LLM Provider Implementations

### 6.1 OpenAI-Compatible Providers

```typescript
// OpenAI Provider
export class OpenAIProvider extends BaseOpenAIProvider {
  getName(): string {
    return 'OpenAI';
  }
  
  getDefaultEndpoint(): string {
    return 'https://api.openai.com/v1';
  }
  
  async getAvailableModels(): Promise<ModelInfo[]> {
    // OpenAI-specific implementation for listing models
    const response = await fetch(`${this.endpoint}/models`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.data
      .filter((model: any) => model.id.includes('gpt'))
      .map((model: any) => ({
        id: model.id,
        name: model.id,
        contextWindow: getContextWindowForModel(model.id)
      }));
  }
}

// Requesty Provider
export class RequestyProvider extends BaseOpenAIProvider {
  getName(): string {
    return 'Requesty';
  }
  
  getDefaultEndpoint(): string {
    return 'https://api.requesty.ai/v1';
  }
  
  async getAvailableModels(): Promise<ModelInfo[]> {
    // Requesty-specific implementation or a curated list if API doesn't provide one
    return [
      { id: 'gpt-4', name: 'GPT-4', contextWindow: 8192 },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', contextWindow: 4096 },
      { id: 'claude-3-opus', name: 'Claude 3 Opus', contextWindow: 100000 },
      { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet', contextWindow: 100000 }
    ];
  }
}

// OpenRouter Provider
export class OpenRouterProvider extends BaseOpenAIProvider {
  getName(): string {
    return 'OpenRouter';
  }
  
  getDefaultEndpoint(): string {
    return 'https://openrouter.ai/api/v1';
  }
  
  async getAvailableModels(): Promise<ModelInfo[]> {
    // OpenRouter has an API endpoint to list models
    const response = await fetch(`${this.endpoint}/models`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'HTTP-Referer': 'https://obsidian.md/plugins', // OpenRouter requires this header
        'X-Title': 'Obsidian Importer'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.data.map((model: any) => ({
      id: model.id,
      name: model.name || model.id,
      contextWindow: model.context_length || 4096
    }));
  }
  
  // Override the callLLM method to add OpenRouter-specific headers
  async callLLM(prompt: string, options?: LLMOptions): Promise<string> {
    const customOptions = {
      ...options,
      headers: {
        'HTTP-Referer': 'https://obsidian.md/plugins',
        'X-Title': 'Obsidian Importer'
      }
    };
    return super.callLLM(prompt, customOptions);
  }
}
```

### 6.2 Non-OpenAI Providers

```typescript
// Ollama Provider (non-OpenAI compatible)
export class OllamaProvider implements LLMProvider {
  private endpoint: string;
  private modelId: string;

  constructor(endpoint: string, modelId: string) {
    this.endpoint = endpoint;
    this.modelId = modelId;
  }

  getName(): string {
    return 'Ollama';
  }
  
  getDefaultEndpoint(): string {
    return 'http://localhost:11434';
  }
  
  // Custom implementation specific to Ollama's API
  async callLLM(prompt: string, options?: LLMOptions): Promise<string> {
    const endpoint = options?.endpoint || this.endpoint;
    const model = options?.model || this.modelId;
    
    const response = await fetch(`${endpoint}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        prompt,
        stream: false
      })
    });
    
    if (!response.ok) {
      throw new Error(`Ollama request failed: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.response;
  }
  
  async getAvailableModels(): Promise<ModelInfo[]> {
    try {
      const response = await fetch(`${this.endpoint}/api/tags`);
      const data = await response.json();
      
      return data.models.map((model: any) => ({
        id: model.name,
        name: model.name,
        contextWindow: model.parameters?.context_length || 4096
      }));
    } catch (error) {
      // If can't fetch, return a default list
      return [
        { id: 'llama2', name: 'Llama 2', contextWindow: 4096 },
        { id: 'mistral', name: 'Mistral', contextWindow: 8192 },
        { id: 'orca-mini', name: 'Orca Mini', contextWindow: 4096 }
      ];
    }
  }
  
  validateConnection(): Promise<boolean> {
    return this.getAvailableModels().then(() => true).catch(() => false);
  }
  
  requiresApiKey(): boolean {
    return false; // Ollama doesn't require an API key
  }
  
  requiresEndpoint(): boolean {
    return true; // Ollama requires an endpoint
  }
}
```

---

## 7. Technical Considerations

### 7.1 Performance Optimization

While most operations are I/O bound, several optimizations are implemented:

1. **Content Caching**: The content detection system caches both detection results and page content to avoid redundant network requests and LLM calls
2. **Smart Content Type Detection**: URL-based detection is attempted first before falling back to content-based detection
3. **Selective LLM Usage**: LLM is only used when necessary and with appropriately sized prompts

### 7.2 Error Recovery

The system implements intelligent error recovery:

1. **Network Retries**: Automatic retry with exponential backoff for transient network errors
2. **LLM Response Validation**: Validation of LLM outputs with fallback to structured extraction if JSON parsing fails
3. **Partial Success**: When possible, proceed with note creation even if some metadata extraction fails

### 7.3 Security Considerations

1. **API Key Management**: Uses Obsidian's secure storage for API keys
2. **URL Validation**: Validates and sanitizes URLs before processing
3. **Content Sanitization**: Sanitizes content before processing and note creation
4. **Error Redaction**: Ensures API keys and sensitive information aren't exposed in error messages

---

## 8. Testing Strategy

### 8.1 Unit Tests

- Content type handlers
- LLM providers
- URL validation and sanitization
- Error handling

### 8.2 Integration Tests

- End-to-end import process
- Content type detection system
- Provider switching

### 8.3 Mock Testing

- LLM responses
- Network requests
- File operations

---

## 9. Conclusion

This architecture builds upon the solid foundation of the MVP while adding the flexibility needed for V2's expanded capabilities. The key enhancements are:

1. **Content Type Registry**: For managing and efficiently using multiple content handlers
2. **Provider Registry**: For flexible LLM provider selection
3. **Enhanced Error Handling**: For more actionable user feedback
4. **Improved UI**: For better user experience and progress reporting

The design maintains the orchestrator-based approach while providing clear extension points for future enhancement.