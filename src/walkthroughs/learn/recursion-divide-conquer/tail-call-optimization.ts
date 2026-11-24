import { defineWalkthrough, map, note, vars } from '../../../lib/walkthrough/helpers';
import type { Entity, Step, Tone } from '../../../lib/walkthrough/types';

/** The call stack sits at the origin; the variables panel and notes go to its right. */
const SIDE_X = 400;

/** One `factorial_tail` call on the call stack. */
interface Frame {
  readonly n: number;
  readonly acc: number;
  /** Set when this frame passes its answer up. */
  readonly ret?: number;
  /** Overrides the row's key, wording and tone (the idea pictures). */
  readonly key?: string;
  readonly value?: string;
  readonly tone?: Tone;
}

interface StackState {
  readonly frames: readonly Frame[];
  /** Variables of the running call. */
  readonly n?: number;
  readonly acc?: number;
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
          key: f.key ?? `factorial_tail(${f.n}, ${f.acc})`,
          value: f.value ?? (f.ret !== undefined ? `returns ${f.ret}` : k === top ? 'running' : 'nothing left to do'),
          tone: f.tone ?? (f.ret !== undefined ? 'found' : k === top ? 'note' : 'done'),
        })),
        { width: 340 },
      ),
    );
  }
  const row = (name: string, value: number | undefined): { name: string; value: number | string; tone: Tone } => ({
    name,
    value: value ?? '—',
    tone: value === undefined ? 'muted' : 'default',
  });
  entities.push(vars('vals', SIDE_X, 0, [row('n', s.n), row('accumulator', s.acc)], { label: 'this call', width: 210 }));
  if (s.note) entities.push(note('note', SIDE_X, 110, s.note, { tone: s.noteTone ?? 'note' }));
  return entities;
}

interface Emit {
  readonly short: string;
  readonly title: string;
  readonly body: string;
  readonly lines: readonly number[];
  readonly values: Readonly<Record<number, string>>;
  readonly n: number;
  readonly acc: number;
  readonly frameValue?: string;
  readonly note?: string;
  readonly result?: string;
}

/**
 * Runs `factorial_tail` on any n and records every call: the base-case check,
 * the new accumulator computed before each call, the call itself, and the
 * answer passed back up unchanged.
 */
function traceTail(start: number): Step[] {
  const steps: Step[] = [];
  const frames: Frame[] = [];
  let calls = 0;
  const emit = (e: Emit): void => {
    const shown = frames.map((f, k) => (k === frames.length - 1 && e.frameValue ? { ...f, value: e.frameValue } : { ...f }));
    steps.push({
      chapter: 'run',
      short: e.short,
      title: e.title,
      body: e.body,
      code: { view: 'final', lines: e.lines },
      values: e.values,
      metrics: { calls, depth: frames.length, result: e.result ?? '—' },
      scene: { entities: scene({ frames: shown, n: e.n, acc: e.acc, ...(e.note ? { note: e.note } : {}) }) },
    });
  };

  const run = (n: number, acc: number, root: boolean): number => {
    frames.push({ n, acc });
    calls += 1;
    const called = root ? '' : `Line 7 of the caller runs \`factorial_tail(${n}, ${acc})\`: a new frame goes on top. `;
    if (n <= 1) {
      frames[frames.length - 1] = { n, acc, ret: acc };
      emit({
        short: `Base n = ${n}`,
        title: `factorial_tail(${n}, ${acc}): base case`,
        body: `${called}Line 3: \`${n} <= 1\` is true, so line 4 returns \`accumulator\`, ${acc}. The running total already **is** the answer, so nothing needs multiplying on the way back.`,
        lines: [3, 4],
        values: { 3: `${n} <= 1 → True`, 4: `return ${acc}` },
        n,
        acc,
        ...(root ? { result: String(acc) } : {}),
      });
      frames.pop();
      return acc;
    }
    emit({
      short: `Call n = ${n}`,
      title: `factorial_tail(${n}, ${acc}): not the base case`,
      body: `${called}Line 3: \`${n} <= 1\` is false, so line 7 makes the next call.`,
      lines: [3],
      values: { 3: `${n} <= 1 → False` },
      n,
      acc,
    });
    const next = n * acc;
    emit({
      short: `Pass ${next}`,
      title: `Multiply now: ${n} * ${acc} = ${next}`,
      body: `Line 7 evaluates its arguments **before** the call: \`n - 1 = ${n - 1}\` and \`n * accumulator = ${n} * ${acc} = ${next}\`. The call is the very last thing this frame does, so no work is left to do when it returns.`,
      lines: [7],
      values: { 7: `factorial_tail(${n - 1}, ${n} * ${acc} = ${next})` },
      n,
      acc,
      frameValue: `calls (${n - 1}, ${next})`,
    });
    const back = run(n - 1, next, false);
    frames[frames.length - 1] = { n, acc, ret: back };
    emit({
      short: `Return ${back}`,
      title: `factorial_tail(${n}, ${acc}) returns ${back}`,
      body: `The call below handed back ${back}. Line 7 has nothing left to compute, so this frame **passes ${back} up unchanged**.${root ? ` The stack is empty: the answer is **${back}**.` : ''}`,
      lines: [7],
      values: { 7: `return ${back}` },
      n,
      acc,
      ...(root ? { result: String(back) } : {}),
    });
    frames.pop();
    return back;
  };

  run(start, 1, true);
  return steps;
}

