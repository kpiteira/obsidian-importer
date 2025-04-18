# 🎥 5-Minute Demo Script: From Idea to Code with AI

## Storyboard Overview

## Section 1: "From Idea to Code – Fast"
**Narration (0:00–0:20)**  
"Hey, I’m Karl. I lead product managers who lead product teams. And I’ve been exploring a question:  
*Can PMs go from idea to working code using AI — without being engineers?*  
Turns out... the answer is yes. Let me show you how."

## Section 2: "Hi, I’m Karl 👋"
**Narration (0:20–1:00)**  
"Recently, I built a real Obsidian plugin using an AI-driven workflow.  
What surprised me is how quickly I could go from idea to complete design documentation — PRD, architecture, tasks — in under an hour.  
Then, with help from GitHub Copilot, I implemented the whole thing slice by slice.  
I want to walk you through this process."

## Section 3: "The Workflow"
**Narration (1:00–1:45)**  
"Here’s how the flow works:
1. I start with an idea, recorded out loud using a voice-to-text tool like SuperWhisper.
2. GPT helps me shape that into a PRD.
3. We refine it into an architecture doc.
4. Then, we generate a task list made of vertical slices.
5. Each slice becomes a prompt for Copilot to implement.

What’s powerful is how fast this goes when you treat it like a conversation."

## Section 4: "4 Key Learnings"
**Narration (1:45–2:30)**
"Here’s what I learned:
1. Iterating through design docs is fast. You can do it in 30 minutes if you’re focused.
2. Talking to AI beats typing. It removes self-censorship and transmits nuance.
3. LLMs want to solve fast — but without guidance, they invent things. I learned to say: *This is a brainstorm. Please ask me questions.*
4. Finally: if you know what you want, and explain it clearly, the AI performs dramatically better."

## Section 5: "Live Demo 🔧"
**Narration (2:30–3:30)**
"Let me show you the plugin.  
I paste a Medium article URL.  
The plugin detects the content type, fetches the content, sends it to an LLM, and creates a clean, linked note in my Obsidian vault.  

Here’s the GitHub repo — it uses a clean architecture with handlers, registries, and an orchestrator.  
Built incrementally using Copilot as my coding agent."

## Section 6: "From Docs to Prompts"
**Narration (3:30–4:30)**  
"Let’s go behind the scenes.  
Here’s the PRD. Clear, structured, fast to make.
Now the architecture — refined through Q&A with GPT.
Then, a task list in slices. Each slice is turned into a prompt for Copilot.

Copilot was the best assistant I used. It felt like pair programming — it just needed clarity and constraints."

## Section 7: "You Can Do This Too"
**Narration (4:30–5:00)**
"This isn’t about replacing engineers. It’s about empowering PMs to prototype, explore, and validate faster.  
If you know how to break down a product into ideas and systems, you can already do this.  
Check the link in the description. I’d love to see what you build."

## Section 8: "Want to Try It?"
**Narration (Optional)**  
*GitHub repo: [github.com/kpiteira/obsidian-importer](https://github.com/kpiteira/obsidian-importer)*

---

## Obsidian Plugin Demo – Full Voiceover Script

"Let me show you the plugin in action.

I start by pasting a Medium article URL into the input modal. You’ll see the plugin immediately begins the import process. First, it detects the content type using the content type registry. Since it’s a Medium article, it routes it to the right handler.

It downloads the article content, generates a summary, highlights, and key topics using the selected LLM provider, and formats the response into a Markdown note.

Once done, it automatically opens the note inside Obsidian — clean, properly linked, and ready to use."

---

| Time | What’s on Screen | Visual/Camera | Audio / Narration |
|------|------------------|---------------|-------------------|
| **0:00–0:20** | Your face (webcam) | 🎥 Cam only | “Hey, I’m Karl. I lead PMs who lead teams...” *(intro hook)* |
| **0:20–1:00** | Face + occasional text pop-ins | 🎥 Cam + overlay (e.g. “Built a plugin with AI!”) | “Recently I built a real Obsidian plugin...” |
| **1:00–1:45** | Show folder: `idea.md`, `prd.md`, `arch.md`, etc. in VS Code | 🖥️ Screen share | “The process follows five steps...” |
| **1:45–2:30** | Face + dynamic overlay for each learning | 🎥 Cam + text on screen | “Here’s what I learned...” |
| **2:30–3:30** | Obsidian plugin demo (pre-recorded) | 🖥️ Obsidian screen | Voiceover (see section above) |
| **3:30–4:30** | VS Code view of `handlers/`, `orchestrator.ts`, etc. | 🖥️ Screen | “Here’s the repo in VS Code. Clean structure...” |
| **4:30–5:00** | Back to face + simple caption: *“You can do this too”* | 🎥 Cam + text | “This isn’t about replacing engineers...” |

---

## Text Overlays List (for On-Screen Messages)

### Section 1 (0:00–0:20)
- "From Idea to Code — Fast"
- "Can PMs build working code with AI?"

### Section 2 (0:20–1:00)
- "Obsidian plugin built with AI!"
- "Idea to plan: < 1 hour"

### Section 3 (1:00–1:45)
- Step 1: “🔊 Speak the idea”
- Step 2: “📄 Auto-generate PRD”
- Step 3: “🚧 Draft architecture”
- Step 4: “📅 Plan with tasks”
- Step 5: “🤖 Copilot implements code”

### Section 4 (1:45–2:30)
- "1. Docs are fast to iterate"
- "2. Talk > Type (use voice)"
- "3. Ask AI to ask YOU questions"
- "4. Be precise with what you want"

### Section 5 (2:30–3:30)
- "Demo: Medium article to Obsidian note"
- "Type → Detect → Analyze → Note"
- "Clean output, auto-linked"

### Section 6 (3:30–4:30)
- "Docs power the prompts"
- "PRD → Arch → Tasks → Slice prompt"
- "Copilot = Best coding agent"

### Section 7 (4:30–5:00)
- "Empower, not replace engineers"
- "You can do this too"
- "Link in description"

