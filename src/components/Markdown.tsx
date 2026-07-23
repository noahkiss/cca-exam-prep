// Tiny markdown renderer for question content (scenario, question, options,
// explanation, tip). The bank stores authored markdown — fenced code blocks,
// inline `code`, **bold**, lists and paragraph breaks — which used to render as
// one run-together line. This turns it into React elements (no
// dangerouslySetInnerHTML, no dependency): content is repo-authored and trusted,
// but rendering to elements keeps it that way regardless.
//
// Deliberately small. Supported: fenced code blocks (```lang), inline code,
// **bold**, unordered/ordered lists, paragraphs, and single-newline line breaks.
// That is the full set the bank actually uses; anything else renders as text.

import { Fragment, type ReactNode } from 'react';

type Block =
  | { type: 'p'; text: string }
  | { type: 'code'; lang: string; source: string }
  | { type: 'ul' | 'ol'; items: string[] };

const BULLET = /^\s*[-*]\s+/;
const NUMBERED = /^\s*\d+\.\s+/;

function parseBlocks(src: string): Block[] {
  const lines = src.replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code. The bank sometimes glues the closing fence onto the last
    // line (`---```), so a close is any line that is, or ends with, ```.
    const open = line.match(/^```(\w*)\s*$/);
    if (open) {
      const body: string[] = [];
      i += 1;
      while (i < lines.length) {
        const l = lines[i];
        if (l.trim() === '```') {
          i += 1;
          break;
        }
        if (l.endsWith('```')) {
          body.push(l.slice(0, -3));
          i += 1;
          break;
        }
        body.push(l);
        i += 1;
      }
      blocks.push({ type: 'code', lang: open[1], source: body.join('\n') });
      continue;
    }

    if (line.trim() === '') {
      i += 1;
      continue;
    }

    if (BULLET.test(line) || NUMBERED.test(line)) {
      const ordered = NUMBERED.test(line);
      const marker = ordered ? NUMBERED : BULLET;
      const items: string[] = [];
      while (i < lines.length && marker.test(lines[i])) {
        items.push(lines[i].replace(marker, ''));
        i += 1;
      }
      blocks.push({ type: ordered ? 'ol' : 'ul', items });
      continue;
    }

    // Paragraph: run until a blank line, a fence, or a list starts.
    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !/^```/.test(lines[i]) &&
      !BULLET.test(lines[i]) &&
      !NUMBERED.test(lines[i])
    ) {
      para.push(lines[i]);
      i += 1;
    }
    blocks.push({ type: 'p', text: para.join('\n') });
  }

  return blocks;
}

// Inline `code` and **bold**. Code spans are literal — no nested parsing.
function renderInline(text: string, key: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  text.split(/(`[^`]+`)/g).forEach((part, i) => {
    if (!part) return;
    if (part.length >= 2 && part.startsWith('`') && part.endsWith('`')) {
      nodes.push(
        <code
          key={`${key}-c${i}`}
          className="rounded bg-slate-200/80 px-1 py-0.5 font-mono text-[0.85em] text-slate-800 dark:bg-slate-700/70 dark:text-slate-100"
        >
          {part.slice(1, -1)}
        </code>,
      );
      return;
    }
    part.split(/(\*\*[^*]+\*\*)/g).forEach((seg, j) => {
      if (!seg) return;
      if (seg.length >= 4 && seg.startsWith('**') && seg.endsWith('**')) {
        nodes.push(
          <strong key={`${key}-b${i}-${j}`} className="font-semibold">
            {seg.slice(2, -2)}
          </strong>,
        );
      } else {
        nodes.push(<Fragment key={`${key}-t${i}-${j}`}>{seg}</Fragment>);
      }
    });
  });
  return nodes;
}

// A paragraph may hold single newlines that are real line breaks.
function renderParagraphText(text: string, key: string): ReactNode[] {
  const parts = text.split('\n');
  return parts.flatMap((part, i) => {
    const line = renderInline(part, `${key}-l${i}`);
    return i < parts.length - 1 ? [...line, <br key={`${key}-br${i}`} />] : line;
  });
}

export function Markdown({ source, className }: { source: string; className?: string }) {
  const blocks = parseBlocks(source);

  return (
    <div className={className}>
      {blocks.map((block, i) => {
        if (block.type === 'code') {
          return (
            <pre
              key={i}
              className="my-2 overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-xs leading-relaxed text-slate-800 first:mt-0 last:mb-0 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-200"
            >
              <code>{block.source}</code>
            </pre>
          );
        }
        if (block.type === 'p') {
          return (
            <p key={i} className="leading-relaxed [&:not(:first-child)]:mt-3">
              {renderParagraphText(block.text, `p${i}`)}
            </p>
          );
        }
        const List = block.type === 'ul' ? 'ul' : 'ol';
        return (
          <List
            key={i}
            className={`my-2 ml-5 space-y-1 first:mt-0 last:mb-0 ${
              block.type === 'ul' ? 'list-disc' : 'list-decimal'
            }`}
          >
            {block.items.map((item, j) => (
              <li key={j}>{renderInline(item, `${i}-${j}`)}</li>
            ))}
          </List>
        );
      })}
    </div>
  );
}
