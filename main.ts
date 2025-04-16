import { Plugin, App } from 'obsidian';
import { ImporterSettingTab } from './src/ui/ImporterSettingTab';
import { PluginSettings, loadSettings as loadPluginSettings, saveSettings as savePluginSettings } from './src/utils/settings';
import { UrlInputModal } from './src/ui/UrlInputModal';
import { createImportPipelineOrchestrator, createProviderRegistry, createContentTypeRegistry } from './src/orchestrator/orchestratorFactory';
import { getLogger } from "./src/utils/importerLogger";
import { LLMProviderRegistry } from './src/services/LLMProviderRegistry';
import { ContentTypeRegistry } from './src/handlers/ContentTypeRegistry';

export default class MyPlugin extends Plugin {
  settings: PluginSettings;
  providerRegistry: LLMProviderRegistry;
  contentTypeRegistry: ContentTypeRegistry;

  async onload() {
    await this.loadSettings();

    // Instantiate the logger with debug mode from settings
    const logger = getLogger();
    logger.setDebugMode(this.settings.debug);
    
    // Create and initialize the provider registry
    this.providerRegistry = createProviderRegistry(this.settings);
    logger.debugLog("Initialized provider registry", { 
      providers: this.providerRegistry.getProviderNames() 
    });
    
    // Create and initialize the content type registry
    this.contentTypeRegistry = createContentTypeRegistry();
    logger.debugLog("Initialized content type registry", {
      handlers: this.contentTypeRegistry.getHandlers().map(h => h.type)
    });

    // Instantiate orchestrator using the factory with both registries
    const orchestrator = await createImportPipelineOrchestrator(
      this.app, 
      this.settings, 
      logger,
      this.providerRegistry,
      this.contentTypeRegistry
    );

    this.addCommand({
      id: 'open-url-input-modal',
      name: 'Import from URL...',
      callback: () => {
        // Open the modal and pass the registries
        new UrlInputModal(
          this.app, 
          this.settings, 
          logger, 
          this.providerRegistry,
          this.contentTypeRegistry
        ).open();
      }
    });

    this.addSettingTab(new ImporterSettingTab(this.app, this));
  }

  onunload() {}

  async loadSettings() {
    this.settings = await loadPluginSettings(this);
    getLogger().setDebugMode(this.settings.debug);
    
    // Re-initialize registries when settings change
    if (this.providerRegistry) {
      this.providerRegistry.clear();
      this.providerRegistry = createProviderRegistry(this.settings);
    }
    
    // Re-initialize content type registry
    if (this.contentTypeRegistry) {
      this.contentTypeRegistry.clearCache();
      this.contentTypeRegistry = createContentTypeRegistry();
    }
  }

  async saveSettings() {
    await savePluginSettings(this, this.settings);
  }

  /**
   * Refresh providers to pick up setting changes
   * This should be called whenever a setting that affects providers changes
   */
  refreshProviders() {
    const logger = getLogger();
    logger.debugLog("Refreshing provider registry due to settings change");
    
    // Clear and recreate the provider registry with current settings
    if (this.providerRegistry) {
      this.providerRegistry.clear();
      this.providerRegistry = createProviderRegistry(this.settings);
      
      logger.debugLog("Provider registry refreshed", { 
        providers: this.providerRegistry.getProviderNames(),
        selectedProvider: this.settings.selectedProvider
      });
    }
  }
}
