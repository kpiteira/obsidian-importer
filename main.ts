import { Plugin, App } from 'obsidian';
import { ImporterSettingTab } from './src/ui/ImporterSettingTab';
import { PluginSettings, DEFAULT_SETTINGS, loadSettings as loadPluginSettings, saveSettings as savePluginSettings } from './src/utils/settings';
import { UrlInputModal } from './src/ui/UrlInputModal';
import { ImportPipelineOrchestrator, ImportPipelineDependencies, IUrlValidator, IContentTypeDetector, IContentHandler, ILLMProcessor, INoteWriter } from './src/orchestrator/ImportPipelineOrchestrator';
import { isValidExternalUrl } from './src/utils/url';
import { detectContentType } from './src/handlers/typeDispatcher';
import { YouTubeHandler } from './src/handlers/YouTubeHandler';
import { LLMProvider } from './src/services/LLMProvider';
import { RequestyProvider } from './src/services/RequestyProvider';
import { createNoteWithFeedback, generateNoteFilename } from './src/utils/noteWriter';
import { ImporterLogger } from './src/utils/importerLogger';

// Simple IUrlValidator implementation
class SimpleUrlValidator implements IUrlValidator {
  async validate(url: string): Promise<void> {
    if (!isValidExternalUrl(url)) {
      throw new Error('Invalid or unsupported URL.');
    }
  }
}

// Simple IContentTypeDetector implementation
class SimpleContentTypeDetector implements IContentTypeDetector {
  async detect(url: string): Promise<string> {
    const handler = detectContentType(new URL(url));
    if (!handler) throw new Error('Unsupported content type.');
    return handler.type;
  }
}

// IContentHandler implementation for YouTube
class YouTubeContentHandler implements IContentHandler {
  async downloadContent(url: string): Promise<{ content: any; metadata: any }> {
    // For demonstration, just return the URL as content and metadata.
    // In a real implementation, fetch video/transcript/metadata here.
    return { content: url, metadata: { url } };
  }
}

// ILLMProcessor adapter for OpenRouterProvider
class LLMProcessorAdapter implements ILLMProcessor {
  private provider: LLMProvider;
  constructor(provider: LLMProvider) {
    this.provider = provider;
  }
  async process(content: any, metadata?: any): Promise<string> {
    // For demonstration, just return the content as a string.
    // In a real implementation, call the provider's LLM API.
    if (typeof content === 'string') return content;
    return JSON.stringify(content);
  }
}

// INoteWriter wrapper for createNoteWithFeedback
class ObsidianNoteWriter implements INoteWriter {
  private app: App;
  constructor(app: App) {
    this.app = app;
  }
  async writeNote(content: string, metadata?: any): Promise<string> {
    // Use metadata to determine folder/filename, or use defaults
    const folderPath = (metadata && metadata.folderPath) || 'Imported';
    const filename = (metadata && metadata.filename) || generateNoteFilename('Imported Note');
    await createNoteWithFeedback(this.app, folderPath, filename, content);
    return `${folderPath}/${filename}`;
  }
}

export default class MyPlugin extends Plugin {
  settings: PluginSettings;

  async onload() {
    await this.loadSettings();

    // Instantiate the logger with debug mode from settings
    const logger = new ImporterLogger({
      debug: this.settings.debug,
      pluginName: "ObsidianImporter"
    });

    // Construct orchestrator dependencies
    const orchestratorDeps: ImportPipelineDependencies = {
      urlValidator: new SimpleUrlValidator(),
      contentTypeDetector: new SimpleContentTypeDetector(),
      contentHandlers: {
        youtube: new YouTubeContentHandler()
      },
      llmProcessor: new LLMProcessorAdapter(new RequestyProvider()),
      noteWriter: new ObsidianNoteWriter(this.app),
      logger
    };

    this.addCommand({
      id: 'open-url-input-modal',
      name: 'Import from URL...',
      callback: () => {
        new UrlInputModal(this.app, orchestratorDeps).open();
      }
    });

    this.addSettingTab(new ImporterSettingTab(this.app, this));
  }

  onunload() {}

  async loadSettings() {
    this.settings = await loadPluginSettings(this);
  }

  async saveSettings() {
    await savePluginSettings(this, this.settings);
  }
}
