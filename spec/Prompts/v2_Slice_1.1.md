# Implementation Prompt for Slice 1.1: Base Provider Interface and Registry

```
I'm implementing Slice 1.1: Base Provider Interface and Registry from my Obsidian Importer V2 plan.

Goal: Refactor the LLM service to support multiple providers while maintaining existing YouTube functionality.

The implementation tasks are:
- Create `LLMProvider` interface with core methods
- Implement abstract `BaseOpenAIProvider` class for common functionality
- Create `LLMProviderRegistry` to manage providers
- Refactor existing provider as subclass of `BaseOpenAIProvider`
- Update factory to use the new provider structure
- Ensure existing YouTube functionality works with refactored provider

Here are the relevant sections from my architecture document:

## LLM Provider Registry and Interface

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
    
    // Implementation details
  }

  // Abstract methods to be implemented by specific providers
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

## Factory Method Enhancement

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

The relevant requirements from the PRD are:

### Enhanced LLM Integration

- Implement a dropdown menu in settings for selecting LLM providers:
  - Requesty
  - OpenRouter
  - OpenAI
  - Local (e.g., Ollama)
- Remote Providers: Auto-configure endpoints based on provider selection
- Local Provider: Additional field for specifying endpoint URL
- Implement a model selection dropdown that updates based on selected provider
- Use Obsidian's secret management system to securely store API keys
- Remember previously entered keys for each provider
- Implement a "Test Connection" button to validate API settings

Here's the existing related code that this needs to integrate with:

```typescript
// The current provider implementation
export class RequestyProvider {
  private apiKey: string;
  
  constructor(apiKeyGetter: () => string) {
    this.apiKey = apiKeyGetter();
  }
  
  async callLLM(prompt: string): Promise<string> {
    const response = await fetch("https://api.requesty.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4-turbo",
        messages: [
          { role: "system", content: "You are a helpful assistant that analyzes content." },
          { role: "user", content: prompt }
        ],
        temperature: 0.3
      })
    });
    
    if (!response.ok) {
      throw new Error(`Requesty API request failed: ${response.status}`);
    }
    
    const data = await response.json();
    return data.choices[0].message.content;
  }
}

// The current factory function that creates the orchestrator
export async function createImportPipelineOrchestrator(app: App, settings: PluginSettings, logger: ReturnType<typeof getLogger>) {
  // Create Requesty provider
  const requestyProvider = new RequestyProvider(() => settings.apiKey);
  
  // Use note writer
  const noteWriter = new NoteWriter(app);
  
  // Create orchestrator with dependencies
  return new ImportPipelineOrchestrator({
    settings,
    llmProvider: requestyProvider,
    noteWriter,
    logger
  });
}

// Current plugin settings interface
export interface PluginSettings {
  apiKey: string;
  debug: boolean;
}

// The orchestrator that uses the provider
export class ImportPipelineOrchestrator {
  private deps: {
    settings: PluginSettings;
    llmProvider: RequestyProvider;
    noteWriter: NoteWriter;
    logger: Logger;
  };
  
  constructor(deps: {
    settings: PluginSettings;
    llmProvider: RequestyProvider;
    noteWriter: NoteWriter;
    logger: Logger;
  }) {
    this.deps = deps;
  }
  
  async processWithLLM(prompt: string): Promise<string> {
    return this.deps.llmProvider.callLLM(prompt);
  }
  
  // Other methods
}
```

Please provide:
1. All files that need to be created or modified with complete implementations
2. Unit tests that verify the core functionality
3. Any integration code needed to connect this with existing components
4. Instructions for manually testing this slice in Obsidian

When complete, I should be able to use my existing YouTube import functionality with the new provider architecture, and have the foundation in place for adding additional providers in future slices.
```

This implementation prompt gives the AI coder everything they need to implement Slice 1.1, including:

1. The clear goal and tasks
2. The relevant architecture design for LLM providers
3. The PRD requirements specifically for LLM integration
4. The existing code structure they need to modify
5. Clear expectations for deliverables and testing criteria

The AI can now produce a complete implementation that follows your architectural design while ensuring the existing functionality continues to work.This implementation prompt gives the AI coder everything they need to implement Slice 1.1, including:

1. The clear goal and tasks
2. The relevant architecture design for LLM providers
3. The PRD requirements specifically for LLM integration
4. The existing code structure they need to modify
5. Clear expectations for deliverables and testing criteria

The AI can now produce a complete implementation that follows your architectural design while ensuring the existing functionality continues to work.