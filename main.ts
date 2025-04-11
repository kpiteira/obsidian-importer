import { Plugin } from 'obsidian';
import { ImporterSettingTab } from './src/ui/ImporterSettingTab';
import { PluginSettings, DEFAULT_SETTINGS, loadSettings as loadPluginSettings, saveSettings as savePluginSettings } from './src/utils/settings';
import { UrlInputModal } from './src/ui/UrlInputModal';
// Remember to rename these classes and interfaces!


export default class MyPlugin extends Plugin {
	settings: PluginSettings;

	async onload() {
		await this.loadSettings();

		this.addCommand({
			id: 'open-url-input-modal',
			name: 'Import from URL...',
			callback: () => {
				new UrlInputModal(this.app).open();
			}
		});

		this.addSettingTab(new ImporterSettingTab(this.app, this));
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = await loadPluginSettings(this);
	}

	async saveSettings() {
		await savePluginSettings(this, this.settings);
	}
}


