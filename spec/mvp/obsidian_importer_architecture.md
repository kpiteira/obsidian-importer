# 🏗️ Obsidian Importer – Architecture Document (MVP)

## 1. High-Level Architecture

The Obsidian Importer plugin follows a modular pipeline for processing a URL into a final Obsidian note:

```
User Input (URL)
   ↓
Command Handler (Obsidian plugin command)
   ↓
Content Type Detector
   ↓
Content Downloader (YouTube Extractor)
   ↓
LLM Processor
   ↓
Template Engine
   ↓
Note Generator (Obsidian file system)
```

---

## 2. Core Components

### 2.1 Command Handler (Input Layer)

#### ✅ What it does

- Adds a command to Obsidian’s command palette: "Import content from URL"
- Opens a modal with a text input field for the user to paste a URL
- On submit:
  - Performs basic URL validation (syntax-level only)
  - Rejects non-URLs with a friendly error
  - Kicks off the processing pipeline (starting with content type detection)

#### 🧱 Implementation Details

##### Command Registration

```ts
this.addCommand({
  id: "import-from-url",
  name: "Import content from URL",
  callback: () => {
    new UrlInputModal(this.app, (url) => handleUrl(url)).open();
  }
});
```

##### Modal for Input

```ts
class UrlInputModal extends Modal {
  constructor(app: App, onSubmit: (url: string) => void) {
    super(app);
    this.onSubmit = onSubmit;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.createEl("h2", { text: "Paste URL to import" });

    const inputEl = contentEl.createEl("input", { type: "text" });
    inputEl.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        const url = inputEl.value.trim();
        if (isValidUrl(url)) {
          this.onSubmit(url);
          this.close();
        } else {
          new Notice("Please enter a valid URL.");
        }
      }
    });
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
```

##### Basic URL Validation Function

```ts
function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);

    // Prevent SSRF: block localhost/internal IPs
    if (
      parsed.hostname === "localhost" ||
      parsed.hostname.startsWith("127.") ||
      parsed.hostname.startsWith("::1")
    ) {
      return false;
    }

    return ["http:", "https:"].includes(parsed.protocol);
  } catch (e) {
    return false;
  }
}
```

#### 🔐 Security (Cross-Cutting for This Part)

- ✅ Prevents SSRF: blocks loopback IPs and localhost
- ✅ No SQL injection vectors in this context (Obsidian runs local, no DB)
- ✅ Only accepts valid `http(s)` URLs
- ❌ No automatic execution or evaluation of URL content at this stage (safe)

---

### 2.2 Content Type Detector

#### ✅ What it does

- Determines the content type from a given URL.
- For MVP, supports only detecting YouTube URLs.
- Prepares for future extensibility via a simple strategy-based interface.

#### 🧱 Implementation Details

##### Content Type Interface

```ts
interface ContentTypeHandler {
  detect(url: URL): boolean;
  type: string;
}
```

##### YouTube Content Handler

```ts
class YouTubeHandler implements ContentTypeHandler {
  type = "youtube";

  detect(url: URL): boolean {
    return url.hostname.includes("youtube.com") || url.hostname.includes("youtu.be");
  }
}
```

##### Type Detection Dispatcher

```ts
const handlers: ContentTypeHandler[] = [
  new YouTubeHandler(),
  // future: new MediumHandler(), new RecipeHandler(), etc.
];

function detectContentType(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    const handler = handlers.find(h => h.detect(url));
    return handler?.type || "unknown";
  } catch {
    return "invalid";
  }
}
```

#### 🧩 Optional Enhancements (Not in MVP by default)

- Normalize/clean YouTube URLs by stripping tracking parameters (`&t=`, `?si=`) to get a canonical URL.
- Could be useful for deduplication or consistency in note naming.

#### 🔐 Security (Cross-Cutting for This Part)

- Sanitizes and validates URLs via native `URL` constructor before processing.
- Does not invoke or fetch content directly at this stage.
- Guards against malformed input or unexpected domains.



