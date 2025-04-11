import { Modal, App } from 'obsidian';
import { isValidExternalUrl } from '../utils/url';
import { detectContentType } from '../handlers/typeDispatcher';
/**
 * UrlInputModal
 * A modal for entering a URL, following Obsidian's modal UI conventions.
 * (Input fields and logic will be added in later tasks.)
 */
export class UrlInputModal extends Modal {
  private errorEl: HTMLElement | null = null;

  constructor(app: App) {
    super(app);
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

    // Detection ribbon element (hidden by default)
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

    // Handle Enter key: validate URL, detect content type, and show ribbon or error
    inputEl.addEventListener('keydown', (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        const urlStr = inputEl.value.trim();
        ribbonEl.style.display = 'none';
        ribbonEl.textContent = '';
        if (!isValidExternalUrl(urlStr)) {
          this.showError('Please enter a valid, public URL (no localhost or private IPs).');
        } else {
          this.clearError();
          let url: URL;
          try {
            url = new URL(urlStr);
          } catch {
            this.showError('Invalid URL format.');
            return;
          }
          const handler = detectContentType(url);
          if (handler) {
            ribbonEl.textContent = `Detected: ${handler.type === 'youtube' ? 'YouTube video' : handler.type}`;
            ribbonEl.style.display = '';
            ribbonEl.classList.toggle('obsidian-importer-detection-ribbon-success', true);
            ribbonEl.classList.toggle('obsidian-importer-detection-ribbon-error', false);
          } else {
            ribbonEl.textContent = 'Unsupported content type. Only YouTube videos are currently supported.';
            ribbonEl.style.display = '';
            ribbonEl.classList.toggle('obsidian-importer-detection-ribbon-success', false);
            ribbonEl.classList.toggle('obsidian-importer-detection-ribbon-error', true);
          }
        }
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
  }
}