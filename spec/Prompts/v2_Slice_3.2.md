We are continuing the implementation of my Obsidian Importer with the v2. Here is the next task on the list:
I'm implementing Slice 3.2: Enhanced Progress Reporting from my Obsidian Importer V2 plan.

Goal: Update the progress indication system to show step count and percentages, add handler-specific progress messages, and automatically open notes after successful import.

The implementation tasks are:
1. Update progress indication system to show step count and percentages
2. Implement handler-specific progress messages
3. Add automatic note opening after successful import
4. Update UI components to display enhanced progress
5. Connect note creation success to automatic opening

Here are the relevant sections from my architecture document:

```ts
export class ImportPipelineOrchestrator {
  private deps: ImportPipelineDependencies;
  private progressListeners: ProgressListener[] = [];
  private errorListeners: ErrorListener[] = [];
  private completeListeners: CompleteListener[] = [];
  
  constructor(deps: ImportPipelineDependencies) {
    this.deps = deps;
  }
  
  async import(url: string): Promise<void> {
    const TOTAL_STEPS = 5;
    let currentStep = 0;
    
    try {
      // Stage 1: URL validation
      this.emitProgress('validating_url', 'Validating URL', ++currentStep, TOTAL_STEPS);
      // Implementation
      
      // Stage 2: Content type detection
      this.emitProgress('detecting_content_type', 'Detecting content type', ++currentStep, TOTAL_STEPS);
      const handler = await this.deps.contentTypeRegistry.detectContentType(url);
      
      // Stage 3: Content download
      this.emitProgress('downloading_content', `Downloading ${handler.type} content`, ++currentStep, TOTAL_STEPS);
      // Implementation
      
      // Stage 4: LLM processing
      this.emitProgress('processing_with_llm', 'Processing with LLM', ++currentStep, TOTAL_STEPS);
      // Implementation
      
      // Stage 5: Note creation
      this.emitProgress('writing_note', 'Creating note in Obsidian', ++currentStep, TOTAL_STEPS);
      // Implementation
      
      // Complete
      this.emitComplete(notePath);
      
    } catch (error) {
      this.handleError(error);
    }
  }
  
  private emitProgress(stage: string, message: string, step: number, totalSteps: number): void {
    for (const listener of this.progressListeners) {
      listener(stage, message, step, totalSteps);
    }
  }
  
  // Event subscription methods
  on(event: 'progress', listener: ProgressListener): void;
  on(event: 'error', listener: ErrorListener): void;
  on(event: 'complete', listener: CompleteListener): void;
  on(event: string, listener: any): void {
    switch (event) {
      case 'progress':
        this.progressListeners.push(listener as ProgressListener);
        break;
      case 'error':
        this.errorListeners.push(listener as ErrorListener);
        break;
      case 'complete':
        this.completeListeners.push(listener as CompleteListener);
        break;
    }
  }
}
```

```ts
export class UrlInputModal extends Modal {
  constructor(app: App, plugin: ObsidianImporterPlugin) {
    super(app);
    this.plugin = plugin;
  }
  
  onOpen() {
    // Similar to MVP implementation, with enhanced progress reporting
    
    // Create orchestrator with current provider from settings
    const currentProvider = this.plugin.providerRegistry.getProvider(
      this.plugin.settings.selectedProvider
    );
    
    const orchestrator = createImportPipelineOrchestrator(
      this.app,
      this.plugin.settings,
      getLogger(),
      currentProvider,
      this.plugin.contentTypeRegistry
    );
    
    // Setup UI elements with improved progress reporting
    
    // Track progress with percentage/step information
    orchestrator.on('progress', (stage, detail, stepNumber, totalSteps) => {
      // Update progress display with more detailed information
    });
    
    // Handle completion by opening the created note
    orchestrator.on('complete', (notePath) => {
      this.close();
      // Open the created note
      this.app.workspace.openLinkText(notePath, '', true);
    });
  }
}
```

The relevant requirements from the PRD are:

```markdown
### 4.2 Import Process Improvements
- Display more detailed progress indicators during import process
- Add percentage or step count to progress indicator (e.g., "Step 2/5: Downloading content")
- Automatically open newly created notes after import completion
- Add a "History" section showing recent imports with status (success/failure)
```

Here's the existing related code that this needs to integrate with:

1. The current `UrlInputModal` class that handles progress updates:
```typescript
// From src/ui/UrlInputModal.ts
export class UrlInputModal extends Modal {
  // ... existing properties ...
  
  onOpen() {
    // ... existing code ...
    
    orchestrator.onProgress((progress) => {
      ribbonEl.style.display = '';
      switch (progress.stage) {
        case 'validating_url':
          ribbonEl.textContent = 'Validating URL...';
          break;
        case 'detecting_content_type':
          ribbonEl.textContent = 'Detecting content type...';
          break;
        case 'downloading_content':
          ribbonEl.textContent = 'Downloading content...';
          break;
        case 'processing_with_llm':
          ribbonEl.textContent = 'Processing with LLM...';
          break;
        case 'writing_note':
          ribbonEl.textContent = 'Writing note...';
          break;
        case 'completed':
          ribbonEl.textContent = 'Import complete!';
          ribbonEl.classList.add('obsidian-importer-detection-ribbon-success');
          inputEl.disabled = false;
          (this as any).closeOnPipelineComplete();
          break;
        default:
          ribbonEl.textContent = '';
      }
    });
  }
}
```

2. The current `ImportPipelineOrchestrator` implementation and interface:
```typescript
// This needs to be updated to use the new progress format with step counts
interface ImportPipelineProgress {
  stage: string;
  notePath?: string;
}

// Progress callback signature needs updating to include step information
type ProgressCallback = (progress: ImportPipelineProgress) => void;
```

Please provide:
1. All files that need to be created or modified with complete implementations
2. Unit tests that verify the core functionality
3. Any integration code needed to connect this with existing components
4. Instructions for manually testing this slice in Obsidian
5. Ensure the build and tests pass, but only those that were written in this task

When complete, I should be able to see detailed step count and percentage information during the import process (like "Step 2/5: Detecting content type"), and have newly created notes automatically open in Obsidian after import.

---