### 2.3 Content Downloader (YouTube Extractor)

#### ✅ What it does

- Given a YouTube URL, extracts relevant metadata and the video transcript.
- Returns a normalized object used by the LLM processor and template renderer.

#### 🧱 Data Model

```ts
interface YouTubeVideoData {
  videoId: string;
  title: string;
  channelName: string;
  channelUrl: string;
  publishedDate: string;
  thumbnailUrl: string;
  transcript: string;
}
```

#### 🧱 Implementation Details

##### Extracting Video ID

```ts
function extractYouTubeVideoId(url: string): string | null {
  const parsed = new URL(url);
  if (parsed.hostname.includes("youtu.be")) {
    return parsed.pathname.slice(1);
  } else if (parsed.hostname.includes("youtube.com")) {
    return parsed.searchParams.get("v");
  }
  return null;
}
```

##### Fetching Metadata

- Use `https://www.youtube.com/oembed?url=...` to fetch:
  - `title`
  - `thumbnail_url`
  - `author_name` (channel name)
  - `author_url` (channel link)
  - `publishedDate`: **Note:** This data is not available via YouTube's standard oEmbed endpoint. For MVP, this field will be omitted from the final note template rendering. Future versions might explore using the YouTube Data API (requiring API key setup) or scraping if this data is deemed essential.

##### Fetching Transcript

