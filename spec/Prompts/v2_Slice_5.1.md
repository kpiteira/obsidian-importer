---
We are continuing the implementation of my Obsidian Importer with the v2. Here is the next task on the list:
I'm implementing Slice 5.1: Content Detection with LLM from my Obsidian Importer V2 plan.

Goal: Implement the framework for detecting generic content types (recipes, restaurants, movies) using LLM.

The implementation tasks are:
- Create base class for generic content handlers
- Implement shared content fetching functionality
- Create LLM prompt for content type determination
- Add content-based detection to registry
- Implement cache sharing between handlers
- Test content type detection with sample pages
- Verify caching works for shared content

Here are the relevant sections from my architecture document:

```
### 2.3 Content Type Registry

A new component for V2 that manages content type handlers and implements an efficient detection strategy:

```ts
export class ContentTypeRegistry {
  private handlers: ContentTypeHandler[] = [];
  private detectionCache: Map<string, string> = new Map();
  private pageContentCache: Map<string, string> = new Map();
  
  // ... existing code ...
  
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
    // Only fetch the content once and cache it
    if (!this.pageContentCache.has(url)) {
      const content = await fetchWebPageContent(url);
      this.pageContentCache.set(url, content);
    }
    
    const pageContent = this.pageContentCache.get(url)!;
    
    // Use LLM to determine content type for generic handlers
    // Group the handlers that need content-based detection
    const genericHandlers = this.handlers.filter(
      h => h.requiresContentDetection()
    );
    
    if (genericHandlers.length > 0) {
      const contentType = await this.determineContentTypeWithLLM(
        url, pageContent, genericHandlers.map(h => h.type)
      );
      
      const handler = this.handlers.find(h => h.type === contentType);
      if (handler) {
        this.detectionCache.set(url, handler.type);
        return handler;
      }
    }
    
    throw new Error("Could not determine content type for this URL");
  }
  
  private async determineContentTypeWithLLM(
    url: string, 
    content: string, 
    possibleTypes: string[]
  ): Promise<string> {
    // Implement LLM-based content type detection
    // This is called only once per URL for generic content types
    // Return the detected content type
  }
```

### 2.4 Enhanced Content Type Handler Interface

```ts
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
```

The relevant requirements from the PRD are:

```
### 2.2 Content Detection Strategy
The content detection system will be enhanced to:
- Identify URLs from specific domains (Medium.com, Goodreads.com)
- Use pattern recognition and content analysis for generic content types
- Implement a content detection pipeline that allows for graceful fallback

### 2.3 Content Type Handler Framework
Each content type will implement the `ContentTypeHandler` interface, similar to the existing YouTube handler:

```typescript
export interface ContentTypeHandler {
  type: string;
  detect(url: URL): boolean;
  downloadContent(url: string): Promise<any>;
  getPrompt(content: any): string;
  parseLLMResponse(response: string): any;
  validateLLMOutput(parsed: any): boolean;
  getNoteContent(llmResponse: string, metadata: ContentMetadata): string;
  getFolderName(): string;
}
```

### 2.4 Content Type-Specific Templates

#### 🍴 Recipe Template
```markdown
# {{recipe_name}}

🔗 [Source]({{source_url}})  

![Image]({{image_url}})

## Ingredients
{{ingredients}}

## Instructions
{{instructions}}

## Notes
{{notes}}

## Metadata
- Servings: {{servings}}
- Prep Time: {{prep_time}}
- Cook Time: {{cook_time}}
```

#### 🍽️ Restaurant Template and 🎬 Movie Template will follow similar structures with their relevant metadata fields.
```

Here's the existing related code that this needs to integrate with:
- ContentTypeRegistry class
- ContentTypeHandler interface
- Existing content handlers like YouTubeHandler and MediumHandler
- The ImportPipelineOrchestrator that uses the content handlers

Please provide:
1. All files that need to be created or modified with complete implementations
2. Unit tests that verify the core functionality
3. Any integration code needed to connect this with existing components
4. Instructions for manually testing this slice in Obsidian
5. Ensure the build and tests pass, but only those that were written in this task

When complete, I should be able to detect generic content types (recipes, restaurants, movies) using LLM-based content detection, with proper caching for efficiency.
---Here's the existing related code that this needs to integrate with:
- ContentTypeRegistry class
- ContentTypeHandler interface
- Existing content handlers like YouTubeHandler and MediumHandler
- The ImportPipelineOrchestrator that uses the content handlers

Please provide:
1. All files that need to be created or modified with complete implementations
2. Unit tests that verify the core functionality
3. Any integration code needed to connect this with existing components
4. Instructions for manually testing this slice in Obsidian
5. Ensure the build and tests pass, but only those that were written in this task

When complete, I should be able to detect generic content types (recipes, restaurants, movies) using LLM-based content detection, with proper caching for efficiency.
---