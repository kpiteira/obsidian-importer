# Initial documents

## Idea

I created it using SuperWhisper which allows me to speak on my phone or mac and ramble on my idea.

## PRD

I used gpt4o to iterate on the PRD

### Initial prompt

```text
I would like to start a new project, which is an Obsidian importer, which allows you to import content into an Obsidian node based on a URL. And depending on the content, it will automatically download it, interpret it through an LLM and then format it correctly. My goal is to develop an Obsidian plugin for that. And I would like to start by writing a product requirement document, then an architecture document, and then a very detailed task list. So my first ask to you, based on the description below, is to help me write a product requirement document. I want this to be a brainstorm. It's a conversation, so please ask me any question. Oh, and all my documents, I want to be in Markdown, please.
```
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