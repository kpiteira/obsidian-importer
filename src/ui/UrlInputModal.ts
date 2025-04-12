import { Modal, App } from 'obsidian';
import { isValidExternalUrl, extractYouTubeVideoId } from '../utils/url';
import { fetchYouTubeTranscript, YouTubeTranscriptError } from '../services/YouTubeTranscriptService';
import { detectContentType } from '../handlers/typeDispatcher';
import type { YouTubeVideoData } from '../models/YouTubeVideoData';
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
  private youtubeMetadata: YouTubeVideoData | null = null;

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
            let videoId: string | null = null;
            if (handler.type === 'youtube') {
              videoId = extractYouTubeVideoId(urlStr);
            }
            ribbonEl.textContent = `Detected: ${handler.type === 'youtube' ? 'YouTube video' : handler.type}` +
              (videoId ? ` (ID: ${videoId})` : '');
              // Fetch YouTube oEmbed metadata with error handling
              this.fetchYouTubeOEmbed(urlStr)
                .then(async metadata => {
                  this.youtubeMetadata = metadata;
                  this.clearError();
                  ribbonEl.textContent = `YouTube: ${metadata.title}`;
                  ribbonEl.style.display = '';
                  ribbonEl.classList.toggle('obsidian-importer-detection-ribbon-success', true);
                  ribbonEl.classList.toggle('obsidian-importer-detection-ribbon-error', false);

                  // Attempt to fetch transcript
                  try {
                    const transcript = await fetchYouTubeTranscript(urlStr);
                    this.youtubeMetadata = { ...metadata, transcript };
                    // Extract first line of transcript and update ribbon
                    const firstLine = transcript.split('\n').find(line => line.trim().length > 0) ?? '';
                    ribbonEl.textContent = `YouTube: ${metadata.title} — ${firstLine}`;
                    // Proceed with full note creation (not implemented here)
                    // e.g., this.createNoteWithTranscript(this.youtubeMetadata);
                  } catch (err) {
                    if (err instanceof YouTubeTranscriptError) {
                      // Option 1: Show error message to user
                      this.showError(
                        "No transcript available for this video. A metadata-only note can be created."
                      );
                      // Option 2: Prepare metadata-only note (transcript omitted)
                      this.youtubeMetadata = { ...metadata, transcript: undefined };
                      // Optionally, trigger metadata-only note creation here
                      // e.g., this.createMetadataOnlyNote(this.youtubeMetadata);
                    } else {
                      this.showError(
                        err instanceof Error ? err.message : "Unknown error while fetching transcript."
                      );
                    }
                  }
                })
                .catch((err) => {
                  this.youtubeMetadata = null;
                  this.showError(
                    typeof err === "string"
                      ? err
                      : (err instanceof Error ? err.message : "Failed to fetch YouTube video metadata. Please check the URL or try again later.")
                  );
                  ribbonEl.textContent = "Failed to fetch YouTube video metadata.";
                  ribbonEl.style.display = '';
                  ribbonEl.classList.toggle('obsidian-importer-detection-ribbon-success', false);
                  ribbonEl.classList.toggle('obsidian-importer-detection-ribbon-error', true);
                });
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

  /**
   * Fetch YouTube oEmbed metadata for a given video URL.
   * Only fetches, no error handling or interface typing per requirements.
   */
  private async fetchYouTubeOEmbed(url: string): Promise<YouTubeVideoData> {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
    let response: Response;
    try {
      response = await fetch(oembedUrl);
    } catch (err) {
      throw new Error("Network error while fetching YouTube metadata.");
    }
    if (!response.ok) {
      throw new Error(`YouTube oEmbed API error: ${response.status} ${response.statusText}`);
    }
    let data: any;
    try {
      data = await response.json();
    } catch (err) {
      throw new Error("Invalid response from YouTube oEmbed API.");
    }
    // Validate required fields
    const requiredFields = [
      "title", "author_name", "author_url", "thumbnail_url", "thumbnail_width",
      "thumbnail_height", "provider_name", "provider_url", "html", "width", "height", "version", "type"
    ];
    for (const field of requiredFields) {
      if (!(field in data)) {
        throw new Error(`Missing field in YouTube oEmbed response: ${field}`);
      }
    }
    return {
      videoId: extractYouTubeVideoId(url) ?? "",
      title: data.title,
      author: data.author_name,
      authorUrl: data.author_url,
      thumbnailUrl: data.thumbnail_url,
      thumbnailWidth: data.thumbnail_width,
      thumbnailHeight: data.thumbnail_height,
      providerName: data.provider_name,
      providerUrl: data.provider_url,
      html: data.html,
      width: data.width,
      height: data.height,
      version: data.version,
      type: data.type,
    };
  }


  onClose() {
    const { contentEl } = this;
    contentEl.empty();
    this.errorEl = null;
  }
}