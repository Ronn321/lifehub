/**
 * Pages-Dokument-Modell (BlockNote)
 *
 * Der Editor speichert pro Seite ein BlockNote-Dokument als Array von
 * Block-Objekten in `pages.content` (JSONB). Legacy-Seiten besitzen stattdessen
 * `page_blocks`-Zeilen; `legacyBlocksToDoc()` konvertiert diese beim ersten
 * Öffnen (persist-on-read). Diese Datei enthält:
 *  - legacyBlocksToDoc: Legacy-Blöcke → BlockNote-Doc
 *  - tiptapJsonToBlocks: TipTap-JSON (alter Text-Block) → BlockNote-Blöcke
 *  - extractDocText: kompletter Textinhalt (für Suche)
 *  - docToMarkdown: Markdown-Export aus dem Doc
 *
 * Alle Parser sind toleranti (unknown-Inputs, optionale Felder), da Legacy-
 * Inhalte manuell erzeugt wurden und nicht schema-validiert sind.
 */

export interface BlockNoteInline {
  type: string;
  text?: string;
  styles?: Record<string, unknown>;
  url?: string;
  content?: BlockNoteInline[];
}

export interface BlockNoteBlock {
  id?: string;
  type: string;
  props?: Record<string, unknown>;
  content?: BlockNoteInline[] | string | undefined;
  children?: BlockNoteBlock[];
}

type LegacyBlockLike = {
  id?: string;
  type: string;
  content?: unknown;
};

// Typen, die als eigene Custom-Blocks im Editor weiterleben (props = alter
// Block-Content). Der Rest wird auf Standard-BlockNote-Blöcke abgebildet.
const PASSTHROUGH_CUSTOM_BLOCKS: Record<string, string> = {
  browser_embed: 'browserEmbed',
  research_workspace: 'researchWorkspace',
};

function clampHeadingLevel(level: unknown): number {
  const n = Number(level);
  if (!Number.isFinite(n)) return 1;
  return Math.min(3, Math.max(1, Math.round(n)));
}

function textInline(text: string, styles?: Record<string, unknown>): BlockNoteInline {
  const trimmed = text.length > 0;
  return { type: 'text', text: trimmed ? text : '', ...(styles && Object.keys(styles).length ? { styles } : {}) };
}

function inlineArray(...items: BlockNoteInline[]): BlockNoteInline[] {
  return items;
}

/** TipTap-Marks → BlockNote-Styles */
function stylesFromMarks(marks: unknown): Record<string, unknown> {
  const styles: Record<string, unknown> = {};
  if (!Array.isArray(marks)) return styles;
  for (const mark of marks as Array<{ type?: string; attrs?: Record<string, unknown> }>) {
    switch (mark?.type) {
      case 'bold': styles.bold = true; break;
      case 'italic': styles.italic = true; break;
      case 'underline': styles.underline = true; break;
      case 'strike': styles.strike = true; break;
      case 'code': styles.code = true; break;
      default: break;
    }
  }
  return styles;
}

/** TipTap-Inline-Node(s) → BlockNote-Inline-Content */
function tipTapInline(node: unknown): BlockNoteInline[] {
  if (!node || typeof node !== 'object') return [];
  const n = node as { type?: string; text?: string; marks?: unknown; attrs?: Record<string, unknown>; content?: unknown[] };
  switch (n.type) {
    case 'text':
      return [textInline(String(n.text ?? ''), stylesFromMarks(n.marks))];
    case 'hardBreak':
      return [textInline('\n')];
    case 'link': {
      const children = (n.content ?? []).flatMap((child) => tipTapInline(child));
      return [{ type: 'link', url: String(n.attrs?.href ?? ''), content: children }];
    }
    default: {
      // Unbekannte Wrapping-Nodes: Inhalt nach oben ziehen
      return (n.content ?? []).flatMap((child) => tipTapInline(child));
    }
  }
}

function paragraphBlock(content: BlockNoteInline[], id?: string): BlockNoteBlock {
  return { ...(id ? { id } : {}), type: 'paragraph', content };
}

/**
 * Alter Text-Block (TipTap-JSON in content.json) → BlockNote-Blöcke.
 * Unterstützt: paragraph, heading, Listen (verschachtelt), blockquote,
 * codeBlock, horizontalRule, Bilder.
 */