- Leverage transcript fetching code from [obsidian-yt-video-summarizer](https://github.com/mbramani/obsidian-yt-video-summarizer).
- This plugin already handles transcript parsing effectively in a client-friendly way.
- Likely uses a scraping or API-compatible fallback under the hood.
- Evaluate how portable this module is and whether it needs dependency isolation.

#### ⚠️ Key Dependency Risk (Transcript Fetching)
- Reusing transcript logic from `obsidian-yt-video-summarizer` is planned for MVP speed. 
**Risk:** This external code may change, be unmaintained, or difficult to integrate directly. 
**Mitigation:** Allocate time to properly vendorize or rewrite the necessary transcript fetching logic within this plugin's codebase, ensuring it handles common errors (e.g., disabled transcripts, region locks) gracefully. Treat this as a core, owned component rather than a loosely coupled dependency.

#### 🔄 Fallback Behavior (MVP)

- If transcript fetch fails:
  - MVP will **abort** with a user-friendly error notice (no partial note).
  - Future versions may allow generating a note with metadata only.

#### 🔐 Security (Cross-Cutting for This Part)

- All requests are client-side and to public YouTube endpoints.
- No sensitive data involved.
- Validate video ID structure before sending requests.

#### 📌 Notes

- The template used in the "12 Logging BEST Practices in 12 Minutes" note is derived from the `obsidian-yt-video-summarizer` plugin.
- For MVP, we can reuse that plugin’s transcript and metadata logic directly or adapt it in place.

#### 🔍 TODOs / Research

- Confirm transcript module from the summarizer plugin can be reused without modification.
- Investigate how/if it handles rate-limiting or regional blocks.
- Consider minimal unit test coverage for extraction logic to reduce brittleness.

You got it. Here is the merged section 2.4, formatted as a single markdown block for easy copying:

### 2.4 LLM Processor & Formatter

#### ✅ What it does

- Accepts structured input (e.g., transcript + metadata for YouTube) from the relevant content downloader (like the YouTube Extractor).
- Constructs a detailed prompt instructing an LLM to perform analysis (summarization, key point extraction, concept identification) and format the output.
- Sends the constructed prompt and input data to a configured LLM API endpoint (e.g., Requesty, OpenRouter).
- Receives the response from the LLM (expected to be formatted Markdown based on the prompt).
- Parses the LLM's Markdown response to extract the distinct sections required by the content-specific template (e.g., Summary, Key Points, Key Concepts for YouTube).
- Returns the final structured or semi-structured content ready for the Note Generator.

#### 🧱 Input/Output Interface (Example for YouTube)

```ts
// Input from YouTube Downloader
interface LLMInput {
  transcript: string;
  title: string;
  channelName: string;
}

// Output structure after parsing LLM response
interface LLMOutput {
  summary: string;
  keyPoints: string[]; // Or a single multi-line string
  keyConcepts: string[]; // Or a single multi-line string
  // Potentially raw response sections if parsing is minimal
}
```

#### 🧱 Implementation Details

##### Prompt Template Strategy (MVP)

- The core prompt is defined within the plugin, potentially configurable via settings for advanced users.
- It explicitly instructs the LLM on the tasks (summarize, list points, identify concepts) *and* the desired output format (e.g., using specific Markdown headers).

##### Prompt Template Example (Draft for YouTube)

```txt
You are analyzing the content of a YouTube video transcript to generate sections for an Obsidian note.
Video Title: {{title}}
Channel: {{channelName}}
Transcript:
{{transcript}}

---
Instructions:
1. Write a concise 2-3 sentence summary of the video's main topic.
2. List the most important key takeaways or points discussed in the video. Use bullet points.
3. Identify the key concepts, technical terms, or named entities mentioned (aim for 3-7 significant ones). Use bullet points.

---
Return the result ONLY in the following Markdown format, using these exact headings:

## Summary
<Your summary here>

## Key Points
- <Point 1>
- <Point 2>
...

## Key Concepts
- <Concept 1>
- <Concept 2>
...
```

##### API Call (Sample using OpenRouter)

```ts
async function callLLM(input: LLMInput, apiKey: string, promptTemplate: string): Promise<string> {
  // Simple template rendering (replace placeholders)
  const prompt = promptTemplate
    .replace('{{title}}', input.title)
    .replace('{{channelName}}', input.channelName)
    .replace('{{transcript}}', input.transcript);

  const response = await fetch("[https://openrouter.ai/api/v1/chat/completions](https://openrouter.ai/api/v1/chat/completions)", { // Replace with configured endpoint
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`, // Use configured API key
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo", // Replace with configured model
      messages: [{ role: "user", content: prompt }],
      // Add other LLM parameters like temperature if needed
    }),
  });

  if (!response.ok) {
    // Handle API errors (e.g., throw exception, return error object)
    console.error("LLM API Error:", response.status, await response.text());
    throw new Error(`LLM API request failed with status ${response.status}`);
  }

  const json = await response.json();
  // Basic validation: check if choices exist and have content
  if (!json.choices || !json.choices[0] || !json.choices[0].message || !json.choices[0].message.content) {
     console.error("Invalid LLM response structure:", json);
     throw new Error("Received invalid or empty response from LLM.");
  }
  return json.choices[0].message.content; // Return the raw Markdown content
}
```

##### Response Parsing (MVP)

- The raw Markdown string returned by the LLM is parsed.
- For MVP, this can be simple string manipulation: split the response based on the expected `## Summary`, `## Key Points`, `## Key Concepts` headings to extract the content for each section.
- This extracted content is then passed to the Note Generator, likely within the `LLMOutput` structure.

```ts
function parseLLMResponse(markdownContent: string): LLMOutput {
  const summaryMatch = markdownContent.match(/## Summary\s*([\s\S]*?)(?=\n## Key Points|$)/);
  const keyPointsMatch = markdownContent.match(/## Key Points\s*([\s\S]*?)(?=\n## Key Concepts|$)/);
  const keyConceptsMatch = markdownContent.match(/## Key Concepts\s*([\s\S]*?)$/);

  // Basic extraction, trim whitespace. Needs more robust error handling.
  return {
    summary: summaryMatch ? summaryMatch[1].trim() : "Summary not found.",
    // Further parsing of bullet points might be needed depending on how Note Generator uses it
    keyPoints: keyPointsMatch ? keyPointsMatch[1].trim().split('\n').map(p => p.trim()).filter(p => p.startsWith('-')) : [],
    keyConcepts: keyConceptsMatch ? keyConceptsMatch[1].trim().split('\n').map(c => c.trim()).filter(c => c.startsWith('-')) : [],
  };
}
```

