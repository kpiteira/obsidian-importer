import { Plugin, App } from 'obsidian';
import { ImporterSettingTab } from './src/ui/ImporterSettingTab';
import { PluginSettings, loadSettings as loadPluginSettings, saveSettings as savePluginSettings } from './src/utils/settings';
import { UrlInputModal } from './src/ui/UrlInputModal';
import { createImportPipelineOrchestrator, createProviderRegistry } from './src/orchestrator/orchestratorFactory';
import { getLogger } from "./src/utils/importerLogger";
import { LLMProviderRegistry } from './src/services/LLMProviderRegistry';

export default class MyPlugin extends Plugin {
  settings: PluginSettings;
  providerRegistry: LLMProviderRegistry;

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

    // Instantiate orchestrator using the factory with high-level dependencies only
    const orchestrator = await createImportPipelineOrchestrator(this.app, this.settings, logger);

    this.addCommand({
      id: 'open-url-input-modal',
      name: 'Import from URL...',
      callback: () => {
        // Open the modal and delegate import to orchestrator.run()
        new UrlInputModal(this.app, this.settings, logger).open();
      }
    });
    // Optionally, add other commands that delegate to orchestrator as needed.

    this.addSettingTab(new ImporterSettingTab(this.app, this));
  }

  onunload() {}

  async loadSettings() {
    this.settings = await loadPluginSettings(this);
    getLogger().setDebugMode(this.settings.debug);
    
    // Re-initialize provider registry when settings change
    if (this.providerRegistry) {
      this.providerRegistry.clear();
      this.providerRegistry = createProviderRegistry(this.settings);
    }
  }

  async saveSettings() {
    await savePluginSettings(this, this.settings);
  }
}
