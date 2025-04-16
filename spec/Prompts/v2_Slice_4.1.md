We are continuing the implementation of my Obsidian Importer with the v2. Here is the next task on the list:
I'm implementing Slice 4.1: Goodreads Handler Implementation from my Obsidian Importer V2 plan.

Goal: Add support for Goodreads book pages.

The implementation tasks are:
- Create `GoodreadsHandler` class implementing `ContentTypeHandler`
- Implement URL-based detection for Goodreads domains
- Create web scraper for book information
- Implement book-specific prompt template
- Register Goodreads handler with content type registry
- Create book template renderer
- Test end-to-end Goodreads import
- Verify book metadata extraction and note formatting

Here are the relevant sections from my architecture document:

```typescript
export interface ContentTypeHandler {
  type: string;
  
  // For URL-based detection
  canHandleUrl(url: URL): Promise<boolean>;
  
  // Does this handler require content-based detection?
  requiresContentDetection(): boolean;
  
  // Core functionality
  downloadContent(url: string, cachedContent?: string): Promise<any>;
  getPrompt(content: any): string;
  parseLLMResponse(response: string): any;
  validateLLMOutput(parsed: any): boolean;
  getNoteContent(llmResponse: string, metadata: ContentMetadata): string;
  getFolderName(): string;
  
  // For error handling
  getRequiredApiKeys(): string[];
}

// Content Type Registry
export class ContentTypeRegistry {
  private handlers: ContentTypeHandler[] = [];
  private detectionCache: Map<string, string> = new Map();
  private pageContentCache: Map<string, string> = new Map();
  
  register(handler: ContentTypeHandler): void {
    this.handlers.push(handler);
  }
  
  async detectContentType(url: string): Promise<ContentTypeHandler> {
    // Check cache first
    if (this.detectionCache.has(url)) {
      const handlerType = this.detectionCache.get(url);
      return this.handlers.find(h => h.type === handlerType)!;
    }
    
    // URL-based detection first (fast)
    for (const handler of this.handlers) {
      if (await handler.canHandleUrl(new URL(url))) {
        this.detectionCache.set(url, handler.type);
        return handler;
      }
    }
    
    // Content-based detection for generic types (expensive)
    // ...
  }
}
```

The relevant requirements from the PRD are:

```markdown
#### 📚 Book (Goodreads) Template
```markdown
# {{title}}

Author: [{{author}}]({{author_url}})  
🔗 [View on Goodreads]({{book_url}})  
📅 Published: {{published_date}}

![Cover]({{cover_image}})

## Summary
{{summary}}

## Themes
{{themes}}

## Key Highlights
{{highlights}}

## Key Concepts
{{key_concepts}}

## Metadata
- ISBN: {{isbn}}
- Pages: {{pages}}
- Rating: {{rating}}
```

### 2.1 Implementation Priority
1. Medium articles
2. Books (via Goodreads)
3. Recipes (generic web)
4. Restaurants (generic web)
5. Movies (generic web)

### 2.2 Content Detection Strategy
The content detection system will be enhanced to:
- Identify URLs from specific domains (Medium.com, Goodreads.com)
- Use pattern recognition and content analysis for generic content types
- Implement a content detection pipeline that allows for graceful fallback
```

Here's the existing related code that this needs to integrate with:

1. The `ContentTypeHandler` interface which all content handlers implement
2. The existing `ContentTypeRegistry` where handlers are registered
3. The `YouTubeHandler` and `MediumHandler` implementations that follow the same pattern
4. Plugin main file that registers all handlers
5. The web scraping utilities already used by existing handlers
6. LLM processing utilities for prompt generation and response parsing

Please provide:
1. All files that need to be created or modified with complete implementations
2. Unit tests that verify the core functionality
3. Any integration code needed to connect this with existing components
4. Instructions for manually testing this slice in Obsidian
5. Ensure the build and tests pass, but only those that were written in this task

When complete, I should be able to paste a Goodreads URL into the importer, have it correctly detect the content as a Goodreads book, extract book information, generate a well-formatted note with the book's details including metadata, and save it to the appropriate folder in my vault.Here's the existing related code that this needs to integrate with:

1. The `ContentTypeHandler` interface which all content handlers implement
2. The existing `ContentTypeRegistry` where handlers are registered
3. The `YouTubeHandler` and `MediumHandler` implementations that follow the same pattern
4. Plugin main file that registers all handlers
5. The web scraping utilities already used by existing handlers
6. LLM processing utilities for prompt generation and response parsing

Please provide:
1. All files that need to be created or modified with complete implementations
2. Unit tests that verify the core functionality
3. Any integration code needed to connect this with existing components
4. Instructions for manually testing this slice in Obsidian
5. Ensure the build and tests pass, but only those that were written in this task

When complete, I should be able to paste a Goodreads URL into the importer, have it correctly detect the content as a Goodreads book, extract book information, generate a well-formatted note with the book's details including metadata, and save it to the appropriate folder in my vault.