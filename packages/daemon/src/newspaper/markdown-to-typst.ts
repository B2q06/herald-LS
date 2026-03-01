/**
 * Lightweight markdown-to-Typst markup converter.
 *
 * Converts the most common markdown patterns that differ from Typst markup.
 * Typst uses different syntax for headings, bold, links, ordered lists, and
 * horizontal rules. Italic, unordered lists, inline code, and paragraphs
 * are compatible between the two formats.
 */
export function markdownToTypst(md: string): string {
  let typ = md;

  // Headers: # Foo -> = Foo, ## Foo -> == Foo, etc.
  typ = typ.replace(/^(#{1,6})\s+(.+)$/gm, (_, hashes: string, text: string) => {
    const level = '='.repeat(hashes.length);
    return `${level} ${text}`;
  });

  // Bold: **text** -> *text* (Typst uses single * for bold)
  typ = typ.replace(/\*\*(.+?)\*\*/g, '*$1*');

  // Links: [text](url) -> #link("url")[text]
  typ = typ.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '#link("$2")[$1]');

  // Ordered lists: 1. item -> + item (Typst uses + for numbered lists)
  typ = typ.replace(/^\d+\.\s+/gm, '+ ');

  // Horizontal rules: --- -> #line(length: 100%)
  typ = typ.replace(/^---+$/gm, '#line(length: 100%, stroke: 0.5pt)');

  return typ;
}
