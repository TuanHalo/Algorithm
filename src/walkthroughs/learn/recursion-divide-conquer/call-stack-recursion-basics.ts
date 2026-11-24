import { defineWalkthrough, map, note, vars } from '../../../lib/walkthrough/helpers';
import type { Entity, Step, Tone } from '../../../lib/walkthrough/types';

/** The call stack sits at the origin; the variables panel and notes go to its right. */
const SIDE_X = 360;

/** One factorial call on the call stack. */
interface Frame {
  readonly n: number;
  /** Set when this frame has computed its answer and is about to return it. */
  readonly ret?: number;
  /** Overrides the row's wording and tone (the "what if there were no base case" picture). */
  readonly value?: string;
  readonly tone?: Tone;
}

interface StackState {
  readonly frames: readonly Frame[];
  /** `n` of the running call. */
  readonly n?: number;
  /** What the call below handed back, once it has. */
  readonly back?: number;
  readonly note?: string;
  readonly noteTone?: Tone;
}

/** Scene: the call stack (running call in `note` tone), the running call's variables, and a note. */
function scene(s: StackState): Entity[] {
  const entities: Entity[] = [];
  const top = s.frames.length - 1;
  if (s.frames.length > 0) {
    entities.push(
      map(
        'stack',
        0,
        0,
        'call stack',
        s.frames.map((f, k) => ({
          key: `factorial(${f.n})`,
          value: f.value ?? (f.ret !== undefined ? `returns ${f.ret}` : k === top ? 'running' : 'waits on line 7'),
          tone: f.tone ?? (f.ret !== undefined ? 'found' : k === top ? 'note' : 'muted'),
        })),
        { width: 300 },
      ),
    );
  }
  const row = (name: string, value: number | undefined): { name: string; value: number | string; tone: Tone } => ({
    name,
    value: value ?? '—',
    tone: value === undefined ? 'muted' : 'default',
  });
  entities.push(vars('vals', SIDE_X, 0, [row('n', s.n), row('came back', s.back)], { label: 'this call', width: 200 }));
  if (s.note) entities.push(note('note', SIDE_X, 180, s.note, { tone: s.noteTone ?? 'note' }));
  return entities;
}

interface Emit {
  readonly short: string;
  readonly title: string;
  readonly body: string;
  readonly lines: readonly number[];
  readonly values: Readonly<Record<number, string>>;
  readonly n: number;
  readonly back?: number;
  readonly result?: string;
}

/**
 * Runs `factorial` on any n and records every call: the base-case check, each
 * call pushed onto the stack, and each return as the stack unwinds.
 */
function traceFactorial(start: number): Step[] {
  const steps: Step[] = [];
  const frames: Frame[] = [];
  let calls = 0;
  const emit = (e: Emit): void => {
    steps.push({
      chapter: 'run',
      short: e.short,
      title: e.title,
      body: e.body,
      code: { view: 'final', lines: e.lines },
      values: e.values,
      metrics: { calls, depth: frames.length, result: e.result ?? '—' },
      scene: { entities: scene({ frames: frames.map((f) => ({ ...f })), n: e.n, ...(e.back === undefined ? {} : { back: e.back }) }) },
    });
  };

  const run = (n: number, root: boolean): number => {
    frames.push({ n });
    calls += 1;
    const called = root ? '' : `Line 7 of the caller runs \`factorial(${n})\`: a new frame goes on top. `;
    if (n <= 1) {
      frames[frames.length - 1] = { n, ret: 1 };
      emit({
        short: `Base n = ${n}`,
        title: `factorial(${n}): base case`,
        body: `${called}Line 3: \`${n} <= 1\` is true, so line 4 returns 1 straight away. No further call is made, so the stack stops growing.`,
        lines: [3, 4],
        values: { 3: `${n} <= 1 → True`, 4: 'return 1' },
        n,
        ...(root ? { result: '1' } : {}),
      });
      frames.pop();
      return 1;
    }
    emit({
      short: `Call n = ${n}`,
      title: `factorial(${n}): not the base case`,
      body: `${called}Line 3: \`${n} <= 1\` is false. Line 7 will call \`factorial(${n - 1})\`, and this frame waits for its answer before multiplying.`,
      lines: [3],
      values: { 3: `${n} <= 1 → False` },
      n,
    });
    const back = run(n - 1, false);
    const value = n * back;
    frames[frames.length - 1] = { n, ret: value };
    emit({
      short: `Return ${value}`,
      title: `factorial(${n}) returns ${value}`,
      body: `The call below handed back ${back}, and its frame is gone. Line 7 multiplies: \`${n} * ${back} = ${value}\`, and returns it.${root ? ` The stack is empty again: the answer is **${value}**.` : ''}`,
      lines: [7],
      values: { 7: `return ${n} * ${back} = ${value}` },
      n,
      back,
      ...(root ? { result: String(value) } : {}),
    });
    frames.pop();
    return value;
  };

  run(start, true);
  return steps;
}

