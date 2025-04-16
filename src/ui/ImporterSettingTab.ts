import { App, Plugin, PluginSettingTab, Setting, Notice } from 'obsidian';
import { PluginSettings, PartialProviderSettings } from '../utils/settings';
import { isValidUrl } from '../utils/url';
import { getLogger } from '../utils/importerLogger';
import { LLMProvider, ProviderType } from '../services/LLMProvider';
import { LLMProviderRegistry } from '../services/LLMProviderRegistry';

export class ImporterSettingTab extends PluginSettingTab {
  plugin: Plugin & { 
    settings: PluginSettings; 
    saveSettings: () => Promise<void>;
    providerRegistry: LLMProviderRegistry;
    refreshProviders: () => void; // Add this method reference
  };
  private providerSettingsContainer!: HTMLElement; // Using definite assignment assertion

  constructor(
    app: App, 
    plugin: Plugin & { 
      settings: PluginSettings; 
      saveSettings: () => Promise<void>;
      providerRegistry: LLMProviderRegistry;
      refreshProviders: () => void; // Add this method reference
    }
  ) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    // Provider Selection Dropdown
    new Setting(containerEl)
      .setName('LLM Provider')
      .setDesc('Select which provider to use for LLM processing')
      .addDropdown(dropdown => {
        // Get provider names from registry
        const providers = this.plugin.providerRegistry.getProviderNames();
        const providerTypes = Object.values(ProviderType);
        
        // Add all available provider types
        providerTypes.forEach(providerType => {
          const displayName = this.getProviderDisplayName(providerType);
          dropdown.addOption(providerType, displayName);
        });
        
        dropdown.setValue(this.plugin.settings.selectedProvider);
        dropdown.onChange(async (value) => {
          this.plugin.settings.selectedProvider = value as ProviderType;
          
          // Update legacy settings for backward compatibility
          const providerSettings = this.plugin.settings.providerSettings[value as ProviderType];
          if (providerSettings) {
            this.plugin.settings.apiKey = providerSettings.apiKey;
            this.plugin.settings.llmEndpoint = providerSettings.endpoint;
            this.plugin.settings.model = providerSettings.model;
          }
          
          await this.plugin.saveSettings();
          this.plugin.refreshProviders(); // Refresh provider instance
          this.renderProviderSpecificSettings();
        });
      });
    
    // Create container for provider-specific settings
    this.providerSettingsContainer = containerEl.createDiv();
    this.providerSettingsContainer.addClass('provider-specific-settings');
    
    // Render provider-specific settings based on selected provider
    this.renderProviderSpecificSettings();
    
    // Default Import Folder (common setting)
    new Setting(containerEl)
      .setName('Default Import Folder')
      .setDesc('The default folder for imported content.')
      .addText(text =>
        text
          .setPlaceholder('Sources')
          .setValue(this.plugin.settings.defaultFolder)
          .onChange(async (value) => {
            this.plugin.settings.defaultFolder = value;
            await this.plugin.saveSettings();
          })
      );