export function tiptapJsonToBlocks(json: unknown): BlockNoteBlock[] {
  if (!json || typeof json !== 'object') return [];
  const root = json as { type?: string; content?: unknown[] };
  if (root.type !== 'doc' || !Array.isArray(root.content)) {
    // Fallback: bereits Text?
    return [];
  }

  const convertNode = (node: unknown, depth: number): BlockNoteBlock[] => {
    if (!node || typeof node !== 'object') return [];
    const n = node as { type?: string; attrs?: Record<string, unknown>; content?: unknown[] };
    switch (n.type) {
      case 'paragraph':
        return [paragraphBlock((n.content ?? []).flatMap((c) => tipTapInline(c)))];
      case 'heading': {
        const level = clampHeadingLevel(n.attrs?.level ?? 1);
        return [{
          type: 'heading',
          props: { level },
          content: (n.content ?? []).flatMap((c) => tipTapInline(c)),
        }];
      }
      case 'bulletList':
        return (n.content ?? []).flatMap((item) => convertListItem(item, 'bulletListItem', depth));
      case 'orderedList':
        return (n.content ?? []).flatMap((item) => convertListItem(item, 'numberedListItem', depth));
      case 'blockquote':
        return [{
          type: 'quote',
          content: (n.content ?? []).flatMap((c) => tipTapInline(c)),
        }];
      case 'codeBlock':
        return [{
          type: 'codeBlock',
          props: { language: String(n.attrs?.language ?? 'text') },
          content: (n.content ?? []).flatMap((c) => tipTapInline(c)).map((inline) => inline.text ?? '').join(''),
        }];
      case 'horizontalRule':
        return [{ type: 'divider' }];
      case 'image':
        return [{
          type: 'lifehubImage',
          props: { url: String(n.attrs?.src ?? ''), alt: String(n.attrs?.alt ?? '') },
        }];
      default:
        return (n.content ?? []).flatMap((c) => convertNode(c, depth));
    }
  };

  const convertListItem = (item: unknown, listType: 'bulletListItem' | 'numberedListItem', depth: number): BlockNoteBlock[] => {
    if (!item || typeof item !== 'object') return [];
    const li = item as { content?: unknown[] };
    const childrenBlocks: BlockNoteBlock[] = [];
    const inline: BlockNoteInline[] = [];
    for (const child of li.content ?? []) {
      const c = child as { type?: string; content?: unknown[] };
      if (c?.type === 'paragraph') inline.push(...(c.content ?? []).flatMap((cc) => tipTapInline(cc)));
      else childrenBlocks.push(...convertNode(child, depth + 1));
    }
    if (inline.length === 0 && childrenBlocks.length === 0) inline.push(textInline(''));
    return [{ type: listType, content: inline, children: childrenBlocks }];
  };

  return root.content.flatMap((node) => convertNode(node, 0));
}

