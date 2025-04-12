import { ContentTypeHandler } from "./ContentTypeHandler";

export class YouTubeHandler implements ContentTypeHandler {
  public readonly type = "youtube";

  /**
   * Detects if the given URL is a YouTube video (youtube.com or youtu.be).
   * @param url The URL to check
   */
  detect(url: URL): boolean {
    const host = url.hostname.toLowerCase();
    return (
      host === "youtube.com" ||
      host === "www.youtube.com" ||
      host === "youtu.be" ||
      host === "www.youtu.be"
    );
  }
}
/**
 * Generates the final Markdown content for a YouTube note using the LLM output and the YouTube template.
 * @param output The parsed LLM output containing summary, keyPoints, and keyConcepts.
 * @returns The formatted Markdown string for the note.
 */
export function generateYouTubeNoteMarkdown(output: {
  summary: string;
  keyPoints: string[];
  keyConcepts: string[];
}): string {
  const keyPointsSection = output.keyPoints && output.keyPoints.length
    ? output.keyPoints.map(point => point.startsWith('-') ? point : `- ${point}`).join('\n')
    : '';
  const keyConceptsSection = output.keyConcepts && output.keyConcepts.length
    ? output.keyConcepts.map(concept => concept.startsWith('-') ? concept : `- ${concept}`).join('\n')
    : '';

  return [
    '## Summary',
    output.summary.trim(),
    '',
    '## Key Points',
    keyPointsSection,
    '',
    '## Key Concepts',
    keyConceptsSection
  ].join('\n');
}

