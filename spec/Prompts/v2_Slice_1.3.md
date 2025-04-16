We are continuing the implementation of my Obsidian Importer with the v2. Here is the next task on the list:
I'm implementing Slice 1.3: Implement Additional Providers from my Obsidian Importer V2 plan.

Goal: Implement four specific LLM providers (OpenAI, Requesty, OpenRouter, and Ollama) to give users a choice of LLM services.

The implementation tasks are:
- Create `OpenAIProvider` implementation
- Potentially update `RequestyProvider` implementation
- Create `OpenRouterProvider` implementation
- Create `OllamaProvider` implementation
- Register all providers in the plugin main entry point
- Add model listing functionality to settings UI
- Create tests for each provider with simple API calls (using mocks if needed)
- Verify provider switching works correctly with YouTube imports

Here are the relevant sections from my architecture document:

### 6. LLM Provider Implementations

#### 6.1 OpenAI-Compatible Providers

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

#### 6.2 Non-OpenAI Providers

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

### 2.5 LLM Provider Registry and Interface

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

### 2.1 Entry Point (Plugin Main)
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

The relevant requirements from the PRD are:

### 3. Enhanced LLM Integration

#### 3.1 Provider Selection System
- Implement a dropdown menu in settings for selecting LLM providers:
  - Requesty
  - OpenRouter
  - OpenAI
  - Local (e.g., Ollama)

#### 3.2 Provider-Specific Configurations
- **Remote Providers**: Auto-configure endpoints based on provider selection
- **Local Provider**: Additional field for specifying endpoint URL (e.g., http://localhost:11434/v1)

#### 3.3 Model Listing and Selection
- Implement a model selection dropdown that updates based on selected provider
- For providers with API access to model lists, fetch available models
- For providers without such APIs, maintain a curated list of common models

#### 3.4 API Key Management
- Use Obsidian's secret management system to securely store API keys
- Remember previously entered keys for each provider
- Implement a "Test Connection" button to validate API settings

#### 3.5 Provider Interface
Extend the LLM Provider interface to support multiple providers:

```typescript
export interface LLMProvider {
  getName(): string;
  getAvailableModels(): Promise<string[]>;
  callLLM(prompt: string, options?: LLMOptions): Promise<string>;
  validateConnection(): Promise<boolean>;
}
```

Here's the existing related code that this needs to integrate with:

1. `BaseOpenAIProvider` - The abstract base class already implemented in Slice 1.1
2. `LLMProviderRegistry` - The registry for managing providers implemented in Slice 1.1
3. Main plugin file - To register the new providers
4. Settings UI components - To integrate with model listing functionality
5. Any mocked or stub versions of these providers currently used for testing

Please provide:
1. All files that need to be created or modified with complete implementations
2. Unit tests that verify the core functionality
3. Any integration code needed to connect this with existing components
4. Instructions for manually testing this slice in Obsidian
5. Ensure the build and tests pass, but only those that were written in this task

When complete, I should be able to select from four different LLM providers in the settings UI, configure their API settings, choose from provider-specific model lists, and use any of these providers to successfully import YouTube content.