#### 🔄 Fallback Behavior & Error Handling

- If the LLM API call fails (network error, bad API key, server error), the process should abort and show a user-friendly error notice.
- If the LLM response is received but doesn't contain the expected headings or is malformed, parsing might fail. MVP could either:
    - Abort with an error ("Failed to parse LLM response").
    - Generate a note containing the raw, unparsed LLM response with a warning. (Abort is likely better for MVP).
- Handle cases where specific sections (e.g., Key Concepts) might be missing from the LLM output if the prompt allows it.

#### 🔐 Security

- The primary security concern is the LLM API key. This must be stored securely using Obsidian's plugin settings mechanism and not exposed in the UI or logs unless debug mode is explicitly enabled.
- Ensure the LLM endpoint URL is configurable and potentially validated if necessary (though less critical than the API key).

#### 🧩 Configuration

- LLM API Key (`apiKey`) - required.
- LLM API Endpoint URL (`llmEndpoint`) - defaults provided (e.g., Requesty, OpenRouter).
- LLM Model Name (`model`) - defaults provided (e.g., `gpt-3.5-turbo`).
- Prompt Template (`promptTemplate`): Store the default prompt; allow override via settings for advanced users.

#### 📌 Notes

- This merged approach centralizes LLM interaction, prompt management, and response handling.
- The MVP relies on the LLM correctly following formatting instructions in the prompt and simple string parsing. Future versions might use more robust parsing or request structured JSON output from the LLM if the chosen model supports it reliably.
- The quality of the final note heavily depends on the quality and clarity of the prompt template.

#### 🔍 TODOs / Research

- Finalize the default prompt template for YouTube for optimal results.
- Test parsing logic robustness against variations in LLM Markdown output.
- Evaluate different LLM providers (OpenRouter, potentially others like Requesty, local models via Ollama) for cost, reliability, and ease of integration, ensuring the API call logic is adaptable.
- Decide on the exact error handling strategy for failed parsing (abort vs. raw output).

### 2.6 Note Generator

#### ✅ What it does

- Accepts the final rendered Markdown string from the LLM.
- Creates a new Markdown note in the Obsidian vault.
- Determines filename and folder based on plugin settings or defaults.

#### 🧱 Implementation Plan

```ts
interface NoteMetadata {
  title: string;
  type: string; // e.g., 'youtube'
  content: string; // final Markdown
  videoId?: string; // optional for filename uniqueness
}

async function createNote({ title, type, content, videoId }: NoteMetadata) {
  const folderPath = `Imported/${capitalize(type)}`;
  const filename = `${getDatePrefix()} ${sanitize(title)}${videoId ? ` (${videoId})` : ""}.md`;
  const fullPath = `${folderPath}/${filename}`;

  await this.app.vault.createFolder(folderPath).catch(() => {});
  await this.app.vault.create(fullPath, content);
}
```

#### 🧱 Helper Functions

```ts
function getDatePrefix(): string {
  return window.moment().format("YYYY-MM-DD");
}

function sanitize(str: string): string {
  return str.replace(/[\/:*?"<>|]/g, "").slice(0, 50);
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
```

#### 🧩 Configuration Options

- Default folder path per content type
- Filename format (prefix with date, include video ID)
- Overwrite behavior (skip, replace, create duplicate)

#### 🔐 Security

- Ensures valid file paths
- Does not execute any user content
- Prevents filename collisions using ID suffixes or timestamps

#### 📌 Notes

- MVP will always write a new file — no update or merge support yet
- Can link the newly created note in the console or via notification

---

## 3. Cross-Cutting Concerns

### 3.1 Error Handling

#### Goals:
- Prevent crashes or hangs.
- Show clear, non-intrusive error messages.
- Allow optional debug logging.

