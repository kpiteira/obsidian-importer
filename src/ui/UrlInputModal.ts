import { Modal, App, Notice } from 'obsidian';
import { isValidExternalUrl } from '../utils/url';
import { ImportPipelineOrchestrator, ImportPipelineDependencies, ImportPipelineProgress, ImportPipelineError } from '../orchestrator/ImportPipelineOrchestrator';
import { LLMProviderRegistry } from '../services/LLMProviderRegistry';
import { ContentTypeRegistry } from '../handlers/ContentTypeRegistry';

/**
 * UrlInputModal
 * A modal for entering a URL, following Obsidian's modal UI conventions.
 * Refactored to delegate all import pipeline logic to ImportPipelineOrchestrator.
 */
export class UrlInputModal extends Modal {
  private errorEl: HTMLElement | null = null;
  private ribbonEl: HTMLElement | null = null;
  private progressDetailEl: HTMLElement | null = null; // New element for detailed progress
  private inputEl: HTMLInputElement | null = null;
  private settings: any;
  private logger: any;
  private providerRegistry: LLMProviderRegistry | null = null;
  private contentTypeRegistry: ContentTypeRegistry | null = null;  // Add ContentTypeRegistry
  private progressUnsub: (() => void) | null = null;
  private errorUnsub: (() => void) | null = null;
  private pipelineActive: boolean = false;

  constructor(
    app: App, 
    settings: any, 
    logger: any, 
    providerRegistry?: LLMProviderRegistry,
    contentTypeRegistry?: ContentTypeRegistry  // Add ContentTypeRegistry parameter
  ) {
    super(app);
    this.settings = settings;
    this.logger = logger;
    this.providerRegistry = providerRegistry || null;
    this.contentTypeRegistry = contentTypeRegistry || null;  // Store ContentTypeRegistry
  }