/** Legacy-page_blocks → BlockNote-Doc */
export function legacyBlocksToDoc(blocks: LegacyBlockLike[]): BlockNoteBlock[] {
  const out: BlockNoteBlock[] = [];

  for (const block of blocks) {
    const content = (block.content ?? {}) as Record<string, unknown>;
    const id = block.id;
    const withId = (b: BlockNoteBlock): BlockNoteBlock => (id ? { ...b, id } : b);
    const text = String(content.text ?? '');

    switch (block.type) {
      case 'heading':
        out.push(withId({
          type: 'heading',
          props: { level: clampHeadingLevel(content.level ?? 1) },
          content: inlineArray(textInline(text)),
        }));
        break;
      case 'text': {
        if (content.json) out.push(...tiptapJsonToBlocks(content.json));
        else out.push(withId(paragraphBlock(inlineArray(textInline(text)))));
        break;
      }
      case 'todo':
        out.push(withId({
          type: 'checkListItem',
          props: { checked: Boolean(content.checked) },
          content: inlineArray(textInline(text)),
        }));
        break;
      case 'checklist': {
        const items = Array.isArray(content.items) ? content.items as Array<{ text?: string; checked?: boolean }> : [];
        for (const item of items) {
          out.push({
            type: 'checkListItem',
            props: { checked: Boolean(item.checked) },
            content: inlineArray(textInline(String(item.text ?? ''))),
          });
        }
        break;
      }
      case 'toggle':
        out.push(withId({
          type: 'toggle',
          props: {
            label: String(content.label ?? content.text ?? ''),
            content: String(content.content ?? ''),
            isOpen: content.isOpen !== false && content.expanded !== false,
          },
        }));
        break;
      case 'quote':
        out.push(withId({ type: 'quote', content: inlineArray(textInline(text)) }));
        break;
      case 'code':
        out.push(withId({
          type: 'codeBlock',
          props: { language: String(content.language ?? 'text') },
          content: text,
        }));
        break;
      case 'divider':
        out.push(withId({ type: 'divider' }));
        break;
      case 'image':
        out.push(withId({
          type: 'lifehubImage',
          props: {
            mediaId: String(content.mediaId ?? ''),
            alt: String(content.alt ?? ''),
            caption: String(content.caption ?? ''),
          },
        }));
        break;
      case 'gallery':
        // Frontend-Prop ist ein JSON-String (BlockNote-Props sind Primitive)
        out.push(withId({
          type: 'gallery',
          props: { mediaIds: JSON.stringify(Array.isArray(content.mediaIds) ? content.mediaIds : []) },
        }));
        break;
      case 'table':
        out.push(withId({
          type: 'lifehubTable',
          props: {
            data: JSON.stringify({
              columns: Array.isArray(content.columns) ? content.columns : [],
              rows: Array.isArray(content.rows) ? content.rows : [],
              functions: {},
            }),
          },
        }));
        break;
      case 'bookmark':
        out.push(withId({
          type: 'bookmark',
          props: {
            url: String(content.url ?? ''),
            title: String(content.title ?? ''),
            description: String(content.description ?? ''),
          },
        }));
        break;
      case 'link': {
        const url = String(content.url ?? '');
        out.push(withId({
          type: 'paragraph',
          content: [{ type: 'link', url, content: [textInline(text || url)] }],
        }));
        break;
      }
      case 'embed':
        out.push(withId({
          type: 'lifehubEmbed',
          props: { url: String(content.url ?? ''), html: String(content.html ?? '') },
        }));
        break;
      case 'video':
        out.push(withId({
          type: 'lifehubVideo',
          props: {
            mediaId: String(content.mediaId ?? ''),
            url: String(content.url ?? ''),
          },
        }));
        break;
      case 'file':
        out.push(withId({
          type: 'lifehubFile',
          props: {
            mediaId: String(content.mediaId ?? ''),
            name: String(content.name ?? ''),
          },
        }));
        break;
      case 'map':
        out.push(withId({ type: 'map', props: { ...content } }));
        break;
      case 'page-reference':
        out.push(withId({ type: 'pageReference', props: { pageId: String(content.targetPageId ?? '') } }));
        break;
      case 'search':
        out.push(withId({ type: 'search', props: { scope: String(content.scope ?? 'page') } }));
        break;
      case 'timeline':
        out.push(withId({
          type: 'timeline',
          props: { entries: JSON.stringify(Array.isArray(content.entries) ? content.entries : []) },
        }));
        break;
      case 'research_workspace':
        out.push(withId({ type: 'researchWorkspace', props: { data: JSON.stringify(content) } }));
        break;
      case 'browser_embed':
        out.push(withId({ type: 'browserEmbed', props: { ...content } }));
        break;
      default: {
        const mapped = PASSTHROUGH_CUSTOM_BLOCKS[block.type];
        if (mapped) {
          out.push(withId({ type: mapped, props: { ...content } }));
        } else {
          // Unbekannter/entfernter Blocktyp: Inhalt als Absatz retten
          const fallback = text || `[Block "${block.type}"]`;
          out.push(paragraphBlock(inlineArray(textInline(fallback))));
        }
      }
    }
  }

  if (out.length === 0) out.push({ type: 'paragraph' });
  return out;
}

/** kompletten Text aus einem BlockNote-Doc extrahieren (Suche) */
export function extractDocText(doc: unknown): string {
  const parts: string[] = [];
  const walkInline = (inline: unknown) => {
    if (Array.isArray(inline)) {
      for (const item of inline) walkInline(item);
      return;
    }
    if (!inline || typeof inline !== 'object') return;
    const n = inline as { type?: string; text?: string; content?: unknown };
    if (typeof n.text === 'string') parts.push(n.text);
    if (n.content) walkInline(n.content);
  };
  const walkBlocks = (blocks: unknown) => {
    if (!Array.isArray(blocks)) return;
    for (const block of blocks) {
      if (!block || typeof block !== 'object') continue;
      const b = block as { content?: unknown; children?: unknown };
      walkInline(b.content);
      walkBlocks(b.children);
    }
  };
  walkBlocks(doc);
  return parts.join(' ');
}

function escapeCell(value: unknown): string {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

/** Props können Array/Objekt ODER JSON-String sein (Editor speichert Strings). */
function jsonPropArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value.length > 0) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function jsonPropObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>;
  if (typeof value === 'string' && value.length > 0) {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
    } catch {
      return {};
    }
  }
  return {};
}

