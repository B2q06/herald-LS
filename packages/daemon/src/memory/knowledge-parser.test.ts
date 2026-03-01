import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { parseKnowledgeMd } from './knowledge-parser.ts';

describe('parseKnowledgeMd', () => {
  it('parses real ml-researcher knowledge.md fixture', async () => {
    const content = await readFile('/home/b/herald/memory/agents/ml-researcher/knowledge.md', 'utf-8');
    const items = parseKnowledgeMd(content);

    // Should produce items from all ## sections that contain ### entries
    expect(items.length).toBeGreaterThan(0);

    // Check that known sections appear
    const sections = [...new Set(items.map((i) => i.section))];
    expect(sections).toContain('Domain Knowledge');
    expect(sections).toContain('Developing Opinions');
    expect(sections).toContain('Predictions Log');

    // Check a specific known item
    const moe = items.find((i) => i.title.includes('MoE Architecture Dominance'));
    expect(moe).toBeDefined();
    expect(moe!.section).toBe('Domain Knowledge');
    expect(moe!.content).toContain('Mixture of Experts');

    // Check an opinion item
    const moeOpinion = items.find((i) => i.title.includes('MoE architectures will remain dominant'));
    expect(moeOpinion).toBeDefined();
    expect(moeOpinion!.section).toBe('Developing Opinions');
    expect(moeOpinion!.content).toContain('Confidence:');

    // Accountability section uses ### but has a table — should still parse
    const calibration = items.find((i) => i.title === 'Calibration Record');
    expect(calibration).toBeDefined();
    expect(calibration!.section).toBe('Accountability');
  });

  it('returns empty array for empty content', () => {
    expect(parseKnowledgeMd('')).toEqual([]);
    expect(parseKnowledgeMd('   ')).toEqual([]);
    expect(parseKnowledgeMd('\n\n')).toEqual([]);
  });

  it('returns empty array for content with no headers', () => {
    const items = parseKnowledgeMd('Just some plain text\nwith multiple lines\nbut no headers.');
    expect(items).toEqual([]);
  });

  it('ignores content before the first ## header', () => {
    const content = `# Top Level Title

Some preamble text.

## Section One

### Item A
Content for A.

### Item B
Content for B.
`;
    const items = parseKnowledgeMd(content);
    expect(items).toHaveLength(2);
    expect(items[0].title).toBe('Item A');
    expect(items[1].title).toBe('Item B');
    expect(items[0].section).toBe('Section One');
  });

  it('handles ### items without a preceding ## (skips them)', () => {
    const content = `### Orphaned Item
This has no section parent.

## Real Section

### Valid Item
Valid content.
`;
    const items = parseKnowledgeMd(content);
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe('Valid Item');
    expect(items[0].section).toBe('Real Section');
  });

  it('handles multiple ## sections with ### items', () => {
    const content = `## Section A

### Item 1
Content 1.

### Item 2
Content 2.

## Section B

### Item 3
Content 3.
`;
    const items = parseKnowledgeMd(content);
    expect(items).toHaveLength(3);
    expect(items[0]).toEqual({ section: 'Section A', title: 'Item 1', content: 'Content 1.' });
    expect(items[1]).toEqual({ section: 'Section A', title: 'Item 2', content: 'Content 2.' });
    expect(items[2]).toEqual({ section: 'Section B', title: 'Item 3', content: 'Content 3.' });
  });

  it('handles ## sections with no ### children', () => {
    const content = `## Empty Section

Just some text under a section, no sub-items.

## Section With Items

### An Item
Item content here.
`;
    const items = parseKnowledgeMd(content);
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe('An Item');
    expect(items[0].section).toBe('Section With Items');
  });

  it('trims content whitespace', () => {
    const content = `## Section

### Item With Whitespace

   Indented content.

   More indented content.

`;
    const items = parseKnowledgeMd(content);
    expect(items).toHaveLength(1);
    expect(items[0].content).toBe('Indented content.\n\n   More indented content.');
  });

  it('handles multiline content blocks with blank lines', () => {
    const content = `## Domain

### Multi-Line Item
First paragraph.

Second paragraph.

- Bullet 1
- Bullet 2
`;
    const items = parseKnowledgeMd(content);
    expect(items).toHaveLength(1);
    expect(items[0].content).toContain('First paragraph.');
    expect(items[0].content).toContain('Second paragraph.');
    expect(items[0].content).toContain('- Bullet 1');
  });
});