  onOpen() {
    const { contentEl, titleEl } = this;
    // Set modal title
    titleEl.setText('Enter URL to Import');
    // Apply Obsidian modal styling conventions
    contentEl.empty();
    contentEl.addClass('obsidian-importer-url-input-modal');
    // Create input field for URL entry
    this.inputEl = contentEl.createEl('input', {
      type: 'text',
      cls: 'obsidian-importer-url-input',
      attr: { placeholder: 'Paste or type a URL...' }
    });
    const inputEl = this.inputEl;

    // Progress ribbon element (hidden by default)
    this.ribbonEl = contentEl.createEl('div', {
      cls: 'obsidian-importer-detection-ribbon',
      text: ''
    });
    const ribbonEl = this.ribbonEl;
    ribbonEl.style.display = 'none';
    
    // Progress detail element for showing step count and percentage (hidden by default)
    this.progressDetailEl = contentEl.createEl('div', {
      cls: 'obsidian-importer-progress-detail',
      text: ''
    });
    const progressDetailEl = this.progressDetailEl;
    progressDetailEl.style.display = 'none';
    progressDetailEl.style.marginTop = '0.5em';
    progressDetailEl.style.fontSize = '0.9em';
    progressDetailEl.style.opacity = '0.8';

    // Error message element (hidden by default)
    this.errorEl = contentEl.createEl('div', {
      cls: 'obsidian-importer-url-input-error',
      text: ''
    });
    this.errorEl.setAttr('aria-live', 'polite');
    this.errorEl.setAttr('role', 'alert');
    this.errorEl.setAttr('tabindex', '-1');
    this.errorEl.style.color = 'var(--color-red, #e03131)';
    this.errorEl.style.marginTop = '0.75em';
    this.errorEl.style.display = 'none';

    // Autofocus the input when modal opens
    window.setTimeout(() => {
      inputEl.focus();
    }, 0);

    // Handle Enter key: validate URL, then call onSubmit
    inputEl.addEventListener('keydown', (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        const urlStr = inputEl.value.trim();

        // Always reset ribbon and error state at the start of a new import
        ribbonEl.style.display = 'none';
        ribbonEl.textContent = '';
        ribbonEl.classList.remove('obsidian-importer-detection-ribbon-success', 'obsidian-importer-detection-ribbon-error');
        progressDetailEl.style.display = 'none';
        progressDetailEl.textContent = '';
        this.clearError();

        if (!isValidExternalUrl(urlStr)) {
          this.showError('Please enter a valid, public URL (no localhost or private IPs).');
          return;
        }

        // Disable input and show progress
        inputEl.disabled = true;
        ribbonEl.style.display = '';
        ribbonEl.textContent = 'Starting import...';
        ribbonEl.classList.remove('obsidian-importer-detection-ribbon-success', 'obsidian-importer-detection-ribbon-error');

        // Start the async pipeline, wiring up orchestrator events for UI updates and modal closing
        (async () => {
          try {
            const { createImportPipelineOrchestrator } = await import('../orchestrator/orchestratorFactory');
            // Pass both registries to the orchestrator factory
            const orchestrator = await createImportPipelineOrchestrator(
              this.app, 
              this.settings, 
              this.logger, 
              this.providerRegistry || undefined,
              this.contentTypeRegistry || undefined  // Pass ContentTypeRegistry
            );

            orchestrator.onProgress((progress) => {
              ribbonEl.style.display = '';
              progressDetailEl.style.display = '';
              
              if (progress.stage === 'completed') {
                ribbonEl.textContent = 'Import complete!';
                progressDetailEl.textContent = 'Finalizing and opening note...';
                ribbonEl.classList.add('obsidian-importer-detection-ribbon-success');
                inputEl.disabled = false;
                return;
              }
              
              // For all other stages, show enhanced progress information
              const percentComplete = Math.round((progress.step / progress.totalSteps) * 100);
              ribbonEl.textContent = progress.message;
              progressDetailEl.textContent = `Step ${progress.step}/${progress.totalSteps} (${percentComplete}% complete)`;
              
              // Add content type specific detail if available
              if (progress.stage === 'downloading_content' && progress.contentType) {
                progressDetailEl.textContent += ` - ${progress.contentType}`;
              }
            });

            orchestrator.onError((err) => {
              const msg = err?.userMessage || String(err);
              ribbonEl.style.display = '';
              ribbonEl.textContent = 'Error: ' + msg;
              ribbonEl.classList.add('obsidian-importer-detection-ribbon-error');
              progressDetailEl.style.display = 'none';
              this.showError(msg);
              inputEl.disabled = false;
            });
            
            // Add complete handler to open the created note
            orchestrator.onComplete((notePath) => {
              setTimeout(() => {
                this.close();
                // Open the created note in Obsidian
                this.app.workspace.openLinkText(notePath, '', true);
              }, 500); // Small delay to ensure the UI shows the completion message
            });

            await orchestrator.run(urlStr);
          } catch (err: any) {
            const msg = err?.userMessage || err?.message || String(err);
            ribbonEl.style.display = '';
            ribbonEl.textContent = 'Error: ' + msg;
            ribbonEl.classList.add('obsidian-importer-detection-ribbon-error');
            progressDetailEl.style.display = 'none';
            this.showError(msg);
            inputEl.disabled = false;
          }
        })();
      }
    });
  }

  private showError(message: string) {
    if (this.errorEl) {
      this.errorEl.textContent = message;
      this.errorEl.style.display = '';
      this.errorEl.focus();
    }
  }

  private clearError() {
    if (this.errorEl) {
      this.errorEl.textContent = '';
      this.errorEl.style.display = 'none';
    }
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
    this.errorEl = null;
    this.ribbonEl = null;
    this.progressDetailEl = null;
    this.inputEl = null;
    // Defensive: ensure no progress ribbon or error is left visible
    // (in case modal is closed before pipeline completes)
    // This is safe because contentEl is emptied above.
  }
}