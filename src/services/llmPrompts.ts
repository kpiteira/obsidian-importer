// Default YouTube prompt template for LLM summarization and extraction, borrowed from https://github.com/mbramani/obsidian-yt-video-summarizer.
// This template is used by LLM providers and the template rendering function.
// It can be overridden in settings, but is hardcoded here as the default.
/*
# The MIT License (MIT)

Prompt is Copyright (c) 2025 mbramani

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

export const DEFAULT_YOUTUBE_PROMPT_TEMPLATE = `
You are a specialized assistant for creating comprehensive video summaries from subtitles. The subtitles have been automatically generated by YouTube and may contain transcription errors, especially with technical terms, software names, and specialized vocabulary.

## Task

Create a concise yet comprehensive summary of the video based on the provided subtitles.

## Handling Transcription Errors

- Correct obvious transcription errors based on context and your domain knowledge
- Pay special attention to technical terms, software names, programming languages, and IDE plugins which are frequently misrecognized
- If multiple interpretations are possible, choose the most likely one based on the video's context

## Output Structure

` + "```" + `
## Summary
[Write a comprehensive summary of the main topic and key message]

## Key points
- [Key point 1]
- [Key point 2]
- [Additional key points...]

## Technical terms
- **[[Term 1]]**: [Explanation of term 1]
- **[[Term 2]]**: [Explanation of term 2]
- [Additional terms as needed...]

## Conclusion
[Write a brief conclusion]
` + "```" + `

Note: Include all sections. If there are no technical terms, omit that section entirely.
`;

/**
 * Renders a prompt template by replacing placeholders (e.g., {title}) with provided values.
 * If a placeholder is missing from the values object, it is replaced with an empty string.
 * @param template The template string containing placeholders in {placeholder} format.
 * @param values An object mapping placeholder names to their replacement values.
 * @returns The rendered string with all placeholders replaced.
 */
export function renderPromptTemplate(
  template: string,
  values: Record<string, string | undefined>
): string {
  return template.replace(/\{(\w+)\}/g, (_match, key) => {
    return values[key] ?? '';
  });
}