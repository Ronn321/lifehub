import { describe, expect, it } from 'vitest';
import {
  docToMarkdown,
  extractDocText,
  legacyBlocksToDoc,
  tiptapJsonToBlocks,
} from './pages-doc';

describe('legacyBlocksToDoc', () => {
  it('konvertiert heading mit Level-Clamping', () => {
    const doc = legacyBlocksToDoc([
      { id: 'h1', type: 'heading', content: { text: 'Titel', level: 2 } },
      { type: 'heading', content: { text: 'Riesig', level: 9 } },
    ]);
    expect(doc[0]).toMatchObject({ id: 'h1', type: 'heading', props: { level: 2 } });
    expect(doc[1]!.props?.level).toBe(3); // geclamped
  });

  it('konvertiert text-Blöcke mit TipTap-JSON und Plain-Text', () => {
    const doc = legacyBlocksToDoc([
      {
        type: 'text',
        content: { json: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hallo' }] }] } },
      },
      { type: 'text', content: { text: 'Einfach' } },
    ]);
    expect(doc[0]).toMatchObject({ type: 'paragraph' });
    expect(extractDocText([doc[0]])).toContain('Hallo');
    expect(extractDocText([doc[1]])).toContain('Einfach');
  });

  it('konvertiert todo/checklist zu checkListItem', () => {
    const doc = legacyBlocksToDoc([
      { type: 'todo', content: { text: 'Milch', checked: true } },
      { type: 'checklist', content: { items: [{ text: 'A', checked: false }, { text: 'B', checked: true }] } },
    ]);
    expect(doc[0]).toMatchObject({ type: 'checkListItem', props: { checked: true } });
    expect(doc[1]).toMatchObject({ type: 'checkListItem', props: { checked: false } });
    expect(doc[2]).toMatchObject({ type: 'checkListItem', props: { checked: true } });
  });

  it('behält Spezialblöcke als Custom-Blocks mit Props', () => {
    const doc = legacyBlocksToDoc([
      { id: 'br', type: 'browser_embed', content: { sessionId: 's1', startUrl: 'https://example.com' } },
      { type: 'image', content: { mediaId: 'm1', alt: 'Foto' } },
      { type: 'gallery', content: { mediaIds: ['a', 'b'] } },
      { type: 'divider', content: {} },
    ]);
    expect(doc[0]).toMatchObject({ id: 'br', type: 'browserEmbed', props: { sessionId: 's1' } });
    expect(doc[1]).toMatchObject({ type: 'lifehubImage', props: { mediaId: 'm1' } });
    // Editor-Props sind Primitive: komplexe Werte als JSON-String
    expect(doc[2]).toMatchObject({ type: 'gallery', props: { mediaIds: JSON.stringify(['a', 'b']) } });
    expect(doc[3]).toMatchObject({ type: 'divider' });
  });

  it('rettet unbekannte/entfernte Typen als Absatz statt sie zu verlieren', () => {
    const doc = legacyBlocksToDoc([{ type: 'finance_widget', content: { text: 'Alt' } }]);
    expect(doc[0]!.type).toBe('paragraph');
  });

  it('liefert für leere Seiten genau einen leeren Absatz', () => {
    const doc = legacyBlocksToDoc([]);
    expect(doc).toHaveLength(1);
    expect(doc[0]!.type).toBe('paragraph');
  });
});

describe('tiptapJsonToBlocks', () => {
  it('mappt Listen inkl. Marks und Verschachtelung', () => {
    const doc = tiptapJsonToBlocks({
      type: 'doc',
      content: [
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [
                { type: 'paragraph', content: [{ type: 'text', text: 'Punkt', marks: [{ type: 'bold' }] }] },
                {
                  type: 'bulletList',
                  content: [
                    { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Kind' }] }] },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });
    expect(doc).toHaveLength(1);
    expect(doc[0]).toMatchObject({ type: 'bulletListItem' });
    expect((doc[0]!.content as Array<{ text?: string }>)[0]?.text).toBe('Punkt');
    expect(doc[0]!.children?.[0]).toMatchObject({ type: 'bulletListItem' });
    expect(extractDocText(doc)).toContain('Punkt');
  });

  it('mappt codeBlock mit Sprache', () => {
    const doc = tiptapJsonToBlocks({
      type: 'doc',
      content: [{ type: 'codeBlock', attrs: { language: 'ts' }, content: [{ type: 'text', text: 'const a = 1;' }] }],
    });
    expect(doc[0]).toMatchObject({ type: 'codeBlock', props: { language: 'ts' } });
  });
});

describe('extractDocText', () => {
  it('sammelt Text aus Inline-Content, Links und Children', () => {
    const doc = [
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'Erster' },
          { type: 'link', url: 'https://x', content: [{ type: 'text', text: 'Linktext' }] },
        ],
        children: [{ type: 'bulletListItem', content: [{ type: 'text', text: 'Verschachtelt' }] }],
      },
    ];
    const text = extractDocText(doc);
    expect(text).toContain('Erster');
    expect(text).toContain('Linktext');
    expect(text).toContain('Verschachtelt');
  });

  it('übersteht kaputte Struktur ohne zu werfen', () => {
    expect(extractDocText(null)).toBe('');
    expect(extractDocText([{ type: 'paragraph' }, 'Müll', { content: { weired: true } }])).toBe('');
  });
});

describe('docToMarkdown', () => {
  it('erzeugt Markdown aus Standard- und Custom-Blöcken', () => {
    const md = docToMarkdown([
      { type: 'heading', props: { level: 2 }, content: [{ type: 'text', text: 'Abschnitt' }] },
      { type: 'paragraph', content: [{ type: 'text', text: 'Text mit ', styles: { bold: true } }, { type: 'text', text: 'Kursiv', styles: { italic: true } }] },
      { type: 'bulletListItem', content: [{ type: 'text', text: 'Punkt eins' }] },
      { type: 'checkListItem', props: { checked: true }, content: [{ type: 'text', text: 'Erledigt' }] },
      { type: 'divider' },
      { type: 'codeBlock', props: { language: 'ts' }, content: 'const x = 1;' },
      { type: 'lifehubTable', props: { columns: ['Name', 'Menge'], rows: [{ cells: ['Apfel', '3'] }] } },
      { type: 'bookmark', props: { url: 'https://example.com', title: 'Beispiel' } },
    ]);
    expect(md).toContain('## Abschnitt');
    expect(md).toContain('Punkt eins');
    expect(md).toContain('- [x] Erledigt');
    expect(md).toContain('```ts');
    expect(md).toContain('| Name | Menge |');
    expect(md).toContain('| Apfel | 3 |');
    expect(md).toContain('[Beispiel](https://example.com)');
    expect(md).toContain('---');
  });

  it('exportiert lifehubImage als media://-Referenz', () => {
    const md = docToMarkdown([{ type: 'lifehubImage', props: { mediaId: 'abc', alt: 'Foto' } }]);
    expect(md).toContain('![Foto](media://abc)');
  });
});