#### MVP Error Responses:
| Error Case                    | Response                                                            |
|------------------------------|---------------------------------------------------------------------|
| Invalid URL                  | `Notice("Please enter a valid URL.")`                              |
| Unsupported content type     | `Notice("This content type is not yet supported.")`               |
| Transcript fetch failure     | `Notice("Transcript not available for this video.")`              |
| LLM API failure              | `Notice("Failed to process content. Please try again.")`          |
| Note creation (file I/O)     | `Notice("Could not create the note. Check permissions or paths.")`|

#### Future:
- Retry logic for network/API failures.
- Failure logs saved to a debug folder (opt-in).
- UI button to report issues.

---

### 3.2 Logging

#### MVP Logging:
- Use `console.log`, `console.warn`, `console.error`.
- Prefix all logs with `[ObsidianImporter]`.
- Log key data at each stage: URL input, type detection, LLM input/output, note path.

#### Optional Debug Toggle:
```ts
if (settings.debug) {
  console.log("[ObsidianImporter] Prompt:", prompt);
  console.log("[ObsidianImporter] LLM response:", response);
}
```

#### Future:
- Optionally persist logs inside `.debug/` folder in vault.

---

### 3.3 Security

#### MVP Safeguards:
- Sanitize and validate all URLs.
- Block SSRF: reject `localhost`, `127.0.0.1`, `::1`, etc.
- API key stored securely in Obsidian plugin settings.
- Strip invalid characters from note filenames.

#### By Component:
| Component        | Security Consideration                                                 |
|------------------|-------------------------------------------------------------------------|
| Command Handler  | Validates URL, prevents SSRF                                            |
| Downloader       | Public API calls only, no auth, no file system access                  |
| LLM Processor    | Sends only transcript + metadata                                        |
| Note Generator   | Sanitizes filenames and paths                                           |

#### Future:
- TLS validation
- Trusted LLM endpoint warning
- Encrypted config storage

---

### 3.4 Configuration

#### MVP Settings:
| Setting          | Description                                       | Default             |
|------------------|---------------------------------------------------|---------------------|
| `apiKey`         | LLM API key                                       | —                   |
| `llmEndpoint`    | LLM URL (Requesty for MVP)                        | Requesty default    |
| `model`          | LLM model to use                                  | e.g. `gpt-3.5-turbo`|
| `defaultFolder`  | Destination folder for new notes                  | `sources/YouTube`  |
| `promptTemplate` | Optional prompt override (Markdown format)       | hardcoded in code   |
| `debug`          | Enable verbose logging                            | `false`             |

#### Implementation:
- Use `PluginSettingTab` to manage settings UI.
- Store in plugin settings, separate from user notes.

#### Future:
- Per-content-type prompt config
- UI for managing templates/prompts

---

## 4. Open Questions / Research Needed

- Which YouTube library is most robust for fetching transcripts in JavaScript?
- Which LLM API has the simplest integration and good reliability (OpenRouter, Requesty, local Olama)?
- How should we store or let users override templates?
- Should we auto-link key concepts to existing notes?

---

### 4.1 Project Structure and Scaffolding

##### 📁 Recommended File Structure (MVP)
```
obsidian-importer/
├── main.ts                  # Entry point (Obsidian plugin API)
├── manifest.json            # Obsidian plugin manifest
├── styles.css               # Optional styling
├── handlers/                # Core pipeline components
│   ├── command.ts
│   ├── typeDetector.ts
│   ├── youtubeDownloader.ts
│   ├── llmProcessor.ts
│   ├── promptManager.ts
│   └── noteWriter.ts
├── ui/                      # Modals, settings tabs
│   └── UrlInputModal.ts
├── utils/                   # Helpers (validation, logging)
│   └── sanitize.ts
├── settings.ts              # Plugin settings config + defaults
├── constants.ts             # Prompt defaults, folder names, etc.
├── .gitignore               # Ignore build artifacts and API keys
├── tsconfig.json            # TypeScript config
└── README.md
```

