// Read-only fenced artifact inside a teach step. No highlighting library — the
// blocks are short and a dependency for colour would not earn its weight. The
// source is rendered as a JS string, so escaped quotes in a JSON body appear
// literally rather than being interpreted.

import type { CodeBlock } from '@/types';

export function CodeBlockView({ block }: { block: CodeBlock }) {
  return (
    <figure className="my-4 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-slate-200 bg-slate-100 px-3 py-1.5 dark:border-slate-800 dark:bg-slate-800/60">
        <span className="font-mono text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {block.lang}
        </span>
        {block.caption && (
          <figcaption className="text-xs text-slate-500 dark:text-slate-400">
            {block.caption}
          </figcaption>
        )}
      </div>
      <pre className="overflow-x-auto bg-slate-50 p-4 text-xs leading-relaxed text-slate-800 dark:bg-slate-900/60 dark:text-slate-200">
        <code>{block.source}</code>
      </pre>
    </figure>
  );
}
