import { describe, expect, it } from 'vitest';
import { markdownToTypst } from './markdown-to-typst.ts';

describe('markdownToTypst', () => {
  it('converts h1 headings to typst format', () => {
    expect(markdownToTypst('# Hello World')).toBe('= Hello World');
  });

  it('converts h2 headings', () => {
    expect(markdownToTypst('## Section')).toBe('== Section');
  });

  it('converts h3 through h6 headings', () => {
    expect(markdownToTypst('### Sub')).toBe('=== Sub');
    expect(markdownToTypst('#### Deep')).toBe('==== Deep');
    expect(markdownToTypst('##### Deeper')).toBe('===== Deeper');
    expect(markdownToTypst('###### Deepest')).toBe('====== Deepest');
  });

  it('converts bold text', () => {
    expect(markdownToTypst('This is **bold** text')).toBe('This is *bold* text');
  });

  it('handles multiple bold segments', () => {
    expect(markdownToTypst('**one** and **two**')).toBe('*one* and *two*');
  });

  it('converts links', () => {
    expect(markdownToTypst('[Click here](https://example.com)')).toBe(
      '#link("https://example.com")[Click here]',
    );
  });

  it('converts ordered lists to typst numbered lists', () => {
    const md = '1. First item\n2. Second item\n3. Third item';
    const expected = '+ First item\n+ Second item\n+ Third item';
    expect(markdownToTypst(md)).toBe(expected);
  });

  it('converts horizontal rules', () => {
    expect(markdownToTypst('---')).toBe('#line(length: 100%, stroke: 0.5pt)');
    expect(markdownToTypst('-----')).toBe('#line(length: 100%, stroke: 0.5pt)');
  });

  it('passes through unordered lists unchanged', () => {
    const md = '- Item one\n- Item two';
    expect(markdownToTypst(md)).toBe('- Item one\n- Item two');
  });

  it('passes through italic text unchanged', () => {
    expect(markdownToTypst('This is _italic_ text')).toBe('This is _italic_ text');
  });

  it('passes through inline code unchanged', () => {
    expect(markdownToTypst('Use `console.log` here')).toBe('Use `console.log` here');
  });

  it('handles multiline content with mixed formatting', () => {
    const md = `# Main Title

Some paragraph with **bold** and _italic_ text.

## Section Two

1. First
2. Second

- Bullet one
- Bullet two

---

[Link](https://example.com)`;

    const result = markdownToTypst(md);

    expect(result).toContain('= Main Title');
    expect(result).toContain('*bold*');
    expect(result).toContain('_italic_');
    expect(result).toContain('== Section Two');
    expect(result).toContain('+ First');
    expect(result).toContain('+ Second');
    expect(result).toContain('- Bullet one');
    expect(result).toContain('#line(length: 100%, stroke: 0.5pt)');
    expect(result).toContain('#link("https://example.com")[Link]');
  });

  it('handles empty string input', () => {
    expect(markdownToTypst('')).toBe('');
  });

  it('handles content that is already typst-compatible', () => {
    const plain = 'Just plain text with no markdown formatting.';
    expect(markdownToTypst(plain)).toBe(plain);
  });
});
