/**
 * Browser controller for a `<Walkthrough>` block: step navigation, narration,
 * metrics, code highlighting, deep links, autoplay and "try your own input".
 * The markup it drives is rendered by `src/components/Walkthrough.astro`.
 */
import { loadWalkthrough } from './client-loader';
import { CodePanel, describeCode, parseFrames } from './code-panel';
import { IsoStage } from './iso-stage';
import { renderNarration } from './text';
import type { ChapterId, Step, TraceConfig, TraceValues, Walkthrough } from './types';

const STORY_AUTOPLAY_MS = 2600;
const TRACE_AUTOPLAY_MS = 1100;
const MAX_ABS_VALUE = 9999;

const CHAPTER_LABELS: Readonly<Record<ChapterId, string>> = {
  problem: 'Problem',
  idea: 'Idea',
  build: 'Build',
  run: 'Run',
  why: 'Why',
};

/** Parses the trace form. Returns the values, or a message explaining what is wrong. */
export function parseTraceInputs(trace: TraceConfig, raw: Readonly<Record<string, string>>): TraceValues | string {
  const values: Record<string, number | number[]> = {};
  const maxItems = trace.maxItems ?? 12;
  for (const input of trace.inputs) {
    const parts = (raw[input.name] ?? '').split(/[\s,]+/).filter(Boolean);
    const nums = parts.map(Number);
    if (parts.length === 0) return `${input.label}: please enter a value.`;
    if (nums.some((n) => !Number.isFinite(n) || !Number.isInteger(n))) return `${input.label}: use whole numbers only.`;
    if (nums.some((n) => Math.abs(n) > MAX_ABS_VALUE)) return `${input.label}: keep values between -${MAX_ABS_VALUE} and ${MAX_ABS_VALUE}.`;
    if (input.kind === 'number') {
      if (nums.length !== 1) return `${input.label}: enter a single number.`;
      values[input.name] = nums[0] ?? 0;
    } else {
      if (nums.length > maxItems) return `${input.label}: up to ${maxItems} numbers fit on the stage.`;
      values[input.name] = nums;
    }
  }
  return values;
}

type Mode = 'story' | 'trace';
class Player {
  private readonly root: HTMLElement;
  private readonly wt: Walkthrough;
  private readonly stage: IsoStage;
  private readonly code: CodePanel | undefined;
  private steps: readonly Step[] = [];
  private index = 0;
  private mode: Mode = 'story';
  private timer: number | undefined;
  private visible = false;

  constructor(root: HTMLElement, wt: Walkthrough, uid: string) {
    this.root = root;
    this.wt = wt;
    const svg = root.querySelector<SVGSVGElement>('[data-wt-svg]');
    if (!svg) throw new Error('Walkthrough markup is missing its <svg data-wt-svg>');
    this.stage = new IsoStage(svg, uid);
    this.code = this.makeCodePanel();
    this.bind();
    this.setSteps(wt.steps, this.stepFromHash());
    root.dataset['wtReady'] = 'true';
  }

  private q<T extends Element = HTMLElement>(selector: string): T | null {
    return this.root.querySelector<T>(selector);
  }

  /** Live code panel; if its data is missing the static listing simply stays on screen. */
  private makeCodePanel(): CodePanel | undefined {
    const json = this.q('script[data-wt-frames]')?.textContent;
    if (!json) return undefined;
    try {
      return new CodePanel(this.root, parseFrames(json));
    } catch (err) {
      console.error(err);
      return undefined;
    }
  }

