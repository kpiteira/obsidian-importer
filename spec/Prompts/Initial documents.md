# Initial documents

## Idea

I created it using SuperWhisper which allows me to speak on my phone or mac and ramble on my idea.

## PRD

I used gpt4o to iterate on the PRD

### Initial prompt

`I would like to start a new project, which is an Obsidian importer, which allows you to import content into an Obsidian node based on a URL. And depending on the content, it will automatically download it, interpret it through an LLM and then format it correctly. My goal is to develop an Obsidian plugin for that. And I would like to start by writing a product requirement document, then an architecture document, and then a very detailed task list. So my first ask to you, based on the description below, is to help me write a product requirement document. I want this to be a brainstorm. It's a conversation, so please ask me any question. Oh, and all my documents, I want to be in Markdown, please.`

then I pasted my idea file content

#### Response

```markdown
Awesome project idea—this is the kind of smart Obsidian automation that could become incredibly powerful! Let's kick off the brainstorming for the **Product Requirements Document (PRD)**, but first, I want to ask a few questions to make sure I really understand your vision and can help craft something that captures everything clearly.

### Questions for Clarification
1. **Scope of URL Input**:
   - Will the input always be a direct URL entered manually by the user, or will there be automation involved (e.g., clipboard monitoring, browser integration)?
2. **User Interaction**:
   - How much user control do you want before/after importing? Should users be able to edit the generated content before it's added to Obsidian?
3. **Custom Templates**:
   - Should users be able to define their own templates and logic for new content types?
4. **Vault Integration**:
   - Should the plugin automatically detect related notes using fuzzy matching or tags in Obsidian?
5. **Plugin Environment**:
   - Do you already have experience with the Obsidian plugin API or preferences on whether to build this in TypeScript vs. JS?
6. **LLM Integration**:
   - Any preference for the LLM backend (e.g., local model, OpenAI API, others)? And how do you want to handle cost/privacy here?
7. **Offline Support**:
   - Is this plugin intended to work offline for some content types (e.g., importing PDFs or images stored locally)?
8. **Error Handling and Logging**:
   - Should we consider a system to log and view import errors, failed fetches, or skipped content?

Once you answer those, I’ll draft the PRD structure in Markdown. Would you like me to include the YouTube template you uploaded as a reference point in the PRD too?
```

#### Iterations

I went on to answer the questions (I always use SuperWhisper as it allows me to speak which is much more liberating than writing and allows me to pass more information than the self censorship we often do with typing)

and the result was mostly the PRD that is in the project right now (which was just updated with Gemini's critique)

## Architecture

This one involved much more discussions as I wanted a detailed architecture document, but overall it took no more than 30 minutes
I was very clear that I wanted to work only on the MVP which helps scope, and along all the iteration, I kept repeating that this was a 1-person project and therefore should be as simple as possible.

### Initial Prompt
```text
Awesome. Now that we have the product requirement document, let's move on to the architecture document. Again, let's make this a conversation and a brainstorm. We'll work on that together. I would like you to help me write that architecture document for the MVP portion of the PRD, and where we dig into as many details as possible on the architecture and the technical requirements for this project.
I want to make sure, of course, that we hit on all the key features, all the key components of the project, but also the cross-cutting things like error handling, logging, security, wherever research is needed for things like LLLs. integration, things like that.
```

#### Response

The initial response was more like a feature list, definitely not an architecture doc. 

### Iteration

So I went on to clarify my ask:
```text
Okay, this looks more like a list of features than an architecture document. I was expecting a bit more technical details. I'm also slightly worried that you didn't ask me any questions. So let's go through these one by one. I want much more detail. I want this to be a conversation. Please ask me questions. We need to get into at least the next level of details, if not two more.
```

Then it started being much more details, asking me questions about my intent and clarifications. 
After art least 2 or 3 iterations on each section, we arrived at the final architecture document.

## Critique

Next step was cross checking and critique to improve quality. I used https://gemini.google.com/ with Gemini 2.5 Pro to critique my docs

### Initial Prompt

```text
I've been working on specifying my project and the current result is in the three files that I uploaded.
One is the idea, then the requirements, which describes the product vision and my requirements for the product. And then the third document is an attempt at detailed architecture for the MVP.
So I would like you to read those documents, give me your perspective, most importantly ***critique*** of the requirements document and the architecture, and give me advice on which parts are good, which parts need more work.
Please make concrete suggestions, in markdown, that I can update in my document.
Don't hesitate to point out things that have too many details or not enough.
```

#### Response

The response was a very well formated critique that mostly praised :) but also gave a lot of very good advice, including pointed out an inconsistency between the LLM formater and Template manager and suggested to merge both to make it sinpler and more clear. Great added value

