We are continuing the implementation of my Obsidian Importer with the v2. Here is the next task on the list:
I'm implementing Slice 2.1: Content Type Registry Foundation from my Obsidian Importer V2 plan.

Goal: Implement the content type registry system that supports multiple content handlers.

The implementation tasks are:
1. Create `ContentTypeRegistry` class with registration and lookup methods
2. Refactor existing `YouTubeHandler` to conform to enhanced interface
3. Implement caching system for detection results
4. Register YouTube handler with the registry
5. Update orchestrator to use registry for content type detection
6. Test that YouTube imports still work with the registry
7. Verify content type caching works correctly

Here are the relevant sections from my architecture document:

```typescript
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
```

The relevant requirements from the PRD are:

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

Here's the existing related code that this needs to integrate with:

1. ContentTypeHandler.ts - Contains the current ContentTypeHandler interface
2. typeDispatcher.ts - Current implementation of content type detection that will be replaced by the registry
3. YouTubeHandler.ts - Current YouTube handler implementation that needs to be updated
4. ImportPipelineOrchestrator.ts - Orchestrator that needs to be updated to use the new registry

Please provide:
1. All files that need to be created or modified with complete implementations
2. Unit tests that verify the core functionality
3. Any integration code needed to connect this with existing components
4. Instructions for manually testing this slice in Obsidian
5. Ensure the build and tests pass, but only those that were written in this task

When complete, I should be able to import YouTube content through the new registry system with caching capabilities for more efficient content type detection.
---

Based on my analysis of your code, this prompt correctly captures the implementation requirements for Slice 2.1. The prompt:

1. Clearly identifies the goal of implementing the content type registry
2. Lists the specific implementation tasks needed
3. Includes the relevant architecture design for the ContentTypeRegistry class
4. Highlights the key PRD requirements related to content detection
5. Identifies all existing code files that need modification
6. Requests comprehensive implementation including tests and integration points

This implementation will lay the foundation for adding more content type handlers in future slices while ensuring that existing YouTube functionality continues to work through the new registry system.