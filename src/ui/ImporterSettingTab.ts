import { App, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { PluginSettings, saveSettings } from '../utils/settings';
import { isValidUrl } from '../utils/url';
import { getLogger } from '../utils/importerLogger';

export class ImporterSettingTab extends PluginSettingTab {
  plugin: Plugin & { settings: PluginSettings; saveSettings: () => Promise<void> };

  constructor(app: App, plugin: Plugin & { settings: PluginSettings; saveSettings: () => Promise<void> }) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    // --- Validation state ---
    let apiKeyError = '';
    let endpointError = '';

    // LLM API Key
    const apiKeySetting = new Setting(containerEl)
      .setName('LLM API Key')
      .setDesc('Your API key for the LLM service.')
      .addText(text => {
        text
          .setPlaceholder('Enter API key')
          .setValue(this.plugin.settings.apiKey)
          .inputEl.setAttribute('type', 'password');
        text.onChange(async (value) => {
          if (!value.trim()) {
            apiKeyError = 'API key cannot be empty.';
            text.inputEl.classList.add('importer-error');
          } else {
            apiKeyError = '';
            text.inputEl.classList.remove('importer-error');
            this.plugin.settings.apiKey = value;
            await this.plugin.saveSettings();
          }
          // Show/hide error message
          let errorEl = text.inputEl.parentElement?.querySelector('.importer-error-message');
          if (!errorEl && apiKeyError) {
            errorEl = document.createElement('div');
            errorEl.className = 'importer-error-message';
            (errorEl as HTMLElement).style.color = 'red';
            text.inputEl.parentElement?.appendChild(errorEl);
          }
          if (errorEl) errorEl.textContent = apiKeyError;
        });
      });
    // Initial error display for API key
    if (!this.plugin.settings.apiKey.trim()) {
      const input = apiKeySetting.controlEl.querySelector('input');
      if (input) {
        input.classList.add('importer-error');
        const errorEl = document.createElement('div');
        errorEl.className = 'importer-error-message';
        errorEl.style.color = 'red';
        errorEl.textContent = 'API key cannot be empty.';
        input.parentElement?.appendChild(errorEl);
      }
    }

    // LLM Endpoint URL
    const endpointSetting = new Setting(containerEl)
      .setName('LLM Endpoint URL')
      .setDesc('The endpoint URL for the LLM API.')
      .addText(text => {
        text
          .setPlaceholder('https://api.example.com/v1')
          .setValue(this.plugin.settings.llmEndpoint)
          .onChange(async (value) => {
            if (!isValidUrl(value)) {
              endpointError = 'Please enter a valid HTTP(S) URL (not localhost/loopback).';
              text.inputEl.classList.add('importer-error');
            } else {
              endpointError = '';
              text.inputEl.classList.remove('importer-error');
              this.plugin.settings.llmEndpoint = value;
              await this.plugin.saveSettings();
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
    // Initial error display for endpoint
    if (!isValidUrl(this.plugin.settings.llmEndpoint)) {
      const input = endpointSetting.controlEl.querySelector('input');
      if (input) {
        input.classList.add('importer-error');
        const errorEl = document.createElement('div');
        errorEl.className = 'importer-error-message';
        errorEl.style.color = 'red';
        errorEl.textContent = 'Please enter a valid HTTP(S) URL (not localhost/loopback).';
        input.parentElement?.appendChild(errorEl);
      }
    }

    // LLM Model
    new Setting(containerEl)
      .setName('LLM Model')
      .setDesc('The model to use for LLM requests (e.g., gpt-3.5-turbo).')
      .addText(text =>
        text
          .setPlaceholder('gpt-3.5-turbo')
          .setValue(this.plugin.settings.model)
          .onChange(async (value) => {
            this.plugin.settings.model = value;
            await this.plugin.saveSettings();
          })
      );

    // Default Import Folder
    new Setting(containerEl)
      .setName('Default Import Folder')
      .setDesc('The default folder for imported content.')
      .addText(text =>
        text
          .setPlaceholder('Imported/YouTube')
          .setValue(this.plugin.settings.defaultFolder)
          .onChange(async (value) => {
            this.plugin.settings.defaultFolder = value;
            await this.plugin.saveSettings();
          })
      );

    // Debug Mode
    new Setting(containerEl)
      .setName('Debug Mode')
      .setDesc('Enable debug mode for verbose logging.')
      .addToggle(toggle =>
        toggle
          .setValue(this.plugin.settings.debug)
          .onChange(async (value) => {
            this.plugin.settings.debug = value;
            await this.plugin.saveSettings();
            console.log('Setting Debug mode:', value);
            getLogger().setDebugMode(value);
          })
      );

  }
}