## Task list

Next step was creating a super detailed task list. I used GitHub Copilot with Sonnet 3.7 for that.

### Initial Prompt

```text
I have created a few documents that describe my new project. There is the main idea, the product requirement document, and the architecture document for the MVP. I would like to focus on developing the MVP. Now that I have an architecture document, I would like to create a very detailed task list. Can you please help me by generating that detailed task list following the example in example_task_list.md?
As requested, this needs to be a really detailed task list that can be used by an AI in order to code this project, please.
```
I provided an example task list to guide it in the format and 

#### Response

I had to ask it to generate the markdown file as its first output was a weird mix of markup and markdown. The result looked pretty good so the next step was to turn again to my favorite critique.

## Task List Critique

Again, asking Gemini's help here with the prompt

```text
Thank you. I updated my architecture with all your advice. It was really great. 

Now I created a detailed task list which goal is to feed to an AI that will mostly code that project. Could you please give me your opinion on my task list, whether it has the right granularity, whether it has the right level of information. 

My plan is probably to feed it alongside with the PRD and architecture, and ask the AI to work on it. I'm not sure yet whether I feed everything and just ask it to go do it, or if I do it step by step, mostly with the objective of not consuming too many tokens and have this Unite not be too expensive. Let me know what you think on that as well.
```

## Starting v2

Before starting v2, I want to revise my MVP architecture document to make sure we start on solid basis. For that, I am going to ask Copilot to understand the deviation between MVP architecture document and the actual implementation: 

### Prompt

```text
I succesfully implemented my MVP which architecture was based on the document obsidian_importer_architecture. I would like to understand the deviation between my codebase and the architecture document, and to generate a new architecture document based on the actual implementation so that I can use it for a v2.
```

### Response

Copilot did an amazing job at understanding my codebase and write an updated document 

## V2 PRD

### Prompt

```text
I completed the implementation of my plugin MVP. I would like now to start my v2. My PRD for the MVP (provided here) had some ideas for the V2. I would like to write a detailed PRD for V2 based on these ideas. Can you please help me? Please note that this is a brainstorming together, and I would appreciate if you asked me questions so that we can refine the content of the PRD together, instead of just 1-shot producing the v2 prd on your own. Once we're done, we will write the output of the PRD in a new markdown file to preserve the existing one.
```

### Response

Again great job from Copilot

```markdown
I'd be happy to help you brainstorm and create a detailed PRD for version 2 of your Obsidian Importer plugin. This collaborative approach will help us refine the requirements effectively.

Looking at your current PRD, I can see you have some initial ideas for V2:
- Supporting additional content types beyond YouTube
- More flexibility in LLM model selection
- UI improvements

Let's start by exploring these areas with some questions:

### Content Types
1. Which specific content types from your "Eventually" list would you like to prioritize for V2? 
2. Are there any challenges or unique considerations for each content type you're concerned about?
3. What's your strategy for content extraction for different sources (e.g., APIs, web scraping)?

### LLM Model Selection
1. Do you have specific providers in mind beyond the ones mentioned (Requesty, OpenRouter, OpenAI, Ollama)?
2. What criteria would users use to select models (cost, speed, quality, token limits)?
3. How would you like to handle API keys for different providers?

### UI Improvements
1. What specific UI pain points have you identified in V1?
2. Would you like to add any visualization features for the import process?
3. Are there any settings or configuration UI improvements you'd like to make?

Additionally:
- Have you received any user feedback from V1 that would influence V2 priorities?
- Are there any technical limitations you encountered in V1 that need addressing?
- Do you have any performance concerns as you add more content types?

Let's start with these questions and build our V2 PRD from there.
```

