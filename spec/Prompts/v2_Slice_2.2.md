We are continuing the implementation of my Obsidian Importer with the v2. Here is the next task on the list:
I'm implementing Slice 2.2: Enhanced Content Detection System from my Obsidian Importer V2 plan.

Goal: Implement an enhanced content detection system that can identify various content types through URL-based detection and prepare the framework for content-based detection.

The implementation tasks are:
- Enhance the `ContentTypeHandler` interface with new required methods
- Implement URL-based detection strategy
- Create initial framework for content-based detection
- Update existing handlers to implement enhanced interface
- Update orchestrator to use the two-phase detection strategy
- Add progress reporting for content detection phase

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
}

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

export class ImportPipelineOrchestrator {
  // ...
  
  async import(url: string): Promise<void> {
    const TOTAL_STEPS = 5;
    let currentStep = 0;
    
    try {
      // Stage 1: URL validation
      this.emitProgress('validating_url', 'Validating URL', ++currentStep, TOTAL_STEPS);
      // Implementation
      
      // Stage 2: Content type detection
      this.emitProgress('detecting_content_type', 'Detecting content type', ++currentStep, TOTAL_STEPS);
      const handler = await this.deps.contentTypeRegistry.detectContentType(url);
      
      // Stage 3: Content download
      this.emitProgress('downloading_content', `Downloading ${handler.type} content`, ++currentStep, TOTAL_STEPS);
      // Implementation
      
      // Stage 4: LLM processing
      this.emitProgress('processing_with_llm', 'Processing with LLM', ++currentStep, TOTAL_STEPS);
      // Implementation
      
      // Stage 5: Note creation
      this.emitProgress('writing_note', 'Creating note in Obsidian', ++currentStep, TOTAL_STEPS);
      // Implementation
      
      // Complete
      this.emitComplete(notePath);
      
    } catch (error) {
      this.handleError(error);
    }
  }
  
  private emitProgress(stage: string, message: string, step: number, totalSteps: number): void {
    for (const listener of this.progressListeners) {
      listener(stage, message, step, totalSteps);
    }
  }
}
```

The relevant requirements from the PRD are:

```markdown
## 2. New Content Types

### 2.2 Content Detection Strategy
The content detection system will be enhanced to:
- Identify URLs from specific domains (Medium.com, Goodreads.com)
- Use pattern recognition and content analysis for generic content types
- Implement a content detection pipeline that allows for graceful fallback

### 2.3 Content Type Handler Framework
Each content type will implement the `ContentTypeHandler` interface, similar to the existing YouTube handler:

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

1. The newly created ContentTypeRegistry from Slice 2.1
2. Existing YouTubeHandler implementation
3. The ImportPipelineOrchestrator which should be updated to use the new detection system
4. Helper utilities for web page content fetching

Please provide:
1. All files that need to be created or modified with complete implementations
2. Unit tests that verify the core functionality
3. Any integration code needed to connect this with existing components
4. Instructions for manually testing this slice in Obsidian
5. Ensure the build and tests pass, but only those that were written in this task

When complete, I should be able to:
1. Use the enhanced ContentTypeHandler interface in my existing and new content handlers
2. Have a two-phase detection system that first tries URL-based detection and then falls back to content-based detection
3. Have progress reporting for the content detection phase
4. See the framework in place for adding more sophisticated content-based detection in future slices

Some specific implementation notes:
- We need to add the new methods to the ContentTypeHandler interface
- Update the existing YouTubeHandler to implement the new interface
- Create a utility for fetching web page content (needed for content-based detection)
- Modify the orchestrator to use the new two-phase detection process
- Ensure we have proper caching to avoid redundant network requests
---