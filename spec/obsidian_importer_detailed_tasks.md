# Obsidian Importer Detailed Task Breakdown

This document breaks down each task into granular, AI-codable subtasks with specific implementation details.

## Project Setup and Configuration

### Task 1.1.1: Scaffold TypeScript project structure
- [x] **Task 1.1.1.1**: Clone the official Obsidian sample plugin template (`https://github.com/obsidianmd/obsidian-sample-plugin`)
- [x] **Task 1.1.1.2**: Update plugin metadata in `manifest.json` with name "Obsidian Importer", ID "obsidian-importer", and appropriate description
- [x] **Task 1.1.1.3**: Create folder structure according to architecture doc: `src/handlers/`, `src/ui/`, `src/utils/`, `src/models/`, `src/services/`
- [x] **Task 1.1.1.4**: Set up TypeScript configuration in `tsconfig.json` with strict type checking and appropriate module resolution

### Task 1.1.2: Set up development environment
- [x] **Task 1.1.2.1**: Install required dependencies for Obsidian plugin development (obsidian, tslib, etc.)
- [x] **Task 1.1.2.2**: Configure build system with npm scripts for development (`npm run dev`) and production builds (`npm run build`)
- [x] **Task 1.1.2.3**: Set up testing environment with Vitest and create initial test structure in a `tests/` folder
- [x] **Task 1.1.2.4**: Create a symlink to Obsidian plugins folder for local testing with instructions in README

### Task 1.1.3: Create settings module
- [x] **Task 1.1.3.1**: Define the `PluginSettings` interface in `settings.ts` with required fields:
  ```typescript
  interface PluginSettings {
    apiKey: string;
    llmEndpoint: string;
    model: string;
    defaultFolder: string;
    debug: boolean; // Added based on architecture doc
  }
  ```
- [x] **Task 1.1.3.2**: Implement settings storage using Obsidian's data API and plugin data interface
- [x] **Task 1.1.3.3**: Create settings tab UI with input fields for LLM configuration (API key, endpoint URL)
- [x] **Task 1.1.3.4**: Add validation logic for API endpoints and keys to prevent runtime errors

### Task 1.1.4: Activate and Display settings Tab
This task wires the previous work done to create the ImporterSettingsTab in main.ts, replacing the default settings from the template to be able to display the implemented settings page
- [x] **Task 1.1.4.1**: Show ImporterSettingsTab in the plugin


## URL Input and Content Detection

### Task 1.2.1: Create URL input modal
- [ ] **Task 1.2.1.1**: Implement `UrlInputModal` class extending Obsidian's Modal component with proper title and styling
- [x] **Task 1.2.1.2**: Add input field for URL with Enter key handling and focus management
- [x] **Task 1.2.1.3**: Implement URL validation function with security checks for localhost/internal IPs (127.0.0.1, 192.168.x.x, etc.)
- [x] **Task 1.2.1.4**: Add error display for invalid URLs with clear user feedback message
- [x] **Task 1.2.1.5**: Add the modal to the main plugin (main.ts), replacing all the sample commands from the template repository

### Task 1.2.2: Implement content type detection
- [x] **Task 1.2.2.1**: Create `ContentTypeHandler` interface with `detect(url: URL): boolean` and `type: string` properties
- [x] **Task 1.2.2.2**: Implement `YouTubeHandler` class for detecting YouTube URLs (youtube.com, youtu.be domains)
- [x] **Task 1.2.2.3**: Create detection dispatcher function to find appropriate handler for a given URL
- [x] **Task 1.2.2.4**: Add error handling for unsupported content types with user-friendly messages
- [x] **Task 1.2.2.5**: Wire this handling to the URL provided in the modal `UrlInputModal` and display a ribbon to say if it detected whether it is a YouTube video or not

## YouTube Content Processing

### Task 1.3.1: Implement YouTube metadata extraction
- [ ] **Task 1.3.1.1**: Create function to extract video ID from various YouTube URL formats (full URL, shortened URL, with timestamps)
- [ ] **Task 1.3.1.2**: Implement metadata fetching using YouTube oEmbed API (`https://www.youtube.com/oembed?url=...&format=json`)
- [ ] **Task 1.3.1.3**: Define `YouTubeVideoData` interface with fields: videoId, title, author, thumbnailUrl, etc.
- [ ] **Task 1.3.1.4**: Add error handling for failed metadata fetches with appropriate fallbacks

### Task 1.3.2: Implement transcript fetching
- [ ] **Task 1.3.2.1**: Research and implement transcript fetching function based on obsidian-yt-video-summarizer approach
- [ ] **Task 1.3.2.2**: Implement transcript fetching with proper error handling for unavailable transcripts
- [ ] **Task 1.3.2.3**: Add support for handling videos without transcripts (error message or metadata-only note)
- [ ] **Task 1.3.2.4**: Create unit tests with mock responses for reliable testing of transcript parsing

## LLM Processing

