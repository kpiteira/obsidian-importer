export interface LLMOutput {
  summary: string;
  keyPoints: string[];
  keyConcepts: string[];
}

/**
 * Parses a raw Markdown string from the LLM and extracts the Summary, Key Points, and Key Concepts sections.
 * Returns an LLMOutput object. Handles missing or malformed sections gracefully.
 */
export function parseLLMResponse(markdown: string): LLMOutput {
  // Helper to extract section content by heading
  function extractSection(heading: string): string {
    // Match heading (e.g., "## Summary") at start of line, case-insensitive
    const pattern = new RegExp(`^##\\s*${heading}\\s*\\n([\\s\\S]*?)(?=^##\\s|\\Z)`, 'im');
    const match = markdown.match(pattern);
    return match ? match[1].trim() : '';
  }

  // Helper to parse a Markdown list into array of strings
  function parseList(section: string): string[] {
    if (!section) return [];
    // Match lines starting with -, *, or numbered lists
    const lines = section.split('\n');
    const items: string[] = [];
    for (const line of lines) {
      const itemMatch = line.match(/^\s*(?:[-*]|\d+\.)\s+(.*)$/);
      if (itemMatch && itemMatch[1].trim()) {
        items.push(itemMatch[1].trim());
      }
    }
    // If no list items found, but section is non-empty, treat as single item if it's a single line
    if (items.length === 0 && section.trim()) {
      // If section is a single line, treat as one item
      if (lines.length === 1) {
        items.push(section.trim());
      }
    }
    return items;
  }

  const summarySection = extractSection('Summary');
  const keyPointsSection = extractSection('Key Points');
  const keyConceptsSection = extractSection('Key Concepts');

  return {
    summary: summarySection,
    keyPoints: parseList(keyPointsSection),
    keyConcepts: parseList(keyConceptsSection),
  };
}

/**
 * Validates the structure and content of an LLMOutput object.
 * Throws a descriptive error if invalid; returns true if valid.
 */
export function validateLLMOutput(output: LLMOutput): true {
  if (!output || typeof output !== 'object') {
    throw new Error('LLMOutput is missing or not an object.');
  }
  if (typeof output.summary !== 'string' || output.summary.trim() === '') {
    throw new Error('LLMOutput.summary must be a non-empty string.');
  }
  if (!Array.isArray(output.keyPoints)) {
    throw new Error('LLMOutput.keyPoints must be an array.');
  }
  if (output.keyPoints.length === 0) {
    throw new Error('LLMOutput.keyPoints must contain at least one item.');
  }
  for (let i = 0; i < output.keyPoints.length; i++) {
    const point = output.keyPoints[i];
    if (typeof point !== 'string' || point.trim() === '') {
      throw new Error(`LLMOutput.keyPoints[${i}] must be a non-empty string.`);
    }
  }
  if (!Array.isArray(output.keyConcepts)) {
    throw new Error('LLMOutput.keyConcepts must be an array.');
  }
  if (output.keyConcepts.length === 0) {
    throw new Error('LLMOutput.keyConcepts must contain at least one item.');
  }
  for (let i = 0; i < output.keyConcepts.length; i++) {
    const concept = output.keyConcepts[i];
    if (typeof concept !== 'string' || concept.trim() === '') {
      throw new Error(`LLMOutput.keyConcepts[${i}] must be a non-empty string.`);
    }
  }
  return true;
}