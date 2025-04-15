# 🚀 Obsidian Importer V2 – Product Requirements Document

## 1. Overview and Goals for V2

Building on the success of the MVP which focused on YouTube content imports, Obsidian Importer V2 expands the plugin's capabilities to support multiple content types and provide users with greater flexibility in LLM model selection. V2 aims to make the plugin more versatile while maintaining the streamlined user experience established in V1.

### Core Goals for V2:
- Support additional content types beyond YouTube videos
- Provide flexible LLM model selection across multiple providers
- Enhance the user interface with improved progress indication and workflow
- Implement more robust error handling and recovery
- Maintain architectural integrity while expanding functionality

## 2. New Content Types

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

#### 📄 Medium Article Template
```markdown
# {{title}}

Author: {{author}}  🔗 [Read on Medium]({{article_url}})

## Summary
{{summary}}

## Highlights
{{highlights}}

## Key Topics
{{key_topics}}

## Metadata
- Published: {{published_date}}
- Read time: {{read_time}}
```

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

### 2.5 Content Extraction Approach
- **Medium Articles**: Extract article text, author info, and publication data
- **Goodreads**: Extract book details, ratings, and description
- **Generic Content**: Use web scraping with intelligent content identification
- **Error Cases**: Implement fallback to generic extraction if specific extraction fails

## 3. Enhanced LLM Integration

### 3.1 Provider Selection System
- Implement a dropdown menu in settings for selecting LLM providers:
  - Requesty
  - OpenRouter
  - OpenAI
  - Local (e.g., Ollama)

### 3.2 Provider-Specific Configurations
- **Remote Providers**: Auto-configure endpoints based on provider selection
- **Local Provider**: Additional field for specifying endpoint URL (e.g., http://localhost:11434/v1)

### 3.3 Model Listing and Selection
- Implement a model selection dropdown that updates based on selected provider
- For providers with API access to model lists, fetch available models
- For providers without such APIs, maintain a curated list of common models

### 3.4 API Key Management
- Use Obsidian's secret management system to securely store API keys
- Remember previously entered keys for each provider
- Implement a "Test Connection" button to validate API settings

### 3.5 Provider Interface
Extend the LLM Provider interface to support multiple providers:

```typescript
export interface LLMProvider {
  getName(): string;
  getAvailableModels(): Promise<string[]>;
  callLLM(prompt: string, options?: LLMOptions): Promise<string>;
  validateConnection(): Promise<boolean>;
}
```

## 4. UI Improvements

### 4.1 Settings Panel Enhancements
- Reorganize settings into logical sections:
  - General Settings
  - LLM Configuration
  - Content Type Settings
- Add visual indicators for valid/invalid configuration
- Implement provider-specific setting fields that show/hide based on selection

### 4.2 Import Process Improvements
- Display more detailed progress indicators during import process
- Add percentage or step count to progress indicator (e.g., "Step 2/5: Downloading content")
- Automatically open newly created notes after import completion
- Add a "History" section showing recent imports with status (success/failure)

### 4.3 Error Handling & Recovery
- Implement more detailed error messages with suggested resolutions
- Add retry capability for failed operations
- Log detailed diagnostics to help troubleshoot issues
- Provide user-friendly error messages based on error type

## 5. Technical Considerations

### 5.1 Architecture Updates
- Maintain the orchestrator pattern while extending for multiple content types
- Implement a content type registry for dynamically loading handlers
- Enhance error recovery with retry mechanisms for network operations
- Implement a more formal state management approach

### 5.2 Testing Strategy
- Add unit tests for new content type handlers
- Implement integration tests for the provider selection system
- Add snapshot tests for template rendering

### 5.3 Documentation
- Generate comprehensive API documentation
- Create developer guides for adding new content types
- Update user documentation with new features

## 6. Future Considerations for V3

Features explicitly deferred to V3:
- Template management UI for customizing templates
- Setting different default models for different content types
- Displaying model performance metrics and estimated costs
- Batch processing capabilities for multiple URLs
- Note merging (updating existing notes instead of creating new ones)
- Advanced vault integration with fuzzy matching for backlinks
- Custom logic scripting for advanced template behavior
- Performance optimization for larger content

## 7. Timeline and Development Approach

### 7.1 Development Phases
1. **Core Infrastructure Updates** (2 weeks)
   - Implement provider selection system
   - Extend orchestrator for multiple content types
   - Update error handling system

2. **Content Type Implementation** (3-4 weeks)
   - Medium articles handler
   - Goodreads handler  
   - Generic content handlers (recipes, restaurants, movies)

3. **UI Improvements** (1-2 weeks)
   - Settings panel redesign
   - Progress indicator enhancements
   - History feature

4. **Testing and Documentation** (1 week)
   - Comprehensive testing
   - User documentation updates

### 7.2 Milestone Deliverables
1. **Alpha**: Core infrastructure with Medium article support
2. **Beta**: All content types implemented with basic UI
3. **Release Candidate**: Complete features with testing
4. **V2 Release**: Fully tested and documented release