Please generate the prompt to implement Slice X.Y from the attached task list in the template format described below. I also provided as a reference the PRD: spec/obsidian_importer_prd_v2.md and the architecture document spec/obsidian_importer_architecture_v2.md.

---

Template for Slice task description:

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