  /**
   * Hovering a 3D entity or a code token that stands for a variable lights up
   * both: every token of that name and every entity with that `data-var`.
   */
  private bindVariableLinks(): void {
    const nameOf = (target: EventTarget | null): string | undefined => {
      if (!(target instanceof Element)) return undefined;
      const entity = target.closest<SVGElement>('[data-var]');
      if (entity?.dataset['var']) return entity.dataset['var'];
      const token = target.closest('.wt-var');
      const match = token ? /\bwt-var--([A-Za-z_]\w*)\b/.exec(token.className) : null;
      return match?.[1];
    };
    let current: string | undefined;
    const clear = (): void => {
      for (const el of this.root.querySelectorAll('.is-linked')) el.classList.remove('is-linked');
      current = undefined;
    };
    this.root.addEventListener('pointerover', (event) => {
      const name = nameOf(event.target);
      if (name === current) return;
      clear();
      if (!name) return;
      current = name;
      const escaped = CSS.escape(name);
      for (const el of this.root.querySelectorAll(`[data-var="${escaped}"], .wt-var--${escaped}`)) el.classList.add('is-linked');
    });
    this.root.addEventListener('pointerleave', clear);
  }

  private bind(): void {
    this.q('[data-wt-prev]')?.addEventListener('click', () => this.stopAnd(() => this.go(this.index - 1)));
    this.q('[data-wt-next]')?.addEventListener('click', () => this.stopAnd(() => this.go(this.index + 1)));
    this.q('[data-wt-play]')?.addEventListener('click', () => this.togglePlay());
    this.q('[data-wt-restart]')?.addEventListener('click', () => this.stopAnd(() => this.go(0)));
    this.bindVariableLinks();

    for (const goal of this.root.querySelectorAll<HTMLButtonElement>('[data-wt-goal]')) {
      goal.addEventListener('click', () => {
        if (this.mode !== 'story') this.setMode('story');
        this.stopAnd(() => this.go(Number(goal.dataset['wtGoal']) - 1));
      });
    }
    for (const btn of this.root.querySelectorAll<HTMLButtonElement>('[data-wt-mode]')) {
      btn.addEventListener('click', () => this.setMode(btn.dataset['wtMode'] === 'trace' ? 'trace' : 'story'));
    }
    this.q('[data-wt-trace-form]')?.addEventListener('submit', (event) => {
      event.preventDefault();
      this.runTrace();
    });
    for (const preset of this.root.querySelectorAll<HTMLButtonElement>('[data-wt-preset]')) {
      preset.addEventListener('click', () => {
        const values = JSON.parse(preset.dataset['wtPreset'] ?? '{}') as Record<string, unknown>;
        for (const [name, value] of Object.entries(values)) {
          const field = this.q<HTMLInputElement>(`[data-wt-input="${CSS.escape(name)}"]`);
          if (field && typeof value === 'string') field.value = value;
        }
        this.runTrace();
      });
    }

    new IntersectionObserver(
      (entries) => {
        for (const entry of entries) this.visible = entry.intersectionRatio > 0.25;
      },
      { threshold: [0, 0.25, 0.5] },
    ).observe(this.root);

    window.addEventListener('hashchange', () => {
      if (this.root.dataset['wtDeeplink'] !== 'true') return;
      if (this.mode !== 'story') this.setMode('story');
      this.stopAnd(() => this.go(this.stepFromHash()));
    });

    document.addEventListener('keydown', (event) => {
      if (!this.visible || event.altKey || event.ctrlKey || event.metaKey) return;
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        this.stopAnd(() => this.go(this.index + 1));
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        this.stopAnd(() => this.go(this.index - 1));
      }
    });
  }

  private stepFromHash(): number {
    if (this.root.dataset['wtDeeplink'] !== 'true') return 0;
    const match = /^#step-(\d+)$/.exec(window.location.hash);
    return match ? Number(match[1]) - 1 : 0;
  }

  private setSteps(steps: readonly Step[], start = 0): void {
    this.steps = steps;
    this.stage.clear();
    this.stage.setViewBox(this.stage.fit(steps.map((s) => s.scene)));
    this.buildRail();
    this.go(start, true);
  }

  private setMode(mode: Mode): void {
    this.pause();
    this.mode = mode;
    this.root.dataset['wtView'] = mode;
    for (const btn of this.root.querySelectorAll<HTMLButtonElement>('[data-wt-mode]')) {
      btn.setAttribute('aria-pressed', String(btn.dataset['wtMode'] === mode));
    }
    const panel = this.q('[data-wt-trace]');
    if (panel) panel.hidden = mode !== 'trace';
    // Goals point at story steps, so they only make sense in story mode.
    const goals = this.q('[data-wt-goals]');
    if (goals) goals.hidden = mode !== 'story';
    if (mode === 'trace') this.runTrace();
    else this.setSteps(this.wt.steps);
  }

  private runTrace(): void {
    const trace = this.wt.trace;
    const error = this.q('[data-wt-error]');
    if (!trace) return;
    const raw: Record<string, string> = {};
    for (const input of trace.inputs) {
      raw[input.name] = this.q<HTMLInputElement>(`[data-wt-input="${CSS.escape(input.name)}"]`)?.value ?? input.default;
    }
    const parsed = parseTraceInputs(trace, raw);
    if (typeof parsed === 'string') {
      if (error) error.textContent = parsed;
      return;
    }
    try {
      const steps = trace.run(parsed);
      if (steps.length === 0) throw new Error('The trace produced no steps.');
      if (error) error.textContent = '';
      this.pause();
      this.setSteps(steps);
    } catch (err) {
      if (error) error.textContent = err instanceof Error ? err.message : 'Could not run this input.';
    }
  }

  /** Step dots grouped under their chapter names (story: Problem → Why; trace: one Run group). */
  private buildRail(): void {
    const rail = this.q('[data-wt-rail]');
    if (!rail) return;
    rail.dataset['dense'] = String(this.steps.length > 14);
    const groups: HTMLElement[] = [];
    let group: HTMLElement | undefined;
    let chapter: ChapterId | undefined;
    this.steps.forEach((step, i) => {
      if (!group || step.chapter !== chapter) {
        chapter = step.chapter;
        group = document.createElement('div');
        group.className = 'wt-rail__group';
        group.dataset['chapter'] = chapter;
        const label = document.createElement('span');
        label.className = 'wt-rail__chapter';
        label.textContent = CHAPTER_LABELS[chapter];
        const dots = document.createElement('div');
        dots.className = 'wt-rail__dots';
        group.append(label, dots);
        groups.push(group);
      }
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'wt-rail__dot';
      btn.textContent = String(i + 1);
      btn.title = `${CHAPTER_LABELS[step.chapter]}: ${step.short}`;
      btn.setAttribute('aria-label', `Step ${i + 1}, ${CHAPTER_LABELS[step.chapter]}: ${step.short}`);
      btn.addEventListener('click', () => this.stopAnd(() => this.go(i)));
      group.querySelector('.wt-rail__dots')?.appendChild(btn);
    });
    rail.replaceChildren(...groups);
  }

  private go(target: number, instant = false): void {
    if (this.steps.length === 0) return;
    const index = Math.min(Math.max(target, 0), this.steps.length - 1);
    const changed = index !== this.index;
    this.index = index;
    const step = this.steps[index];
    if (!step) return;

    this.stage.render(step.scene, instant);

    const title = this.q('[data-wt-title]');
    if (title) title.textContent = step.title;
    const body = this.q('[data-wt-body]');
    if (body) body.innerHTML = renderNarration(step.body);
    const changes = this.q('[data-wt-changes]');
    if (changes) {
      changes.hidden = !step.changes?.length;
      changes.replaceChildren(
        ...(step.changes ?? []).map((c) => {
          const li = document.createElement('li');
          li.textContent = c;
          return li;
        }),
      );
    }

    const counter = this.q('[data-wt-counter]');
    if (counter) counter.textContent = `Step ${index + 1} of ${this.steps.length}`;
    const short = this.q('[data-wt-short]');
    if (short) short.textContent = step.short;

    for (const el of this.root.querySelectorAll<HTMLElement>('[data-wt-metric]')) {
      const key = el.dataset['wtMetric'] ?? '';
      const next = step.metrics?.[key] === undefined ? '—' : String(step.metrics[key]);
      if (el.textContent !== next) {
        el.textContent = next;
        if (!instant) {
          el.classList.remove('wt-bump');
          void el.offsetWidth;
          el.classList.add('wt-bump');
        }
      }
    }

    const linesChip = this.q('[data-wt-lines]');
    if (linesChip) {
      linesChip.textContent = describeCode(step);
      linesChip.classList.toggle('is-empty', !step.code.lines?.length);
    }
    const chapterChip = this.q('[data-wt-chapter]');
    if (chapterChip) chapterChip.textContent = CHAPTER_LABELS[step.chapter];
    this.code?.show(step, instant);

    for (const group of this.root.querySelectorAll<HTMLElement>('.wt-rail__group')) {
      group.classList.toggle('is-current', group.dataset['chapter'] === step.chapter);
    }

    this.root.querySelectorAll('.wt-rail__dot').forEach((dot, i) => {
      dot.classList.toggle('is-active', i === index);
      dot.classList.toggle('is-done', i < index);
      if (i === index) dot.setAttribute('aria-current', 'step');
      else dot.removeAttribute('aria-current');
    });
    if (changed && !instant) {
      this.root.querySelector('.wt-rail__dot.is-active')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }

    const prev = this.q<HTMLButtonElement>('[data-wt-prev]');
    const next = this.q<HTMLButtonElement>('[data-wt-next]');
    if (prev) prev.disabled = index === 0;
    if (next) {
      next.disabled = index === this.steps.length - 1;
      const nextStep = this.steps[index + 1];
      // Fixed label so the button never changes size; the upcoming step goes in the tooltip.
      const label = nextStep ? `Next step: ${nextStep.short}` : 'Last step';
      next.title = label;
      next.setAttribute('aria-label', label);
    }

    if (this.root.dataset['wtDeeplink'] === 'true' && this.mode === 'story' && !instant) {
      history.replaceState(null, '', index === 0 ? window.location.pathname + window.location.search : `#step-${index + 1}`);
    }
  }

  private togglePlay(): void {
    if (this.timer !== undefined) {
      this.pause();
      return;
    }
    if (this.index >= this.steps.length - 1) this.go(0);
    const play = this.q('[data-wt-play]');
    if (play) {
      play.textContent = '⏸ Pause';
      play.setAttribute('aria-pressed', 'true');
    }
    this.timer = window.setInterval(
      () => {
        if (this.index >= this.steps.length - 1) this.pause();
        else this.go(this.index + 1);
      },
      this.mode === 'trace' ? TRACE_AUTOPLAY_MS : STORY_AUTOPLAY_MS,
    );
  }

  private pause(): void {
    if (this.timer !== undefined) window.clearInterval(this.timer);
    this.timer = undefined;
    const play = this.q('[data-wt-play]');
    if (play) {
      play.textContent = '▶ Play';
      play.setAttribute('aria-pressed', 'false');
    }
  }

  private stopAnd(action: () => void): void {
    this.pause();
    action();
  }
}

let counter = 0;

/** Finds every `[data-walkthrough]` on the page and mounts a player on it. */
export async function mountWalkthroughs(): Promise<void> {
  const roots = document.querySelectorAll<HTMLElement>('[data-walkthrough]:not([data-wt-ready])');
  await Promise.all(
    [...roots].map(async (root) => {
      const id = root.dataset['walkthrough'] ?? '';
      const status = root.querySelector('[data-wt-status]');
      try {
        const wt = await loadWalkthrough(id);
        counter += 1;
        new Player(root, wt, `wt${counter}`);
        status?.remove();
      } catch (err) {
        if (status) status.textContent = `Could not load this walkthrough (${err instanceof Error ? err.message : 'unknown error'}).`;
      }
    }),
  );
}