##### ⚙️ Obsidian Plugin Files
- `main.ts`: registers commands, loads settings, bootstraps plugin
- `manifest.json`: declares plugin metadata and main entry file
- `styles.css`: optional for modal theming

##### 🧹 .gitignore Example
```
node_modules/
dist/
.vscode/
.DS_Store
*.env
*.log
.obsidian
```

##### 🧪 Dev Setup
- Clone the plugin repo
- Run `npm install`
- Run `npm run dev` to build in watch mode
- Link folder to Obsidian `.obsidian/plugins/obsidian-importer`

##### 📌 Notes
- This structure is designed to extend the official [`obsidian-plugin-template`](https://github.com/obsidianmd/obsidian-sample-plugin).

###### Why this matters:
**Pros:**
- Provides a complete working starter for plugin development.
- Includes all required Obsidian plugin config: `manifest.json`, Rollup build setup, TypeScript tooling.
- Actively maintained with community support.
- Reduces the time needed to bootstrap a functional plugin.

**Cons:**
- Includes some default UI elements (e.g., ribbon icon, status bar) which may not be needed.
- Requires slight cleanup and adaptation to suit our modular structure.

Your proposed modular folder structure builds on this template by organizing logic into meaningful domains (`handlers/`, `ui/`, `utils/`) to support multiple content types and better scalability.

**Recommendation:** Scaffold using the template as a base, and evolve the folder structure to match this architecture.

###### Why?
**Pros:**
- Provides an already working setup for plugin development
- Includes TypeScript + build config + hot reload
- Known compatibility with Obsidian plugin requirements
- Good community support and examples

**Cons:**
- Includes some boilerplate not used in MVP (e.g. ribbon icons, status bar)
- Slight learning curve if unfamiliar with Rollup and build scripts

Overall, the benefits outweigh the costs for speeding up initial development and ensuring best practices.
- All source code should remain TypeScript for maintainability
- All source code should remain TypeScript for maintainability

---

### 4.2 Testing Strategy

##### 🧪 Testing Goals (MVP)
- Ensure reliability of core pipeline components (type detection, transcript fetch, LLM parsing).
- Catch regressions early during local dev.
- Keep tests lightweight and fast.

##### 🧱 Recommended Stack
- **Test Framework**: [Vitest](https://vitest.dev/) (lightweight, fast, TS-native)
- **Mocking**: Built-in mocking or [msw](https://mswjs.io/) for HTTP interactions
- **Fixtures**: Store sample transcripts, prompts, and LLM responses under `tests/fixtures/`

##### 📁 Suggested Test Structure
```
tests/
├── handlers/
│   ├── typeDetector.test.ts
│   ├── youtubeDownloader.test.ts
│   ├── llmProcessor.test.ts
│   └── promptManager.test.ts
├── fixtures/
│   ├── transcript-example.txt
│   ├── llm-response.md
│   └── video-metadata.json
└── utils/
    └── sanitize.test.ts
```

##### ✅ Test Coverage Priorities (MVP)
| Module            | Type             | Notes                                     |
|-------------------|------------------|-------------------------------------------|
| URL validator     | Unit test        | Validate accepted + blocked URLs          |
| Type detector     | Unit test        | Correctly detects YouTube URLs            |
| Video ID extractor| Unit test        | Handles edge cases                        |
| Transcript parser | Integration test | Use fixture to simulate fetch + parse     |
| LLM parser        | Unit test        | Parse example LLM output cleanly          |

##### 🔄 Future Enhancements
- Snapshot tests for final note output
- End-to-end test using Obsidian plugin test harness
- GitHub Actions workflow for CI

---

## 5. Next Steps

- Finalize YouTube fetch and parsing logic.
- Choose and integrate first LLM backend.
- Implement basic plugin skeleton.
- Add command palette entry and input modal.
- Hook together pipeline: URL → Note.