    // Debug Mode (common setting)
    new Setting(containerEl)
      .setName('Debug Mode')
      .setDesc('Enable debug mode for verbose logging.')
      .addToggle(toggle =>
        toggle
          .setValue(this.plugin.settings.debug)
          .onChange(async (value) => {
            this.plugin.settings.debug = value;
            await this.plugin.saveSettings();
            getLogger().setDebugMode(value);
          })
      );
  }

  /**
   * Get a user-friendly display name for a provider type
   */
  private getProviderDisplayName(providerType: string): string {
    switch (providerType) {
      case ProviderType.REQUESTY: return 'Requesty';
      case ProviderType.OPENROUTER: return 'OpenRouter';
      case ProviderType.OPENAI: return 'OpenAI';
      case ProviderType.LOCAL: return 'Local (Ollama/LM Studio)';
      default: return providerType;
    }
  }

  /**
   * Render settings specific to the selected provider
   */
  renderProviderSpecificSettings(): void {
    this.providerSettingsContainer.empty();
    
    const providerType = this.plugin.settings.selectedProvider;
    const provider = this.plugin.providerRegistry.getProviderNames().includes(providerType) 
      ? this.plugin.providerRegistry.getProvider(providerType)
      : null;
    
    // Create section header
    const header = this.providerSettingsContainer.createEl('h3');
    header.setText(this.getProviderDisplayName(providerType) + ' Settings');
    
    this.renderApiKeySetting(providerType, provider);
    this.renderEndpointSetting(providerType, provider);
    this.renderModelSetting(providerType, provider);
    
    // Add test connection button
    this.renderTestConnectionButton(providerType, provider);
  }

  /**
   * Render API key setting for the provider
   */
  private renderApiKeySetting(providerType: string, provider: LLMProvider | null): void {
    // Check if this is the LOCAL provider type - never show API key for Local provider
    if (providerType === ProviderType.LOCAL) {
      return; // Don't render API key for Local provider
    }
    
    // For other providers, only show API key field if provider explicitly requires it or if provider is null
    const requiresApiKey = provider ? provider.requiresApiKey() : true;
    
    if (requiresApiKey) {
      const currentSettings = (this.plugin.settings.providerSettings[providerType as ProviderType] || {}) as PartialProviderSettings;
      
      const apiKeySetting = new Setting(this.providerSettingsContainer)
        .setName('API Key')
        .setDesc(`API Key for ${this.getProviderDisplayName(providerType)}`)
        .addText(text => {
          text
            .setPlaceholder('Enter API key')
            .setValue(currentSettings.apiKey || '')
            .inputEl.setAttribute('type', 'password');
          text.onChange(async (value) => {
            // Update provider-specific setting
            if (!this.plugin.settings.providerSettings[providerType as ProviderType]) {
              this.plugin.settings.providerSettings[providerType as ProviderType] = {
                apiKey: value,
                endpoint: '',
                model: '',
              };
            } else {
              this.plugin.settings.providerSettings[providerType as ProviderType]!.apiKey = value;
            }
            
            // Also update legacy setting for backward compatibility
            this.plugin.settings.apiKey = value;
            
            await this.plugin.saveSettings();
            
            // Refresh provider to pick up new API key
            if (providerType === this.plugin.settings.selectedProvider) {
              this.plugin.refreshProviders();
            }
          });
        });
      
      // Show validation message if applicable
      if (currentSettings && 'apiKeyError' in currentSettings) {
        apiKeySetting.setDesc(`Error: ${(currentSettings as any).apiKeyError}`);
        apiKeySetting.descEl.addClass('settings-error');
      }
    }
  }

  /**
   * Render endpoint setting for the provider
   */
  private renderEndpointSetting(providerType: string, provider: LLMProvider | null): void {
    const requiresEndpoint = provider?.requiresEndpoint() !== false; // Default to true if provider is null
    const defaultEndpoint = provider?.getDefaultEndpoint() || '';
    const currentSettings = (this.plugin.settings.providerSettings[providerType as ProviderType] || {}) as PartialProviderSettings;
    
    if (requiresEndpoint) {
      const endpointSetting = new Setting(this.providerSettingsContainer)
        .setName('Endpoint')
        .setDesc(`API Endpoint for ${this.getProviderDisplayName(providerType)}`)
        .addText(text => {
          text
            .setPlaceholder(defaultEndpoint)
            .setValue(currentSettings.endpoint || defaultEndpoint)
            .onChange(async (value) => {
              let endpointError = '';
              
              // Skip URL validation for local provider
              if (providerType !== ProviderType.LOCAL && !isValidUrl(value)) {
                endpointError = 'Please enter a valid HTTP(S) URL.';
                text.inputEl.classList.add('importer-error');
              } else {
                text.inputEl.classList.remove('importer-error');
                
                // Update provider-specific setting
                if (!this.plugin.settings.providerSettings[providerType as ProviderType]) {
                  this.plugin.settings.providerSettings[providerType as ProviderType] = {
                    apiKey: currentSettings.apiKey || '',
                    endpoint: value,
                    model: currentSettings.model || '',
                  };
                } else {
                  this.plugin.settings.providerSettings[providerType as ProviderType]!.endpoint = value;
                }
                
                // Update legacy setting for backward compatibility
                if (providerType === this.plugin.settings.selectedProvider) {
                  this.plugin.settings.llmEndpoint = value;
                }
                
                await this.plugin.saveSettings();
                
                // Refresh provider to pick up new endpoint
                if (providerType === this.plugin.settings.selectedProvider) {
                  this.plugin.refreshProviders();
                }
              }
              
              // Show/hide error message
              let errorEl = text.inputEl.parentElement?.querySelector('.importer-error-message');
              if (!errorEl && endpointError) {
                errorEl = document.createElement('div');
                errorEl.className = 'importer-error-message';
                (errorEl as HTMLElement).style.color = 'red';
                text.inputEl.parentElement?.appendChild(errorEl);
              }
              if (errorEl) errorEl.textContent = endpointError;
            });
        });
      
      // Initial validation for non-local providers
      if (providerType !== ProviderType.LOCAL && currentSettings.endpoint && !isValidUrl(currentSettings.endpoint)) {
        const input = endpointSetting.controlEl.querySelector('input');
        if (input) {
          input.classList.add('importer-error');
          const errorEl = document.createElement('div');
          errorEl.className = 'importer-error-message';
          errorEl.style.color = 'red';
          errorEl.textContent = 'Please enter a valid HTTP(S) URL.';
          input.parentElement?.appendChild(errorEl);
        }
      }
    }
  }

  /**
   * Render model selection for the provider
   */
  private renderModelSetting(providerType: string, provider: LLMProvider | null): void {
    const currentSettings = (this.plugin.settings.providerSettings[providerType as ProviderType] || {}) as PartialProviderSettings;
    
    const modelSetting = new Setting(this.providerSettingsContainer)
      .setName('Model')
      .setDesc(`Model to use with ${this.getProviderDisplayName(providerType)}`)
      .addText(text => {
        text
          .setPlaceholder('Enter model name')
          .setValue(currentSettings.model || '')
          .onChange(async (value) => {
            // Update provider-specific setting
            if (!this.plugin.settings.providerSettings[providerType as ProviderType]) {
              this.plugin.settings.providerSettings[providerType as ProviderType] = {
                apiKey: currentSettings.apiKey || '',
                endpoint: currentSettings.endpoint || '',
                model: value,
              };
            } else {
              this.plugin.settings.providerSettings[providerType as ProviderType]!.model = value;
            }
            
            // Update legacy setting for backward compatibility
            if (providerType === this.plugin.settings.selectedProvider) {
              this.plugin.settings.model = value;
            }
            
            await this.plugin.saveSettings();
            
            // Refresh provider to pick up new model
            if (providerType === this.plugin.settings.selectedProvider) {
              this.plugin.refreshProviders();
            }
          });
      });
    
    // Add note about available models when a provider is selected
    if (provider) {
      const modelInfoDiv = this.providerSettingsContainer.createDiv();
      modelInfoDiv.addClass('setting-item-description');
      modelInfoDiv.style.marginTop = '-10px';
      modelInfoDiv.style.marginBottom = '15px';
      modelInfoDiv.style.marginLeft = '15px';
      
      const fetchModelsLink = modelInfoDiv.createEl('a');
      fetchModelsLink.textContent = 'Click to fetch available models';
      fetchModelsLink.style.cursor = 'pointer';
      fetchModelsLink.addEventListener('click', async () => {
        fetchModelsLink.textContent = 'Fetching models...';
        
        try {
          const models = await provider.getAvailableModels();
          fetchModelsLink.textContent = 'Available models:';
          modelInfoDiv.innerHTML = '';
          modelInfoDiv.appendChild(fetchModelsLink);
          
          if (models.length > 0) {
            const modelList = modelInfoDiv.createEl('ul');
            modelList.style.marginTop = '5px';
            modelList.style.marginBottom = '5px';
            
            models.forEach(model => {
              const modelItem = modelList.createEl('li');
              const modelLink = modelItem.createEl('a');
              modelLink.textContent = `${model.name} (${model.id})`;
              modelLink.style.cursor = 'pointer';
              modelLink.addEventListener('click', async () => {
                // Update the model field with the selected model ID
                const input = modelSetting.controlEl.querySelector('input');
                if (input) {
                  (input as HTMLInputElement).value = model.id;
                  
                  // Update provider-specific setting
                  if (!this.plugin.settings.providerSettings[providerType as ProviderType]) {
                    this.plugin.settings.providerSettings[providerType as ProviderType] = {
                      apiKey: currentSettings.apiKey || '',
                      endpoint: currentSettings.endpoint || '',
                      model: model.id,
                    };
                  } else {
                    this.plugin.settings.providerSettings[providerType as ProviderType]!.model = model.id;
                  }
                  
                  // Update legacy setting for backward compatibility
                  if (providerType === this.plugin.settings.selectedProvider) {
                    this.plugin.settings.model = model.id;
                  }
                  
                  await this.plugin.saveSettings();
                  
                  // Refresh provider to pick up new model selection
                  if (providerType === this.plugin.settings.selectedProvider) {
                    this.plugin.refreshProviders();
                  }
                }
              });
            });
          } else {
            modelInfoDiv.appendText(' No models found. Check your API key and endpoint.');
          }
        } catch (error) {
          fetchModelsLink.textContent = 'Failed to fetch models. Check connection.';
          getLogger().error('Failed to fetch models', error);
        }
      });
    }
  }
  
  /**
   * Render test connection button
   */
  private renderTestConnectionButton(providerType: string, provider: LLMProvider | null): void {
    const testConnectionSetting = new Setting(this.providerSettingsContainer)
      .setName('Test Connection')
      .setDesc('Verify your connection to the LLM provider')
      .addButton(button => {
        button
          .setButtonText('Test Connection')
          .setCta()
          .onClick(async () => {
            const statusDiv = testConnectionSetting.descEl.createDiv();
            statusDiv.style.marginTop = '10px';
            statusDiv.style.fontWeight = 'bold';
            
            try {
              // Try to get the provider from registry if not provided
              let testProvider = provider;
              
              if (!testProvider) {
                try {
                  // Log the registry state for debugging
                  const registry = this.plugin.providerRegistry;
                  const availableProviders = registry.getProviderNames();
                  getLogger().debugLog("Available providers in registry", availableProviders);
                  
                  // Re-create provider registry to ensure it's fresh
                  if (availableProviders.length === 0) {
                    const { createProviderRegistry } = await import('../orchestrator/orchestratorFactory');
                    this.plugin.providerRegistry = createProviderRegistry(this.plugin.settings);
                  }
                  
                  // Try to get provider from registry, converting to lowercase if needed
                  testProvider = this.plugin.providerRegistry.getProvider(providerType);
                  getLogger().debugLog(`Successfully retrieved provider ${providerType} from registry`);
                } catch (registryError) {
                  // If we can't get the provider from registry, try to create it directly
                  const { createLLMProvider } = await import('../orchestrator/orchestratorFactory');
                  getLogger().debugLog(`Creating provider ${providerType} directly`);
                  testProvider = createLLMProvider(this.plugin.settings);
                }
              }
              
              if (!testProvider) {
                statusDiv.style.color = 'red';
                statusDiv.textContent = `Provider ${providerType} not found in registry.`;
                return;
              }
              
              statusDiv.textContent = 'Testing connection...';
              
              const isValid = await testProvider.validateConnection();
              
              if (isValid) {
                statusDiv.style.color = 'green';
                statusDiv.textContent = '✓ Connection successful!';
              } else {
                statusDiv.style.color = 'red';
                statusDiv.textContent = '✗ Connection failed. Check your settings.';
              }
              
              // Remove status after 5 seconds
              setTimeout(() => {
                statusDiv.remove();
              }, 5000);
              
            } catch (error) {
              statusDiv.style.color = 'red';
              statusDiv.textContent = `✗ Error: ${error instanceof Error ? error.message : String(error)}`;
              
              getLogger().error('Test connection failed', error);
              
              // Remove status after 5 seconds
              setTimeout(() => {
                statusDiv.remove();
              }, 5000);
            }
          });
      });
  }
}