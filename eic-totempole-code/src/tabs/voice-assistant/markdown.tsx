import type { ReactNode } from 'react';

/**
 * Renders the assistant's reply text as React elements -- no HTML string
 * injection anywhere, so this is inherently safe against a malicious or
 * prompt-injected bot response (Constitution VI): every text run stays a
 * React text node, escaped exactly like any other prop.
 *
 * Scoped to what the live agent actually sends (verified against a real
 * response, not guessed): plain paragraphs, bullet lists using `•`/`-`/`*`,
 * numbered lists, **bold**, *italic*, `code`, inline links, and citation-style
 * reference links (`[1]` bodies with a trailing `[1]: url "title"`
 * definition line). Reference DEFINITION lines are metadata, not content --
 * per CommonMark they render as nothing, which is also what makes the raw
 * `[1]: cite:1 "EIC%20Presentation...docx"` footnote disappear here instead
 * of showing up as literal text.
 */

interface LinkRef {
  readonly url: string;
  readonly title?: string;
}

type Block =
  | { readonly type: 'paragraph'; readonly text: string }
  | { readonly type: 'bullet-list'; readonly items: readonly string[] }
  | { readonly type: 'numbered-list'; readonly items: readonly string[] };

const REF_DEFINITION = /^\[([^\]]+)\]:\s*(\S+)(?:\s+"([^"]*)")?\s*$/;
const BULLET_LINE = /^[•\-*]\s+(.*)$/;
const NUMBERED_LINE = /^\d+[.)]\s+(.*)$/;

const INLINE_PATTERN =
  /\*\*(?<bold>.+?)\*\*|`(?<code>[^`]+)`|\[(?<linkText>[^\]]+)\]\((?<linkUrl>[^)\s]+)(?:\s+"[^"]*")?\)|\[(?<refLabel>[^\]]+)\]|\*(?<italic>[^*]+)\*|_(?<italic2>[^_]+)_/g;

function collectReferences(lines: readonly string[]): {
  refs: Map<string, LinkRef>;
  contentLines: string[];
} {
  const refs = new Map<string, LinkRef>();
  const contentLines: string[] = [];
  for (const line of lines) {
    const match = REF_DEFINITION.exec(line.trim());
    if (match) {
      const label = match[1]!;
      const url = match[2]!;
      const title = match[3];
      refs.set(label.toLowerCase(), title === undefined ? { url } : { url, title });
    } else {
      contentLines.push(line);
    }
  }
  return { refs, contentLines };
}

function parseBlocks(lines: readonly string[]): Block[] {
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i]!.trim();
    if (line === '') {
      i++;
      continue;
    }

    if (BULLET_LINE.test(line)) {
      const items: string[] = [];
      while (i < lines.length) {
        const current = lines[i]!.trim();
        if (current === '') {
          i++;
          continue;
        }
        const match = BULLET_LINE.exec(current);
        if (!match) break;
        items.push(match[1]!);
        i++;
      }
      blocks.push({ type: 'bullet-list', items });
      continue;
    }

    if (NUMBERED_LINE.test(line)) {
      const items: string[] = [];
      while (i < lines.length) {
        const current = lines[i]!.trim();
        if (current === '') {
          i++;
          continue;
        }
        const match = NUMBERED_LINE.exec(current);
        if (!match) break;
        items.push(match[1]!);
        i++;
      }
      blocks.push({ type: 'numbered-list', items });
      continue;
    }

    const paragraphLines: string[] = [];
    while (i < lines.length && lines[i]!.trim() !== '') {
      paragraphLines.push(lines[i]!.trim());
      i++;
    }
    blocks.push({ type: 'paragraph', text: paragraphLines.join(' ') });
  }

  return blocks;
}

function renderInline(text: string, refs: Map<string, LinkRef>, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;

  for (const match of text.matchAll(INLINE_PATTERN)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      nodes.push(text.slice(lastIndex, index));
    }
    const g = match.groups ?? {};

    if (g.bold !== undefined) {
      nodes.push(
        <strong key={`${keyPrefix}-${key++}`}>{renderInline(g.bold, refs, `${keyPrefix}-b${key}`)}</strong>,
      );
    } else if (g.code !== undefined) {
      nodes.push(<code key={`${keyPrefix}-${key++}`}>{g.code}</code>);
    } else if (g.linkText !== undefined) {
      nodes.push(
        <a key={`${keyPrefix}-${key++}`} href={g.linkUrl} target="_blank" rel="noopener noreferrer">
          {g.linkText}
        </a>,
      );
    } else if (g.refLabel !== undefined) {
      const ref = refs.get(g.refLabel.toLowerCase());
      if (ref && /^https?:\/\//.test(ref.url)) {
        nodes.push(
          <a
            key={`${keyPrefix}-${key++}`}
            href={ref.url}
            target="_blank"
            rel="noopener noreferrer"
            title={ref.title}
          >
            {g.refLabel}
          </a>,
        );
      } else if (ref) {
        // A citation marker whose "url" isn't a real link (e.g. Copilot
        // Studio's `cite:1` source references) -- show the marker, not a
        // dead/unclickable link.
        nodes.push(
          <sup key={`${keyPrefix}-${key++}`} title={ref.title}>
            [{g.refLabel}]
          </sup>,
        );
      } else {
        // No matching definition -- not a reference after all, keep the
        // brackets as literal text.
        nodes.push(match[0]);
      }
    } else if (g.italic !== undefined) {
      nodes.push(<em key={`${keyPrefix}-${key++}`}>{g.italic}</em>);
    } else if (g.italic2 !== undefined) {
      nodes.push(<em key={`${keyPrefix}-${key++}`}>{g.italic2}</em>);
    }

    lastIndex = index + match[0].length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

export function renderMarkdown(rawText: string, keyPrefix = 'md'): ReactNode {
  const { refs, contentLines } = collectReferences(rawText.split('\n'));
  const blocks = parseBlocks(contentLines);

  return (
    <>
      {blocks.map((block, i) => {
        const key = `${keyPrefix}-${i}`;
        if (block.type === 'bullet-list') {
          return (
            <ul key={key}>
              {block.items.map((item, j) => (
                <li key={`${key}-${j}`}>{renderInline(item, refs, `${key}-${j}`)}</li>
              ))}
            </ul>
          );
        }
        if (block.type === 'numbered-list') {
          return (
            <ol key={key}>
              {block.items.map((item, j) => (
                <li key={`${key}-${j}`}>{renderInline(item, refs, `${key}-${j}`)}</li>
              ))}
            </ol>
          );
        }
        return <p key={key}>{renderInline(block.text, refs, key)}</p>;
      })}
    </>
  );
}
