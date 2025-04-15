# Implementation Prompt for Slice 1.2: Add Provider-specific Settings

---
I'm implementing Slice 1.2: Add Provider-specific Settings from my Obsidian Importer V2 plan.

Goal: Enhance the plugin settings to support multiple LLM providers and their specific configurations, allowing users to select and configure different providers.

The implementation tasks are:
- Enhance `PluginSettings` to support multiple providers and their settings
- Update settings storage to handle provider-specific configurations
- Create UI components for provider selection dropdown
- Connect settings UI to provider registry
- Update orchestrator to use selected provider from settings
- Add tests to verify settings are stored and retrieved correctly
- Add tests to ensure provider selection persists across plugin reloads

Here are the relevant sections from my architecture document:

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

```typescript
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

```typescript
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

```
3.1 Provider Selection System
- Implement a dropdown menu in settings for selecting LLM providers:
  - Requesty
  - OpenRouter
  - OpenAI
  - Local (e.g., Ollama)

3.2 Provider-Specific Configurations
- **Remote Providers**: Auto-configure endpoints based on provider selection
- **Local Provider**: Additional field for specifying endpoint URL (e.g., http://localhost:11434/v1)

3.3 Model Listing and Selection
- Implement a model selection dropdown that updates based on selected provider
- For providers with API access to model lists, fetch available models
- For providers without such APIs, maintain a curated list of common models

3.4 API Key Management
- Use Obsidian's secret management system to securely store API keys
- Remember previously entered keys for each provider
- Implement a "Test Connection" button to validate API settings
```

Here's the existing related code that this needs to integrate with:

1. The main plugin class (plugin.ts) - Needs to initialize the provider registry
2. The current settings interface (settings.ts) - Needs to be enhanced
3. The settings tab UI (settings-tab.ts) - Needs to be updated with new UI components
4. The orchestrator factory function - Needs to use the selected provider
5. The LLMProvider interface and registry created in Slice 1.1

Please provide:
1. All files that need to be created or modified with complete implementations
2. Unit tests that verify the core functionality
3. Any integration code needed to connect this with existing components
4. Instructions for manually testing this slice in Obsidian

When complete, I should be able to select different LLM providers from the settings UI, configure provider-specific settings (API keys, endpoints, models), and have these settings persist across plugin reloads. The orchestrator should use the selected provider when processing imports.
---