const START = 4;
const RUN = traceFactorial(START);
/** Scene of run step n (0-based), so build steps show the moment they describe. */
const at = (n: number): Step['scene'] => RUN[n]?.scene ?? { entities: [] };
const startMetrics = { calls: 0, depth: 0, result: '—' } as const;
const FINAL_METRICS = RUN.at(-1)?.metrics ?? startMetrics;
/** Story steps before the run chapter: problem 1, idea 2, build 2. */
const RUN_START = 5;

/** The idea in numbers: each row waits on the next one down. */
const CHAIN: readonly Frame[] = [
  { n: 4, value: '4 × factorial(3)', tone: 'compare' },
  { n: 3, value: '3 × factorial(2)', tone: 'compare' },
  { n: 2, value: '2 × factorial(1)', tone: 'compare' },
  { n: 1, value: '1: no more calls', tone: 'found' },
];

export default defineWalkthrough({
  id: 'learn/recursion-divide-conquer/call-stack-recursion-basics',
  title: 'Recursion & the Call Stack, a function that calls itself',
  summary: 'From the idea to the code: solve a problem by calling the same function on a smaller input, stop at a base case, and watch the call stack grow and unwind.',
  minutes: 7,
  code: {
    lang: 'python',
    source: `def factorial(n: int) -> int:
    # Base case: the call that needs no further call
    if n <= 1:
        return 1

    # Recursive step: trust factorial(n - 1), then multiply
    return n * factorial(n - 1)`,
  },
  metrics: [
    { key: 'calls', label: 'Calls made' },
    { key: 'depth', label: 'Stack depth' },
    { key: 'result', label: 'Returns' },
  ],
  legend: [
    { tone: 'note', label: 'the call running now' },
    { tone: 'muted', label: 'waiting for the call above it' },
    { tone: 'found', label: 'a frame returning its answer' },
    { tone: 'compare', label: 'a call the idea will make' },
    { tone: 'miss', label: 'no base case: the stack never stops' },
  ],
  goals: [
    { text: 'Solve a problem with a smaller copy of itself', step: 2 },
    { text: 'See where calls wait: the call stack', step: 3 },
    { text: 'Stop the chain with a base case', step: 4 },
    { text: 'Watch frames pile up, then unwind', step: RUN_START + 1 },
    { text: 'See why the base case must come first', step: RUN_START + RUN.length + 2 },
  ],
  steps: [
    {
      chapter: 'problem',
      short: 'The brief',
      title: 'Compute 4! = 4 × 3 × 2 × 1',
      body: 'Like opening Russian nesting dolls: you open one, find a smaller one inside, and keep going until the smallest solid doll.\n\nLine 1 takes a whole number `n` and returns `n!`, the product of every whole number from 1 up to `n`. Here, `n = 4`.',
      code: { view: 'signature', lines: [1] },
      metrics: startMetrics,
      scene: { entities: scene({ frames: [], n: START, note: '4! = 4 × 3 × 2 × 1 = 24', noteTone: 'note' }) },
    },
    {
      chapter: 'idea',
      short: 'Smaller copy',
      title: '4! is 4 times a smaller factorial',
      body: 'Notice that `4! = 4 × 3!`, and `3! = 3 × 2!`, and so on. Each problem is the **same problem on a smaller number**, so a function can solve it by calling itself.\n\nThe chain has to end somewhere: `1! = 1` needs no further call.',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: { entities: scene({ frames: CHAIN, n: START, note: 'n! = n × (n − 1)!\nand 1! = 1 stops the chain', noteTone: 'note' }) },
    },
    {
      chapter: 'idea',
      short: 'Call stack',
      title: 'Waiting calls are kept on the call stack',
      body: 'While `factorial(3)` runs, `factorial(4)` is paused: it still has to multiply by the answer. Python keeps each paused call in a **frame** (its `n` and where to resume) on the **call stack**.\n\nFrames pile up on the way down and are removed one by one on the way back, **unwinding**.',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: { entities: scene({ frames: CHAIN.map((f) => ({ n: f.n })), n: 1, note: 'top frame runs, the rest wait\nfinished frames are removed', noteTone: 'note' }) },
    },
    {
      chapter: 'build',
      short: 'Base case',
      title: 'Lines 2–4: stop when the problem is tiny',
      body: 'Line 3 asks whether `n` is 1 or less. If so, line 4 returns 1 directly: this is the **base case**, a call that needs no further call, like the smallest doll.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4], lines: [3, 4] },
      metrics: RUN[3]?.metrics ?? startMetrics,
      changes: ['if n <= 1: return 1'],
      scene: at(3),
    },
    {
      chapter: 'build',
      short: 'Recurse',
      title: 'Lines 6–7: call yourself on n − 1',
      body: 'Line 7 is the **recursive step**. It calls `factorial(n - 1)`, a smaller problem that moves toward the base case, and multiplies the answer by `n`.\n\nThat’s the whole function. Now let’s run it and watch the stack.',
      code: { view: 'final', lines: [7] },
      metrics: RUN[1]?.metrics ?? startMetrics,
      changes: ['return n * factorial(n - 1)'],
      scene: at(1),
    },
    ...RUN,
    {
      chapter: 'why',
      short: 'Recap',
      title: 'n calls, n frames: O(n) time and space',
      body: `Every call does one multiplication and makes one more call, so \`n\` calls take **\`O(n)\` time**. All \`n\` frames are on the stack at the deepest moment, so it also uses **\`O(n)\` space**.\n\nPython stops at about 1,000 frames with a \`RecursionError\`; a plain loop would need only \`O(1)\` space.`,
      code: { view: 'final', lines: [3, 7] },
      metrics: FINAL_METRICS,
      scene: { entities: [...(RUN.at(-1)?.scene.entities.filter((e) => e.id !== 'note') ?? []), note('note', SIDE_X, 180, 'n = 4     →  4 frames\nn = 1,000 →  RecursionError', { tone: 'found' })] },
    },
    {
      chapter: 'why',
      short: 'Base case',
      title: 'Why line 3 comes first: the stack needs a floor',
      body: 'Without the base case, `n` just keeps shrinking: 3, 2, 1, 0, −1, … and every call makes another call. Frames pile up until Python gives up with a `RecursionError`.\n\nThe base case is the key decision: it is the only thing that lets the stack stop growing and start unwinding.',
      code: { view: 'final', lines: [3, 4] },
      values: { 3: 'n <= 1 → stops the chain', 4: 'return 1' },
      metrics: { calls: 5, depth: 5, result: 'RecursionError' },
      scene: {
        entities: scene({
          frames: [
            { n: 3 },
            { n: 2 },
            { n: 1, value: 'no check → calls on', tone: 'miss' },
            { n: 0, value: 'still going…', tone: 'miss' },
            { n: -1, value: 'and going…', tone: 'miss' },
          ],
          n: -1,
          note: 'no base case:\nthe stack grows for ever\n→ RecursionError',
          noteTone: 'miss',
        }),
      },
    },
  ],
  trace: {
    title: 'Run factorial on your own n',
    inputs: [{ name: 'n', label: 'n (0 to 10)', kind: 'number', default: '4' }],
    presets: [
      { label: 'Base case only', values: { n: '1' } },
      { label: 'Zero', values: { n: '0' } },
      { label: 'Deeper stack', values: { n: '7' } },
    ],
    run: (values) => {
      const n = values['n'];
      if (typeof n !== 'number') throw new Error('Enter a single whole number.');
      if (n < 0 || n > 10) throw new Error('Pick n from 0 to 10 so the call stack fits on the stage.');
      return traceFactorial(n);
    },
  },
});