const START = 4;
const RUN = traceTail(START);
/** Scene of run step n (0-based), so build steps show the moment they describe. */
const at = (n: number): Step['scene'] => RUN[n]?.scene ?? { entities: [] };
const startMetrics = { calls: 0, depth: 0, result: '—' } as const;
const FINAL_METRICS = RUN.at(-1)?.metrics ?? startMetrics;
/** Story steps before the run chapter: problem 1, idea 2, build 3. */
const RUN_START = 6;

/** Plain recursion: every waiting frame still owes a multiplication. */
const PENDING: readonly Frame[] = [
  { n: 4, acc: 1, key: 'factorial(4)', value: 'waits to do 4 × □', tone: 'compare' },
  { n: 3, acc: 1, key: 'factorial(3)', value: 'waits to do 3 × □', tone: 'compare' },
  { n: 2, acc: 1, key: 'factorial(2)', value: 'waits to do 2 × □', tone: 'compare' },
  { n: 1, acc: 1, key: 'factorial(1)', value: 'running', tone: 'note' },
];

/** The accumulator version: the multiplications are already done. */
const CARRIED: readonly Frame[] = [
  { n: 4, acc: 1 },
  { n: 3, acc: 4 },
  { n: 2, acc: 12 },
  { n: 1, acc: 24 },
];

