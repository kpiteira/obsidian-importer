# 🧠 Obsidian Importer – Product Requirements Document (PRD)

## 1. Overview
The **Obsidian Importer** plugin enables users to import content from a URL into Obsidian. Based on the URL, the plugin determines the content type, downloads and processes it using an LLM, and formats it into a Markdown note with a relevant, user-definable template. The plugin aims to enrich the user's personal knowledge base with minimal manual effort.

## 2. Goals
- Allow users to quickly import web content into Obsidian using a URL.
- Automatically detect content type (e.g., YouTube, Medium article).
- Use an LLM to extract summaries, highlights, key concepts.
- Apply a content-specific template to format the note.
- Create Obsidian notes that include backlinks to concepts and existing notes where possible.
- Keep MVP as simple and lightweight as possible.

## 3. MVP Scope
- **Trigger**: User invokes the plugin via the command palette, pastes a URL, and hits enter.
- **Content Type (for MVP)**: YouTube video.
- **LLM**: Leverage a remote or local API (e.g., OpenRouter, Olama) to process the content.
- **Template Engine (MVP):** Use a built-in, non-editable template for YouTube notes. (Alternatively: Use a built-in template for YouTube, with the core LLM prompt *potentially* overrideable via settings for advanced users, but no UI for template editing).
- **Note Creation**: Plugin creates a new note in the Obsidian vault using the YouTube template.
- **Error Handling:** Provide user feedback via Obsidian notices for critical failures like invalid URL format, inability to fetch transcript, or LLM processing failure. More detailed errors logged to the developer console.

## 3.1. MVP Success Metrics
- User successfully imports a YouTube video URL and generates a note using the command palette.
- Core data (Title, URL, Summary, Key Points, Concepts) is extracted and populated in the note.
- Minimal critical errors reported during the import process for supported YouTube URLs.

## 4. Future Versions
### V2 Ideas:
- Support all content types in (5. Supported Content Types (Eventually))
- More flexibility on model selection (only OpenAI compatible):
    - Drop down with provider list (Requesty, OpenRouter, OpenAI, local (e.g ollama))
    - No need to provide the endpoint in the settings, selecting the provider the list does that automatically, except for local which requires the local endpoint
- Upon choosing the provider, load their list of model
    - some research might be needed to find an API to download a list of models, ideally with their cost
- UI improvements.

### V3+ Ideas:
- Vault integration with fuzzy matching for backlinks to existing notes.
- Clipboard monitoring or browser extension support.
- Offline/local content import (e.g., PDFs or images).
- Custom logic scripting for advanced template behavior.

## 5. Supported Content Types (Eventually)
| Type           | Description                                                                                     |
|----------------|-------------------------------------------------------------------------------------------------|
| YouTube        | Transcript parsing, key points, concepts, author/channel, links to concept notes.              |
| Medium         | Summary, highlights, key topics, concept linking.                                              |
| Recipes        | Ingredients, steps, serving size, images (if present), source link.                            |
| Books          | Title, author (linked to Goodreads), summary, themes, key highlights, concepts.                |
| Restaurants    | Description, ratings, address, booking info, and a personal notes section.                     |
| Movies         | Title, actors, description, viewing status, tags (liked, watched), ratings.                    |
| Images         | Basic metadata, stored in a `sources/images` folder, optional note per image.                  |

## 6. Templates
Templates define how different content types should be formatted in the final Obsidian note.

### 🎥 YouTube Video Template (used in MVP)
Based on the note: `[[12 Logging BEST Practices in 12 minutes]]`.

```markdown
# {{title}}

![Thumbnail]({{thumbnail}})

👤 [{{channel}}]({{channel_url}})  🔗 [Watch video]({{video_url}})

## Summary
{{summary}}

## Key Points
{{key_points}}

## Key Concepts
{{key_concepts}}

## Metadata
- Video ID: {{video_id}}
- Duration: {{duration}}
- Published: {{published_date}}
```

Templates will eventually be user-editable (stored in a `templates/` folder or set via plugin settings).

## 7. User Interaction
- Triggered via the command palette.
- User pastes a URL into an input box.
- Note is created automatically with no extra interaction required.
- Notes can be edited like any other Obsidian note post-creation.

## 8. Technical Considerations
- **Language**: TypeScript (recommended for Obsidian plugins).
- **Plugin API**: Use Obsidian Plugin API for filesystem, UI, settings.
- **LLM API:** Initially choose a simple API (e.g., Requesty). *Requirement:* Abstract the LLM interaction layer to allow future swapping of providers (e.g., local models like Olama, other remote APIs) without major refactoring, supporting user choice and cost flexibility.- 
**File Management**: Use proper folders for assets (e.g., `sources/images/`, `sources/videos/`).
- **Error Handling**: Log errors and show minimal feedback in Obsidian (e.g., failed to fetch or parse).
- **Settings**: Store config (e.g., template paths, API key) via Obsidian's plugin settings system.

## 9. Out of Scope for MVP
- Multiple content types.
- Template editor UI.
- Advanced Obsidian vault integration (e.g., linking to related notes).
- Offline imports or file analysis.
- Advanced logging, retries, or queuing.
