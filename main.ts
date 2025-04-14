import { Plugin, App } from 'obsidian';
import { ImporterSettingTab } from './src/ui/ImporterSettingTab';
import { PluginSettings, loadSettings as loadPluginSettings, saveSettings as savePluginSettings } from './src/utils/settings';
import { UrlInputModal } from './src/ui/UrlInputModal';
import { createImportPipelineOrchestrator } from './src/orchestrator/orchestratorFactory';
import { getLogger } from "./src/utils/importerLogger";


export default class MyPlugin extends Plugin {
  settings: PluginSettings;

  async onload() {
    await this.loadSettings();

    // Instantiate the logger with debug mode from settings
    const logger = getLogger();
    logger.setDebugMode(this.settings.debug);

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
    // Log API key presence (not value)
    getLogger().setDebugMode(this.settings.debug);
  }

  async saveSettings() {
    await savePluginSettings(this, this.settings);
  }
}