### Task 1.4.1: Implement LLM service
- [ ] **Task 1.4.1.1**: Create `LLMProvider` interface to abstract different LLM providers (OpenRouter, Requesty)
- [ ] **Task 1.4.1.2**: Implement API call function with proper error handling and timeout management
- [ ] **Task 1.4.1.3**: Add retry logic for transient API failures (exponential backoff, max 3 attempts)
- [ ] **Task 1.4.1.4**: Create secure API key handling with redaction in logs and error messages

### Task 1.4.2: Implement prompt management
- [ ] **Task 1.4.2.1**: Define default YouTube prompt template in constants file with instructions for summary, key points, concepts extraction
- [ ] **Task 1.4.2.2**: Create template rendering function to replace placeholders with transcript and metadata
- [ ] **Task 1.4.2.3**: Implement the `parseLLMResponse` function (as outlined in Architecture 2.4).
    - Input: Raw Markdown string from LLM.
    - Logic: Use regex or string splitting to find `## Summary`, `## Key Points`, `## Key Concepts` headings.
    - Extract the content under each heading.
    - Handle cases where headings might be missing.
    - Return an `LLMOutput` object (defined in Architecture 2.4).
- [ ] **Task 1.4.2.4**: Add validation for LLM output format to handle unexpected response structures

## Note Generation

### Task 1.5.1: Implement note creation
- [ ] **Task 1.5.1.1**: Create function to generate final Markdown content using YouTube template and LLM output
- [ ] **Task 1.5.1.2**: Implement folder structure creation for organized notes (sources/videos/, etc.)
- [ ] **Task 1.5.1.3**: Add file path sanitization to prevent invalid characters in filenames
- [ ] **Task 1.5.1.4**: Create proper error handling for file system operations with user feedback

### Task 1.5.2: Add note metadata and linking
- [ ] **Task 1.5.2.1**: Implement filename generation based on video title with date prefix
- [ ] **Task 1.5.2.2**: Add YAML frontmatter with video ID, URL, and import timestamp
- [ ] **Task 1.5.2.3**: Create success notification with link to the newly created note using Obsidian Notice
- [ ] **Task 1.5.2.4**: Implement conflict resolution for duplicate note names (append number or timestamp)

## Main Plugin Integration

### Task 1.6.1: Connect pipeline components
- [ ] **Task 1.6.1.1**: Implement main handler function to orchestrate the entire pipeline from URL to note
- [ ] **Task 1.6.1.2**: Add command palette registration with proper name and icon
- [ ] **Task 1.6.1.3**: Create proper error boundaries between pipeline stages with graceful failure handling
- [ ] **Task 1.6.1.4**: Implement progress indication for long-running operations using Obsidian Notice

### Task 1.6.2: Add logging and diagnostics
- [ ] **Task 1.6.2.1**: Implement consistent logging pattern with plugin name prefix
- [ ] **Task 1.6.2.2**: Add debug mode toggle in settings to control verbose logging
- [ ] **Task 1.6.2.3**: Create user-friendly error messages for common failures (API errors, transcript unavailable)
- [ ] **Task 1.6.2.4**: Implement detailed console logging for troubleshooting without exposing sensitive data

## Testing and Quality Assurance

### Task 1.7.1: Implement unit tests
- [ ] **Task 1.7.1.1**: Create tests for URL validation and content type detection with various URL formats
- [ ] **Task 1.7.1.2**: Add tests for YouTube ID extraction with edge cases (timestamps, playlist parameters)
- [ ] **Task 1.7.1.3**: Implement tests for LLM response parsing with sample outputs
- [ ] **Task 1.7.1.4**: Add tests for file path sanitization and naming logic with special characters

### Task 1.7.2: Create integration tests
- [ ] **Task 1.7.2.1**: Set up test fixtures with sample YouTube data (transcript, metadata)
- [ ] **Task 1.7.2.2**: Create mocks for Obsidian's file system API and notice functionality
- [ ] **Task 1.7.2.3**: Implement end-to-end test for the entire pipeline with mocked external services
- [ ] **Task 1.7.2.4**: Add tests for error handling scenarios (network failures, invalid responses)

## Release Preparation

### Task 1.8.1: Documentation
- [ ] **Task 1.8.1.1**: Create comprehensive README.md with installation and usage instructions
- [ ] **Task 1.8.1.2**: Document configuration options and LLM provider setup requirements
- [ ] **Task 1.8.1.3**: Add screenshots and examples for the plugin in action
- [ ] **Task 1.8.1.4**: Include troubleshooting section for common issues and their solutions

### Task 1.8.2: Final polish
- [ ] **Task 1.8.2.1**: Review and improve error messages for clarity and actionability
- [ ] **Task 1.8.2.2**: Ensure consistent code style and documentation with ESLint and JSDoc
- [ ] **Task 1.8.2.3**: Optimize build size by removing development dependencies and unnecessary imports
- [ ] **Task 1.8.2.4**: Perform final testing across different Obsidian versions and platforms