import { Modal, App, Notice } from 'obsidian';
import { isValidExternalUrl } from '../utils/url';
import { ImportPipelineOrchestrator, ImportPipelineDependencies, ImportPipelineProgress, ImportPipelineError } from '../orchestrator/ImportPipelineOrchestrator';

/**
 * UrlInputModal
 * A modal for entering a URL, following Obsidian's modal UI conventions.
 * Refactored to delegate all import pipeline logic to ImportPipelineOrchestrator.
 */
export class UrlInputModal extends Modal {
  private errorEl: HTMLElement | null = null;
  private orchestratorDeps: ImportPipelineDependencies;

  constructor(app: App, orchestratorDeps: ImportPipelineDependencies) {
    super(app);
    this.orchestratorDeps = orchestratorDeps;
  }

  onOpen() {
    const { contentEl, titleEl } = this;
    // Set modal title
    titleEl.setText('Enter URL to Import');
    // Apply Obsidian modal styling conventions
    contentEl.empty();
    contentEl.addClass('obsidian-importer-url-input-modal');
    // Create input field for URL entry
    const inputEl = contentEl.createEl('input', {
      type: 'text',
      cls: 'obsidian-importer-url-input',
      attr: { placeholder: 'Paste or type a URL...' }
    });

    // Progress ribbon element (hidden by default)
    const ribbonEl = contentEl.createEl('div', {
      cls: 'obsidian-importer-detection-ribbon',
      text: ''
    });
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

    // Handle Enter key: validate URL, then run orchestrator
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

        // Instantiate orchestrator and wire up UI
        const orchestrator = new ImportPipelineOrchestrator(this.orchestratorDeps);

        orchestrator.onProgress((progress: ImportPipelineProgress) => {
          // Always clear error state on progress
          this.clearError();
          ribbonEl.classList.remove('obsidian-importer-detection-ribbon-success', 'obsidian-importer-detection-ribbon-error');
          switch (progress.stage) {
            case 'validating_url':
              ribbonEl.textContent = 'Checking link...';
              ribbonEl.style.display = '';
              break;
            case 'detecting_content_type':
              ribbonEl.textContent = 'Analyzing link...';
              ribbonEl.style.display = '';
              break;
            case 'downloading_content':
              ribbonEl.textContent = 'Getting content...';
              ribbonEl.style.display = '';
              break;
            case 'processing_with_llm':
              ribbonEl.textContent = 'Summarizing...';
              ribbonEl.style.display = '';
              break;
            case 'writing_note':
              ribbonEl.textContent = 'Saving note...';
              ribbonEl.style.display = '';
              break;
            case 'completed':
              ribbonEl.textContent = 'Import complete!';
              ribbonEl.style.display = '';
              ribbonEl.classList.add('obsidian-importer-detection-ribbon-success');
              ribbonEl.classList.remove('obsidian-importer-detection-ribbon-error');
              new Notice('Import complete! Note created at: ' + progress.notePath);
              this.close();
              break;
          }
        });

        orchestrator.onError((error: ImportPipelineError) => {
          // Show a clear, actionable error and mark ribbon as error
          this.showError(error.userMessage || 'Something went wrong during import.');
          ribbonEl.textContent = (error.userMessage && !error.userMessage.endsWith('.'))
            ? error.userMessage + '.'
            : (error.userMessage || 'Unknown error');
          ribbonEl.textContent = 'Import failed: ' + ribbonEl.textContent;
          ribbonEl.style.display = '';
          ribbonEl.classList.remove('obsidian-importer-detection-ribbon-success');
          ribbonEl.classList.add('obsidian-importer-detection-ribbon-error');
          new Notice('Import failed: ' + (error.userMessage || 'Unknown error'));
        });

        orchestrator.run(urlStr);
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
    // Defensive: ensure no progress ribbon or error is left visible
    // (in case modal is closed before pipeline completes)
    // This is safe because contentEl is emptied above.
  }
}