I love the questions about user feedback, limitations and performance concerns!

After multiple questions/answers, we landed on the final PRD. I then proceeded to working on the architecture document

## V2 Architecture Document

### Prompt

```text
This is great, thank you! I saved it in prd_v2.
I would like now to generate our detailed architecture document, using as a basis the one from the mvp (attached). Like in the previous step, please see this as a brainstorm, and do ask me questions so that we reach an optimal and detailed architecture document!
```

### Response

```markdown
I'd be happy to help you brainstorm a detailed architecture document for V2, using the MVP architecture document as a basis. This collaborative approach will help us refine the architecture effectively.

Looking at your MVP architecture document and the V2 PRD we just created, I can see we need to expand the architecture to support multiple content types and LLM providers, while maintaining the solid foundation you've already built.

Let's start with some key questions to guide our discussion:

### Content Type Architecture
1. How do you envision the content type registry working? Should it be a central registry that all handlers register with, or would you prefer lazy-loading handlers?
2. For the generic content handlers (recipes, restaurants, movies), do you want a single generic handler with specialized logic or completely separate handlers?

### LLM Provider Architecture
1. How should we handle the provider factory pattern? Should we extend your current factory approach or create a new provider registry?
2. For storing multiple API keys (one per provider), do you have a preference for the storage approach?

### Error Handling and Recovery
1. Would you like to implement specific retry strategies for different types of operations (network, LLM calls, etc.)?
2. How granular should error reporting be to users vs. logging for developers?

### State Management
1. The MVP architecture document mentions "more formal state management" - do you have specific ideas or would you like suggestions?
2. How would you like to handle the history of recent imports? As in-memory state, persistent storage, or both?

### UI Architecture
1. For the settings UI with dynamic fields based on provider selection, do you have a preference for how this should be implemented?
2. For the progress indication improvements, should we extend the current progress callback system or take a different approach?

Let's start with these questions and then we can dive deeper into specific areas.
```

## Detailed Task List

### Prompt

```text
Great. When implementing the MVP, I used a detailed task list as attached which purpose was to be implemented by an AI. However it gave me a lot of trouble as the implementation constantely focused on the local parts, with no stitching together along the way, and I had a lot of work to do afterward to untangle a lot of local choices that were ok for the given task but weren't very good in the overall architecture.
I'd like your help to generate a very detailed task list, but taking into account this feedback. Feel free to recommend a different format, and please, let's make sure that we can test the functionnality along the way, with a project that evolves as we implement the various tasks and is testable in the plugin at least at the major task level.
```

### Response

The detailed task list v2

### Asking how to prompt for optimal result

```text
Perfect, thank you! Do you have a suggestion about how I should prompt the AI to implement a given slice? Should I provide it the architecture document, or the prd too? the entire task list or just the slice?
```

### Response

For the most effective implementation, I recommend a structured approach when prompting the AI to implement a specific slice. Here's how I would suggest doing it:

#### Optimal Prompting Strategy for Slice Implementation

1. **Start with the specific slice context**:
   - Provide the specific slice details from the task list
   - Include the goal statement so the AI understands the purpose

2. **Add relevant architectural context**:
   - Include only the sections from the architecture document that are directly relevant to the slice
   - For example, for a provider implementation, include the LLM Provider interface and base classes

