import { App } from 'obsidian';
import { ImportPipelineOrchestrator } from './ImportPipelineOrchestrator';
import { PluginSettings } from '../../src/utils/settings';
import { getLogger } from '../../src/utils/importerLogger';
import type { ContentDownloader } from './ImportPipelineOrchestrator';
import type { IUrlValidator } from './ImportPipelineOrchestrator';
import { NoteWriter } from '../../src/utils/noteWriter';

// SimpleUrlValidator matches IUrlValidator interface
class SimpleUrlValidator implements IUrlValidator {
  async validate(url: string): Promise<void> {
    const { isValidExternalUrl } = await import('../../src/utils/url');
    if (!isValidExternalUrl(url)) {
      throw new Error('Invalid or unsupported URL.');
    }
  }
}

// ContentDownloaderDispatcher implements ContentDownloader interface
class ContentDownloaderDispatcher implements ContentDownloader {
  async downloadContent(url: string): Promise<{ content: any; metadata: any }> {
    const { detectContentType } = await import('../../src/handlers/typeDispatcher');
    const handler = detectContentType(new URL(url));
    if (!handler) throw new Error('Unsupported content type.');
    if (typeof (handler as any).downloadContent === 'function') {
      return (handler as any).downloadContent(url);
    }
    throw new Error('Handler does not support content downloading.');
  }
}


export async function createImportPipelineOrchestrator(
  app: App,
  settings: PluginSettings,
  logger: ReturnType<typeof getLogger>
) {
  const { RequestyProvider } = await import('../../src/services/RequestyProvider');

  // Instantiate RequestyProvider
  const requestyProvider = new RequestyProvider(
    () => ({
      endpoint: settings.llmEndpoint,
      model: settings.model,
      timeoutMs: 60000
    }),
    settings.apiKey
  );

  // Use NoteWriter directly
  const noteWriter = new NoteWriter(app);

  return new ImportPipelineOrchestrator({
    urlValidator: new SimpleUrlValidator(),
    contentDownloader: new ContentDownloaderDispatcher(),
    llmProvider: requestyProvider,
    noteWriter: new NoteWriter(app),
    logger
  });
}