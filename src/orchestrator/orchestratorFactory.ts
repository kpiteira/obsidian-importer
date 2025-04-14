import { App } from 'obsidian';
import { ImportPipelineOrchestrator } from './ImportPipelineOrchestrator';
import { PluginSettings } from '../../src/utils/settings';
import { getLogger } from '../../src/utils/importerLogger';
import { NoteWriter } from '../../src/utils/noteWriter';

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
    settings,
    llmProvider: requestyProvider,
    noteWriter: new NoteWriter(app),
    logger
  });
}