3. **Include minimal PRD context**:
   - Provide only the PRD sections that define requirements for the specific functionality

4. **Show existing related code**:
   - Share relevant existing code that the new implementation needs to integrate with
   - For early slices, include core orchestrator code to show how components connect

5. **Request specific deliverables**:
   - Ask for all files that need to be created or modified
   - Request tests that demonstrate the functionality works

#### Example Prompt Template

```
I'm implementing Slice X.Y: [Slice Title] from my Obsidian Importer V2 plan.

Goal: [Insert goal from task list]

The implementation tasks are:
[List specific implementation points from the slice]

Here are the relevant sections from my architecture document:
[Paste only relevant architecture sections]

The relevant requirements from the PRD are:
[Paste only relevant PRD sections]

Here's the existing related code that this needs to integrate with:
[Paste relevant existing code]

Please provide:
1. All files that need to be created or modified with complete implementations
2. Unit tests that verify the core functionality
3. Any integration code needed to connect this with existing components
4. Instructions for manually testing this slice in Obsidian

When complete, I should be able to [describe expected testable outcome].
```

This approach gives the AI enough context to understand what needs to be built and how it fits into the larger system, while avoiding overwhelming it with irrelevant information. It also explicitly requests complete deliverables that you can directly implement and test.

As you progress through the slices, you can reference previously implemented slices when they're relevant to the current work, which provides continuity while maintaining focus on the current task.


### Asking for a meta-prompt

```text
Do you think you could go meta and design a prompt to ask the AI to generate the prompt following the template you provided above, with all the relevant information to describe a given slice, based on the prd and architecture doc and codebase? I want to use the fullest of AI's power :)
```

### Response

I'd be happy to design a meta-prompt that helps you generate slice-specific implementation prompts. This approach will leverage AI to prepare the optimal context for each implementation task:

#### Meta-Prompt for Generating Slice Implementation Prompts

```
I'm preparing to implement Slice [X.Y: Slice Title] from my Obsidian Importer V2 plan. Before I start coding, I'd like you to help me create a comprehensive implementation prompt that I can use with an AI coding assistant.

Here's the slice I want to implement:

[Paste the complete slice section from the task list]

I have these documents available:
1. A V2 PRD document
2. A V2 Architecture document
3. My existing codebase

Please generate a well-structured implementation prompt following this template:

---
I'm implementing Slice [X.Y: Slice Title] from my Obsidian Importer V2 plan.

Goal: [Extract the goal from the slice]

The implementation tasks are:
[Format the implementation points from the slice as a clear list]

Here are the relevant sections from my architecture document:
[Please identify and extract ONLY the most relevant sections from this architecture document that directly relate to this slice]

The relevant requirements from the PRD are:
[Please identify and extract ONLY the most relevant requirements from this PRD document that directly relate to this slice]

Here's the existing related code that this needs to integrate with:
[Please identify key files/components from the current structure that will need to interact with this implementation]

Please provide:
1. All files that need to be created or modified with complete implementations
2. Unit tests that verify the core functionality
3. Any integration code needed to connect this with existing components
4. Instructions for manually testing this slice in Obsidian

When complete, I should be able to [describe the expected testable outcome based on the slice goal].
---

For you to generate this prompt properly, I'll now provide:
1. The relevant section from my V2 Architecture document
2. The relevant section from my V2 PRD
3. Key information about my existing codebase structure and relevant files

[Paste architecture document or sections]

[Paste PRD document or sections]

[Describe/paste key information about your codebase structure]
```

This meta-prompt:

1. Asks the AI to extract only the most relevant information from your documentation
2. Formats the implementation tasks clearly
3. Identifies the existing code components that will interact with the new implementation
4. Creates a focused, actionable implementation prompt

When you receive the generated implementation prompt, you can review it to ensure it contains all necessary context before using it with your coding assistant. This approach helps streamline your workflow by delegating the context-gathering to the AI while maintaining control over the final implementation prompt.