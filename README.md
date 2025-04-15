# Obsidian Importer

![Obsidian Importer Banner](https://raw.githubusercontent.com/username/obsidian-importer/main/resources/banner.png)

An Obsidian plugin that imports content from external URLs, currently supporting YouTube videos with automatic transcription and AI-powered summarization.

## Features

- **URL-to-Note Conversion**: Transform online content into well-structured Obsidian notes with a single command
- **YouTube Support**: Extract transcripts, metadata, and generate AI summaries from YouTube videos
- **AI-Powered Analysis**: Generate summaries, key points, and concept extraction using LLM processing
- **Customizable Storage**: Control where imported notes are stored in your Obsidian vault
- **Progress Reporting**: Clear visual feedback during the import process
- **Error Handling**: Comprehensive error reporting for troubleshooting

## Installation

### From Obsidian Community Plugins

1. Open Obsidian and go to Settings
2. Navigate to "Community Plugins" and disable "Safe Mode" if enabled
3. Click "Browse" and search for "Obsidian Importer"
4. Click "Install" and then "Enable" the plugin

### Manual Installation

1. Download the latest release (`main.js`, `manifest.json`, `styles.css`) from the [GitHub releases page](https://github.com/username/obsidian-importer/releases)
2. Create a folder named `obsidian-importer` in your vault's `.obsidian/plugins/` directory
3. Copy the downloaded files into this folder
4. Restart Obsidian and enable the plugin in Settings → Community Plugins

## Usage

### Basic Usage

1. Open your Obsidian vault
2. Open the Command Palette (`Ctrl/Cmd + P`)
3. Search for "Import from URL..." and select it
4. Paste a YouTube URL into the input field and press Enter
5. Wait for the import process to complete
6. A new note will be created with the imported content

### Example

When you import a YouTube video URL like `https://www.youtube.com/watch?v=dQw4w9WgXcQ`:

1. The plugin validates the URL
2. Detects that it's a YouTube video
3. Downloads the transcript and metadata
4. Processes the content with an LLM
5. Creates a note with the following structure:
   - Video title and metadata
   - AI-generated summary
   - Key points from the video
   - Important concepts mentioned
   - Link back to the original content

## Configuration

Navigate to Settings → Obsidian Importer to configure:

1. **API Key**: Your LLM provider API key (required for AI processing)
2. **LLM Endpoint**: The API endpoint for LLM processing (default: Requesty)
3. **Model**: The AI model to use (default: google/gemini-2.0-flash-exp)
4. **Default Folder**: Where imported notes will be stored (default: "Sources")
5. **Debug Mode**: Enable for detailed logging in the developer console

## LLM Provider Setup

### Requesty Setup (Default)

1. Sign up at [Requesty.io](https://requesty.io)
2. Generate an API key from your account dashboard
3. Copy the API key to your plugin settings

### Other Providers

The plugin supports any OpenAI-compatible API endpoint. To use a different provider:

1. Change the LLM Endpoint URL in settings
2. Enter the appropriate API key
3. Select a compatible model name

## Troubleshooting

### Common Issues

1. **"Invalid URL" Error**
   - Ensure the URL begins with `http://` or `https://`
   - Check that it's not a localhost or private network IP

2. **"Transcript not available" Error**
   - Some YouTube videos don't have transcripts available
   - Try another video or check if manual captions are available

3. **LLM Processing Errors**
   - Verify your API key is entered correctly
   - Check your internet connection
   - Ensure your API key has sufficient credits

### Debug Mode

Enable debug mode in settings to get detailed logs in the developer console:

1. Open Settings → Obsidian Importer
2. Toggle "Debug Mode" on
3. Open Developer Tools (Ctrl/Cmd + Shift + I)
4. Check the console for detailed logs

## Building from Source

1. Clone the repository:
   ```bash
   git clone https://github.com/username/obsidian-importer.git
   ```

2. Install dependencies:
   ```bash
   cd obsidian-importer
   npm install
   ```

3. Build the plugin:
   ```bash
   npm run build
   ```

4. For development with hot reload:
   ```bash
   npm run dev
   ```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [Inspiration by mbramani: obsidian-yt-video-summarizer](https://github.com/mbramani/obsidian-yt-video-summarizer)
- [Obsidian](https://obsidian.md) for the wonderful knowledge base application
- [Requesty.io](https://requesty.io) for LLM API access
