export interface ParsedKnowledgeItem {
  section: string;
  title: string;
  content: string;
}

/**
 * Parse a knowledge.md file into structured items.
 *
 * The expected format uses `## ` headers for sections (e.g. "Domain Knowledge",
 * "Developing Opinions") and `### ` headers for individual items within sections.
 * Content between a `### ` header and the next `### ` or `## ` belongs to that item.
 */
export function parseKnowledgeMd(content: string): ParsedKnowledgeItem[] {
  if (!content || content.trim().length === 0) {
    return [];
  }

  const lines = content.split('\n');
  const items: ParsedKnowledgeItem[] = [];

  let currentSection = '';
  let currentTitle = '';
  let currentContent: string[] = [];

  function flush() {
    if (currentTitle && currentSection) {
      items.push({
        section: currentSection,
        title: currentTitle,
        content: currentContent.join('\n').trim(),
      });
    }
    currentContent = [];
  }

  for (const line of lines) {
    // Detect ## section headers (but not ### which starts with ## too)
    if (line.startsWith('## ') && !line.startsWith('### ')) {
      flush();
      currentSection = line.replace(/^## /, '').trim();
      currentTitle = '';
      continue;
    }

    // Detect ### item headers
    if (line.startsWith('### ')) {
      flush();
      currentTitle = line.replace(/^### /, '').trim();
      continue;
    }

    // Accumulate content only when we're inside a ### block within a ## section
    if (currentTitle && currentSection) {
      currentContent.push(line);
    }
  }

  // Flush the last item
  flush();

  return items;
}