export default defineWalkthrough({
  id: 'learn/recursion-divide-conquer/tail-call-optimization',
  title: 'Tail Recursion, doing the work before the call',
  summary: 'From the idea to the code: carry the running total in an accumulator so a recursive call is the last thing a function does and no frame has work left waiting.',
  minutes: 7,
  code: {
    lang: 'python',
    source: `def factorial_tail(n: int, accumulator: int = 1) -> int:
    # Base case: the accumulator already holds the answer
    if n <= 1:
        return accumulator

    # Tail call: multiply now, pass the running total forward
    return factorial_tail(n - 1, n * accumulator)`,
  },
  snapshots: {
    plain: `def factorial(n: int) -> int:
    if n <= 1:
        return 1
    return n * factorial(n - 1)  # the multiply waits for the call`,
  },
  metrics: [
    { key: 'calls', label: 'Calls made' },
    { key: 'depth', label: 'Stack depth' },
    { key: 'result', label: 'Returns' },
  ],
  legend: [
    { tone: 'note', label: 'the call running now' },
    { tone: 'done', label: 'waiting, with nothing left to do' },
    { tone: 'compare', label: 'waiting to multiply' },
    { tone: 'found', label: 'a frame passing its answer up' },
  ],
  goals: [
    { text: 'Spot work that waits on the stack', step: 2 },
    { text: 'Carry the running total in an accumulator', step: 3 },
    { text: 'Write the tail call', step: 6 },
    { text: 'Follow every call, then the unchanged return', step: RUN_START + 1 },
    { text: 'See why the multiply moves into the arguments', step: RUN_START + RUN.length + 2 },
  ],
  steps: [
    {
      chapter: 'problem',
      short: 'The brief',
      title: 'Compute 4! without leaving work waiting',
      body: 'Like ordering through a chain of couriers: in plain recursion you must wait at your desk to stamp the package once the courier returns.\n\nLine 1 takes `n` and a running total `accumulator` (starting at 1), and returns `n!`. Here, `n = 4`.',
      code: { view: 'signature', lines: [1] },
      metrics: startMetrics,
      scene: { entities: scene({ frames: [], n: START, acc: 1, note: '4! = 4 × 3 × 2 × 1 = 24', noteTone: 'note' }) },
    },
    {
      chapter: 'idea',
      short: 'Waiting work',
      title: 'Plain recursion leaves a multiply waiting',
      body: 'In `n * factorial(n - 1)` the multiplication happens **after** the call returns, so each paused frame still owes a `n × □`. None of them can be thrown away.\n\nThat is why plain recursion needs `n` frames at once.',
      code: { view: 'snapshot', id: 'plain', lines: [4] },
      metrics: startMetrics,
      scene: { entities: scene({ frames: PENDING, n: 1, note: 'every waiting frame has\na multiply still to do', noteTone: 'miss' }) },
    },
    {
      chapter: 'idea',
      short: 'Accumulator',
      title: 'Multiply first, and pass the total forward',
      body: 'Do each multiplication **before** calling, and hand the running total to the next call as an argument: the **accumulator**. At the bottom it already holds the answer.\n\nNow a waiting frame has nothing left to do, so a runtime that supports it could reuse one frame.',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: { entities: scene({ frames: CARRIED, n: 1, acc: 24, note: 'n = 4, 3, 2, 1\naccumulator = 1, 4, 12, 24', noteTone: 'found' }) },
    },
    {
      chapter: 'build',
      short: 'Accumulator',
      title: 'Line 1: a parameter for the running total',
      body: 'The second parameter, `accumulator`, starts at 1 and carries the product of everything multiplied so far. It is the answer being built on the way **down** instead of on the way back.',
      code: { view: 'reveal', reveal: [1], lines: [1] },
      metrics: RUN[0]?.metrics ?? startMetrics,
      changes: ['accumulator: int = 1'],
      scene: at(0),
    },
    {
      chapter: 'build',
      short: 'Base case',
      title: 'Lines 2–4: return the accumulator',
      body: 'Line 3 stops at `n <= 1`. Line 4 returns `accumulator`, not 1: by then the running total holds every factor, so it is the final answer.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4], lines: [3, 4] },
      metrics: RUN[6]?.metrics ?? startMetrics,
      changes: ['if n <= 1: return accumulator'],
      scene: at(6),
    },
    {
      chapter: 'build',
      short: 'Tail call',
      title: 'Lines 6–7: multiply now, then call',
      body: 'Line 7 calls itself with `n - 1` and the new total `n * accumulator`. The multiplication happens inside the arguments, so the call is the last thing the function does: a **tail call**.\n\nThat’s the whole function. Now let’s run it.',
      code: { view: 'final', lines: [7] },
      metrics: RUN[1]?.metrics ?? startMetrics,
      changes: ['return factorial_tail(n - 1, n * accumulator)'],
      scene: at(1),
    },
    ...RUN,
    {
      chapter: 'why',
      short: 'Recap',
      title: 'Still O(n) time; O(1) space only with TCO',
      body: `Each call does one multiplication and makes one more call: **\`O(n)\` time**. A runtime with tail-call optimization (Scheme, Scala, Elixir) reuses the same frame, so it needs just **\`O(1)\` space**.\n\nCPython has no such optimization, so it still stacks \`n\` frames and stops near 1,000. The fix there is to turn the tail call into a loop.`,
      code: { view: 'final', lines: [3, 7] },
      metrics: FINAL_METRICS,
      scene: {
        entities: [
          map('stack', 0, 0, 'call stack with TCO', [{ key: 'factorial_tail(n, accumulator)', value: 'one frame, reused', tone: 'found' }], { width: 340 }),
          vars('vals', SIDE_X, 0, [{ name: 'n', value: '4 → 1' }, { name: 'accumulator', value: '1 → 24' }], { label: 'this call', width: 210 }),
          note('note', SIDE_X, 110, 'CPython: 4 frames, O(n)\nTCO runtime: 1 frame, O(1)', { tone: 'found' }),
        ],
      },
    },
    {
      chapter: 'why',
      short: 'Tail position',
      title: 'Why line 7 multiplies inside the arguments',
      body: 'Compare with `return n * factorial(n - 1)`: there the `*` runs after the call returns, so the frame must wait. Here `n * accumulator` is computed first and rides along as an argument.\n\nThat is the key decision: the call is the last operation, so the frame has nothing left to come back for, and the caller can be replaced.',
      code: { view: 'final', lines: [7] },
      values: { 7: 'factorial_tail(3, 4 * 1)  # the multiply is already done' },
      metrics: RUN[1]?.metrics ?? startMetrics,
      scene: {
        entities: scene({
          frames: [{ n: 4, acc: 1, value: 'calls (3, 4)', tone: 'note' }],
          n: 4,
          acc: 1,
          note: 'n * accumulator runs BEFORE\nthe call, nothing runs after it',
          noteTone: 'found',
        }),
      },
    },
  ],
  trace: {
    title: 'Run factorial_tail on your own n',
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
      return traceTail(n);
    },
  },
});
