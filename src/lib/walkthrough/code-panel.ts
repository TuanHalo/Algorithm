/**
 * Browser code panel. Shows the precomputed frame for each step's code view
 * with magic-move (kept tokens slide, new ones fade in), plus our own overlays
 * that line up with the fixed line height: a gutter with real line numbers,
 * highlight bars for the step's lines, and inline values as ghost comments.
 */
import { MagicMoveRenderer } from '@shikijs/magic-move/renderer';
import { viewKey, type CodeFrame, type CodeFrames } from './code-view';
import type { Step } from './types';

const ANIMATION_MS = 520;
const COPY_RESET_MS = 1600;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Reads the frames JSON the component embedded. Throws if it isn't the expected shape. */
export function parseFrames(text: string): CodeFrames {
  const data: unknown = JSON.parse(text);
  if (!isRecord(data) || !isRecord(data['frames']) || typeof data['finalSource'] !== 'string') {
    throw new Error('Walkthrough code frames are missing or malformed');
  }
  return data as unknown as CodeFrames;
}

/** "Lines 3–5, 8" from [3, 4, 5, 8]. */
export function describeLines(lines: readonly number[]): string {
  if (lines.length === 0) return 'No line highlighted';
  const sorted = [...new Set(lines)].sort((a, b) => a - b);
  const parts: string[] = [];
  let start = sorted[0] ?? 0;
  let prev = start;
  for (const line of [...sorted.slice(1), Infinity]) {
    if (line === prev + 1) {
      prev = line;
      continue;
    }
    parts.push(start === prev ? String(start) : `${start}–${prev}`);
    start = line;
    prev = line;
  }
  return `${sorted.length === 1 ? 'Line' : 'Lines'} ${parts.join(', ')}`;
}

/** Text for the "Lines …" chip, naming the listing when it isn't the solution. */
export function describeCode(step: Step): string {
  const lines = describeLines(step.code.lines ?? []);
  return step.code.view === 'snapshot' ? `${step.code.id} · ${lines}` : lines;
}

export class CodePanel {
  private readonly data: CodeFrames;
  private readonly renderer: MagicMoveRenderer;
  private readonly gutter: HTMLElement;
  private readonly bars: HTMLElement;
  private readonly values: HTMLElement;
  private readonly overlays: HTMLElement[];
  private currentKey: string | undefined;
  private renderToken = 0;

  constructor(root: HTMLElement, data: CodeFrames) {
    this.data = data;
    const q = (sel: string): HTMLElement => {
      const el = root.querySelector<HTMLElement>(sel);
      if (!el) throw new Error(`Walkthrough code panel is missing ${sel}`);
      return el;
    };
    const live = q('[data-wt-code-live]');
    this.gutter = q('[data-wt-gutter]');
    this.bars = q('[data-wt-hl]');
    this.values = q('[data-wt-values]');
    this.overlays = [this.gutter, this.bars, this.values];
    // containerStyle off: the panel paints its own background so highlight bars can sit behind the code.
    this.renderer = new MagicMoveRenderer(q('[data-wt-mm]'), { duration: ANIMATION_MS, stagger: 0, animateContainer: true, containerStyle: false });

    // JavaScript is running: swap the static fallback listing for the live panel.
    root.querySelector<HTMLElement>('[data-wt-code-static]')?.setAttribute('hidden', '');
    live.hidden = false;

    const copy = root.querySelector<HTMLButtonElement>('[data-wt-copy]');
    copy?.addEventListener('click', () => {
      void this.copy(copy);
    });
  }

  /** Shows a step's code view, highlighted lines and inline values. */
  show(step: Step, instant: boolean): void {
    const frame = this.data.frames[viewKey(step.code)] ?? this.data.frames['final'];
    if (!frame) return;
    const lines = new Set(step.code.lines ?? []);
    const values = step.values ?? {};
    const token = ++this.renderToken;

    if (frame.key === this.currentKey) {
      this.paintOverlays(frame, lines, values);
      return;
    }
    this.currentKey = frame.key;
    if (instant || this.prefersReducedMotion()) {
      this.renderer.replace(frame.tokens);
      this.paintOverlays(frame, lines, values);
      return;
    }
    // Hide overlays while tokens move, then draw them on the settled rows.
    for (const el of this.overlays) el.classList.add('is-moving');
    void this.renderer.render(frame.tokens).then(() => {
      if (token !== this.renderToken) return;
      this.paintOverlays(frame, lines, values);
    });
  }

  private prefersReducedMotion(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  private paintOverlays(frame: CodeFrame, lines: ReadonlySet<number>, values: Readonly<Record<number, string>>): void {
    const rowStyle = (i: number): string => `top: calc(var(--wt-code-pad) + ${i} * var(--wt-code-lh))`;

    this.gutter.replaceChildren(
      ...frame.rows.map((row) => {
        const cell = document.createElement('span');
        cell.textContent = row.n === null ? '⋮' : String(row.n);
        if (row.n !== null && lines.has(row.n)) cell.className = 'is-active';
        return cell;
      }),
    );

    this.bars.replaceChildren(
      ...frame.rows.flatMap((row, i) => {
        if (row.n === null || !lines.has(row.n)) return [];
        const bar = document.createElement('span');
        bar.setAttribute('style', rowStyle(i));
        return [bar];
      }),
    );

    this.values.replaceChildren(
      ...frame.rows.flatMap((row, i) => {
        const value = row.n === null ? undefined : values[row.n];
        if (value === undefined) return [];
        const ghost = document.createElement('span');
        // Monospace font: `ch` lines the ghost comment up two spaces after the code.
        ghost.setAttribute('style', `${rowStyle(i)}; left: calc(var(--wt-code-padx) + ${row.text.length + 2}ch)`);
        ghost.textContent = `# ${value}`;
        return [ghost];
      }),
    );

    for (const el of this.overlays) el.classList.remove('is-moving');
  }

  private async copy(button: HTMLButtonElement): Promise<void> {
    const label = button.textContent;
    try {
      await navigator.clipboard.writeText(this.data.finalSource);
      button.textContent = 'Copied ✓';
    } catch {
      button.textContent = 'Copy failed';
    }
    window.setTimeout(() => {
      button.textContent = label;
    }, COPY_RESET_MS);
  }
}
