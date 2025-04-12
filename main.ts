import { Plugin, App } from 'obsidian';
import { ImporterSettingTab } from './src/ui/ImporterSettingTab';
import { PluginSettings, loadSettings as loadPluginSettings, saveSettings as savePluginSettings } from './src/utils/settings';
import { UrlInputModal } from './src/ui/UrlInputModal';
import { ImportPipelineOrchestrator } from './src/orchestrator/ImportPipelineOrchestrator';
import { getLogger } from "./src/utils/importerLogger";


export default class MyPlugin extends Plugin {
  settings: PluginSettings;

  async onload() {
    await this.loadSettings();

    // Instantiate the logger with debug mode from settings
    const logger = getLogger();
    logger.setDebugMode(this.settings.debug);

    // --- Dependency wiring for orchestrator ---
    class SimpleUrlValidator {
      async validate(url: string): Promise<void> {
        const { isValidExternalUrl } = await import('./src/utils/url');
        if (!isValidExternalUrl(url)) {
          throw new Error('Invalid or unsupported URL.');
        }
      }
    }
    class SimpleContentTypeDetector {
      async detect(url: string): Promise<string> {
        const { detectContentType } = await import('./src/handlers/typeDispatcher');
        const handler = detectContentType(new URL(url));
        if (!handler) throw new Error('Unsupported content type.');
        return handler.type;
      }
    }
    class LLMProcessorAdapter {
      private provider: any;
      private settings: any;
      constructor(provider: any, settings: any) {
        this.provider = provider;
        this.settings = settings;
      }
      async process(content: any, metadata?: any): Promise<string> {
        const { parseLLMResponse } = await import('./src/services/llmResponseParser');
        const llmInput = {
          content: typeof content === 'string' ? content : JSON.stringify(content),
          ...(metadata && typeof metadata === 'object' ? metadata : {})
        };
        const { apiKey } = this.settings;
        if (!apiKey) throw new Error('LLM API key is missing in settings.');
        const markdown = await this.provider.callLLM(llmInput, apiKey);
        parseLLMResponse(markdown);
        return markdown;
      }
    }
    class ObsidianNoteWriter {
      private noteWriter: any;
      constructor(app: App) {
        const { NoteWriter } = require('./src/utils/noteWriter');
        this.noteWriter = new NoteWriter(app);
      }
      async writeNote(folderPath: string, filename: string, content: string): Promise<string> {
        return await this.noteWriter.writeNote(folderPath, filename, content);
      }
    }
    const { YouTubeHandler } = await import('./src/handlers/YouTubeHandler');
    const { RequestyProvider } = await import('./src/services/RequestyProvider');

    const orchestrator = new ImportPipelineOrchestrator({
      urlValidator: new SimpleUrlValidator(),
      contentTypeDetector: new SimpleContentTypeDetector(),
      contentHandlers: {
        youtube: new YouTubeHandler()
      },
      llmProcessor: new LLMProcessorAdapter(
        new RequestyProvider(() => ({
          endpoint: this.settings.llmEndpoint,
          model: this.settings.model,
          timeoutMs: 60000
        })),
        this.settings
      ),
      noteWriter: new ObsidianNoteWriter(this.app),
      logger
    });

    this.addCommand({
      id: 'open-url-input-modal',
      name: 'Import from URL...',
      callback: () => {
        // Open the modal and delegate import to orchestrator.run()
        new UrlInputModal(this.app, (url: string) => orchestrator.run(url)).open();
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