/**
 * BlockNote-Doc → Markdown. Deckt Standard-Blöcke + LifeHub-Custom-Blocks ab;
 * unbekannte Typen fallen auf ihren Textinhalt bzw. eine Platzhalterzeile zurück.
 */
export function docToMarkdown(doc: unknown): string {
  const lines: string[] = [];
  const walk = (blocks: unknown, depth: number) => {
    if (!Array.isArray(blocks)) return;
    const indent = '  '.repeat(depth);
    for (const block of blocks) {
      if (!block || typeof block !== 'object') continue;
      const b = block as BlockNoteBlock & { props?: Record<string, unknown> };
      const props = b.props ?? {};
      const inlineText = (content: unknown): string => {
        if (typeof content === 'string') return content;
        if (!Array.isArray(content)) return '';
        return content.map((item) => {
          const i = item as BlockNoteInline;
          if (i.type === 'link') return `[${(i.content ?? []).map((c) => (c as BlockNoteInline).text ?? '').join('')}](${i.url ?? ''})`;
          return i.text ?? '';
        }).join('');
      };

      switch (b.type) {
        case 'heading':
          lines.push(`${'#'.repeat(clampHeadingLevel(props.level ?? 1))} ${inlineText(b.content)}`.trimEnd());
          break;
        case 'bulletListItem':
          lines.push(`${indent}- ${inlineText(b.content)}`.trimEnd());
          break;
        case 'numberedListItem':
          lines.push(`${indent}1. ${inlineText(b.content)}`.trimEnd());
          break;
        case 'checkListItem':
          lines.push(`${indent}- [${props.checked ? 'x' : ' '}] ${inlineText(b.content)}`.trimEnd());
          break;
        case 'quote':
          lines.push(`${indent}> ${inlineText(b.content)}`);
          break;
        case 'codeBlock': {
          lines.push(`${indent}\`\`\`${props.language ?? ''}`);
          lines.push(typeof b.content === 'string' ? b.content : inlineText(b.content));
          lines.push(`${indent}\`\`\``);
          break;
        }
        case 'image':
          lines.push(`![${String(props.caption ?? props.alt ?? '')}](${String(props.url ?? '')})`);
          break;
        case 'lifehubImage':
          lines.push(`![${String(props.alt ?? props.caption ?? '')}](media://${String(props.mediaId ?? '')})`);
          break;
        case 'gallery': {
          const ids = jsonPropArray(props.mediaIds);
          for (const mediaId of ids) lines.push(`![bild](media://${String(mediaId)})`);
          break;
        }
        case 'lifehubTable': {
          const data = jsonPropObject(props.data);
          const columns = jsonPropArray(data.columns ?? props.columns);
          const rows = jsonPropArray(data.rows ?? props.rows);
          if (columns.length > 0) {
            lines.push(`| ${columns.map(escapeCell).join(' | ')} |`);
            lines.push(`| ${columns.map(() => '---').join(' | ')} |`);
          }
          for (const row of rows) {
            const cells = Array.isArray((row as { cells?: unknown[] })?.cells)
              ? (row as { cells: unknown[] }).cells
              : (Array.isArray(row) ? row : []);
            lines.push(`| ${cells.map(escapeCell).join(' | ')} |`);
          }
          break;
        }
        case 'bookmark': {
          const url = String(props.url ?? '');
          const title = String(props.title ?? '') || url;
          if (url) lines.push(`[${title}](${url})`);
          break;
        }
        case 'lifehubEmbed':
          lines.push(`[Embed](${String(props.url ?? '')})`);
          break;
        case 'lifehubVideo':
          lines.push(`[Video](media://${String(props.mediaId ?? props.url ?? '')})`);
          break;
        case 'lifehubFile':
          lines.push(`- Datei: ${String(props.name ?? '')} (media://${String(props.mediaId ?? '')})`);
          break;
        case 'browserEmbed':
          lines.push(`> Eingebetteter Browser${props.startUrl ? `: ${String(props.startUrl)}` : ''}`);
          break;
        case 'pageReference':
          lines.push(`> Seitenverweis: ${String(props.targetPageId ?? '')}`);
          break;
        case 'divider':
          lines.push('---');
          break;
        default: {
          const text = inlineText(b.content);
          if (text) lines.push(`${indent}${text}`);
          else if (b.type !== 'paragraph') lines.push(`${indent}[${b.type}]`);
          break;
        }
      }
      if (b.children?.length) walk(b.children, depth + 1);
    }
  };
  walk(doc, 0);
  return lines.join('\n\n').replace(/\n{3,}/g, '\n\n').trim();
}
