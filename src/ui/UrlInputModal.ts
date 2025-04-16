import { Modal, App, Notice } from 'obsidian';
import { isValidExternalUrl } from '../utils/url';
import { ImportPipelineOrchestrator, ImportPipelineDependencies, ImportPipelineProgress, ImportPipelineError } from '../orchestrator/ImportPipelineOrchestrator';
import { LLMProviderRegistry } from '../services/LLMProviderRegistry';

/**
 * UrlInputModal
 * A modal for entering a URL, following Obsidian's modal UI conventions.
 * Refactored to delegate all import pipeline logic to ImportPipelineOrchestrator.
 */
export class UrlInputModal extends Modal {
  private errorEl: HTMLElement | null = null;
  private ribbonEl: HTMLElement | null = null;
  private inputEl: HTMLInputElement | null = null;
  private settings: any;
  private logger: any;
  private providerRegistry: LLMProviderRegistry | null = null; // Added provider registry
  private progressUnsub: (() => void) | null = null;
  private errorUnsub: (() => void) | null = null;
  private pipelineActive: boolean = false;

  constructor(app: App, settings: any, logger: any, providerRegistry?: LLMProviderRegistry) {
    super(app);
    this.settings = settings;
    this.logger = logger;
    this.providerRegistry = providerRegistry || null;
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
            // Pass the provider registry to the orchestrator factory
            const orchestrator = await createImportPipelineOrchestrator(
              this.app, 
              this.settings, 
              this.logger, 
              this.providerRegistry || undefined
            );

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

            orchestrator.onError((err) => {
              const msg = err?.userMessage || String(err);
              ribbonEl.style.display = '';
              ribbonEl.textContent = 'Error: ' + msg;
              ribbonEl.classList.add('obsidian-importer-detection-ribbon-error');
              this.showError(msg);
              inputEl.disabled = false;
            });

            await orchestrator.run(urlStr);
          } catch (err: any) {
            const msg = err?.userMessage || err?.message || String(err);
            ribbonEl.style.display = '';
            ribbonEl.textContent = 'Error: ' + msg;
            ribbonEl.classList.add('obsidian-importer-detection-ribbon-error');
            this.showError(msg);
            inputEl.disabled = false;
          }
        })();
      }
    });

    // Allow orchestrator/caller to close the modal when pipeline completes
    (this as any).closeOnPipelineComplete = () => {
      this.close();
    };
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
    this.inputEl = null;
    // Defensive: ensure no progress ribbon or error is left visible
    // (in case modal is closed before pipeline completes)
    // This is safe because contentEl is emptied above.
  }
}