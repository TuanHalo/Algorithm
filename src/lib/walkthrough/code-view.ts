/**
 * Turns a step's `CodeView` into the rows the code panel shows. Pure and
 * DOM-free: the server uses it to precompute highlighted frames and to
 * validate walkthroughs, the browser uses `viewKey` to pick a frame.
 */
import type { KeyedTokensInfo } from '@shikijs/magic-move/types';
import type { CodeView } from './types';

/** One precomputed code listing: highlighted, keyed tokens plus the rows they draw. */
export interface CodeFrame {
  readonly key: string;
  readonly rows: readonly CodeRow[];
  readonly tokens: KeyedTokensInfo;
}

/** Everything the browser code panel needs, embedded in the page as JSON. */
export interface CodeFrames {
  readonly frames: Readonly<Record<string, CodeFrame>>;
  /** The full solution, for the Copy button. */
  readonly finalSource: string;
}

/** One displayed row. `n` is the line number shown in the gutter; `null` marks a collapsed `...` gap. */
export interface CodeRow {
  readonly n: number | null;
  readonly text: string;
}

export interface ResolvedView {
  readonly key: string;
  readonly code: string;
  readonly rows: readonly CodeRow[];
  /** Line numbers (in the view's own numbering) that are on screen. */
  readonly visible: ReadonlySet<number>;
}

export interface CodeSources {
  readonly code: { readonly source: string };
  readonly snapshots?: Readonly<Record<string, string>>;
}

/** Stable id for a view's code; steps that show the same code share one precomputed frame. */
export function viewKey(view: CodeView): string {
  switch (view.view) {
    case 'signature':
      return 'signature';
    case 'final':
      return 'final';
    case 'snapshot':
      return `snapshot:${view.id}`;
    case 'reveal':
      return `reveal:${[...new Set(view.reveal)].sort((a, b) => a - b).join(',')}`;
  }
}

function splitLines(source: string): string[] {
  return source.replace(/\r\n/g, '\n').split('\n');
}

const isBlank = (line: string): boolean => line.trim() === '';

/** Line numbers of every non-blank line: the lines a `reveal` must eventually list. */
export function nonBlankLines(source: string): number[] {
  return splitLines(source).flatMap((line, i) => (isBlank(line) ? [] : [i + 1]));
}

/**
 * Lines the `signature` view shows: every non-blank line up to and including
 * the first `def`, so imports (`import math`) stay above the signature. Code
 * without a `def` falls back to line 1. Build reveals start from these lines.
 */
export function signatureLines(source: string): number[] {
  const lines = splitLines(source);
  const def = lines.findIndex((line) => /^\s*(async\s+)?def\s/.test(line));
  if (def < 0) return [1];
  return nonBlankLines(source).filter((n) => n <= def + 1);
}

/**
 * Visible lines for a reveal. Blank lines never need listing: one shows when
 * the nearest non-blank lines above and below it are both visible.
 */
function revealVisible(lines: readonly string[], reveal: readonly number[]): Set<number> {
  const listed = new Set(reveal);
  const visible = new Set<number>();
  lines.forEach((line, i) => {
    const n = i + 1;
    if (!isBlank(line)) {
      if (listed.has(n)) visible.add(n);
      return;
    }
    let above = n - 1;
    while (above >= 1 && isBlank(lines[above - 1] ?? '')) above -= 1;
    let below = n + 1;
    while (below <= lines.length && isBlank(lines[below - 1] ?? '')) below += 1;
    if (listed.has(above) && listed.has(below)) visible.add(n);
  });
  return visible;
}

function indentOf(line: string): string {
  return /^\s*/.exec(line)?.[0] ?? '';
}

/** Rows for a partial listing: hidden runs collapse to one `...` at the first hidden line's indent. */
function revealRows(lines: readonly string[], visible: ReadonlySet<number>): CodeRow[] {
  const rows: CodeRow[] = [];
  let inGap = false;
  lines.forEach((line, i) => {
    const n = i + 1;
    if (visible.has(n)) {
      rows.push({ n, text: line });
      inGap = false;
      return;
    }
    if (isBlank(line) || inGap) return;
    rows.push({ n: null, text: `${indentOf(line)}...` });
    inGap = true;
  });
  return rows;
}

/** Resolves a view against the walkthrough's code. Throws on an unknown snapshot. */
export function resolveView(sources: CodeSources, view: CodeView): ResolvedView {
  const key = viewKey(view);
  if (view.view === 'snapshot') {
    const snapshot = sources.snapshots?.[view.id];
    if (snapshot === undefined) throw new Error(`unknown snapshot "${view.id}"`);
    const lines = splitLines(snapshot);
    return {
      key,
      code: lines.join('\n'),
      rows: lines.map((text, i) => ({ n: i + 1, text })),
      visible: new Set(lines.map((_, i) => i + 1)),
    };
  }
  const lines = splitLines(sources.code.source);
  if (view.view === 'final') {
    return {
      key,
      code: lines.join('\n'),
      rows: lines.map((text, i) => ({ n: i + 1, text })),
      visible: new Set(lines.map((_, i) => i + 1)),
    };
  }
  const visible = revealVisible(lines, view.view === 'signature' ? signatureLines(sources.code.source) : view.reveal);
  const rows = revealRows(lines, visible);
  return { key, code: rows.map((r) => r.text).join('\n'), rows, visible };
}
