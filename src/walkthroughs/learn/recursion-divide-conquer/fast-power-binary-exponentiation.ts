import { arr, defineWalkthrough, map, note, vars } from '../../../lib/walkthrough/helpers';
import type { Entity, ScalarValue, Step, Tone } from '../../../lib/walkthrough/types';

/** The call stack sits at the origin; the variables panel and notes go to its right. */
const SIDE_X = 400;

/** One `power_recursive` call on the call stack. */
interface Frame {
  readonly base: number;
  readonly exp: number;
  /** Set when this frame has computed its answer and is about to return it. */
  readonly ret?: number;
  /** Overrides the row's key, wording and tone (the "what if" picture). */
  readonly key?: string;
  readonly value?: string;
  readonly tone?: Tone;
}

interface PowerState {
  readonly frames: readonly Frame[];
  /** Variables of the running call. */
  readonly base: number;
  readonly exp?: number;
  readonly half?: number;
  readonly note?: string;
  readonly noteTone?: Tone;
  /** Extra entities (the exponent chain in the idea step). */
  readonly extra?: readonly Entity[];
}

/** Scene: the call stack (running call in `note` tone), the running call's variables, and a note. */
function scene(s: PowerState): Entity[] {
  const entities: Entity[] = [...(s.extra ?? [])];
  const top = s.frames.length - 1;
  if (s.frames.length > 0) {
    entities.push(
      map(
        'stack',
        0,
        0,
        'call stack',
        s.frames.map((f, k) => ({
          key: f.key ?? `power_recursive(${f.base}, ${f.exp})`,
          value: f.value ?? (f.ret !== undefined ? `returns ${f.ret}` : k === top ? 'running' : 'waits on line 7'),
          tone: f.tone ?? (f.ret !== undefined ? 'found' : k === top ? 'note' : 'muted'),
        })),
        { width: 340 },
      ),
    );
  }
  const row = (name: string, value: ScalarValue | undefined): { name: string; value: ScalarValue; tone: Tone } => ({
    name,
    value: value ?? '—',
    tone: value === undefined ? 'muted' : 'default',
  });
  entities.push(vars('vals', SIDE_X, 0, [row('base', s.base), row('exp', s.exp), row('half', s.half)], { label: 'this call', width: 200 }));
  if (s.note) entities.push(note('note', SIDE_X, 150, s.note, { tone: s.noteTone ?? 'note' }));
  return entities;
}

interface Emit {
  readonly short: string;
  readonly title: string;
  readonly body: string;
  readonly lines: readonly number[];
  readonly values: Readonly<Record<number, string>>;
  readonly exp: number;
  readonly half?: number;
  readonly result?: string;
}

/**
 * Runs `power_recursive` on any base and exponent and records every call: the
 * `exp == 0` check and the halving, then for each frame the stored `half`, the
 * parity check and the return as the stack unwinds.
 */
function tracePower(base: number, start: number): Step[] {
  const steps: Step[] = [];
  const frames: Frame[] = [];
  let calls = 0;
  let mults = 0;
  const emit = (e: Emit): void => {
    steps.push({
      chapter: 'run',
      short: e.short,
      title: e.title,
      body: e.body,
      code: { view: 'final', lines: e.lines },
      values: e.values,
      metrics: { calls, mults, result: e.result ?? '—' },
      scene: { entities: scene({ frames: frames.map((f) => ({ ...f })), base, exp: e.exp, ...(e.half === undefined ? {} : { half: e.half }) }) },
    });
  };

  const run = (exp: number, root: boolean): number => {
    frames.push({ base, exp });
    calls += 1;
    const called = root ? '' : `Line 7 of the caller runs \`power_recursive(${base}, ${exp})\`: a new frame goes on top. `;
    if (exp === 0) {
      frames[frames.length - 1] = { base, exp, ret: 1 };
      emit({
        short: 'Base exp = 0',
        title: `power_recursive(${base}, 0): base case`,
        body: `${called}Line 3: \`${exp} == 0\` is true, so line 4 returns 1: anything to the power 0 is 1. The exponent can't shrink further.`,
        lines: [3, 4],
        values: { 3: `${exp} == 0 → True`, 4: 'return 1' },
        exp,
        ...(root ? { result: '1' } : {}),
      });
      frames.pop();
      return 1;
    }
    const next = Math.floor(exp / 2);
    emit({
      short: `Call exp = ${exp}`,
      title: `power_recursive(${base}, ${exp}): halve the exponent`,
      body: `${called}Line 3: \`${exp} == 0\` is false. Line 7 will call itself with \`exp // 2 = ${exp} // 2 = ${next}\`, and this frame waits for \`half\`.`,
      lines: [3, 7],
      values: { 3: `${exp} == 0 → False`, 7: `half = power_recursive(${base}, ${exp} // 2 = ${next})` },
      exp,
    });
    const half = run(next, false);
    const even = exp % 2 === 0;
    emit({
      short: even ? 'Even' : 'Odd',
      title: `${exp} is ${even ? 'even' : 'odd'}`,
      body: `The call below returned ${half}, so \`half = ${half}\` (line 7). Line 10: \`${exp} % 2 == 0\` is ${even ? 'true: the exponent was split exactly, so the answer is `half` squared' : 'false: halving rounded down, so one factor of the base is still missing'}.`,
      lines: [10],
      values: { 7: `half = ${half}`, 10: `${exp} % 2 == 0 → ${even ? 'True' : 'False'}` },
      exp,
      half,
    });
    const value = even ? half * half : base * half * half;
    mults += even ? 1 : 2;
    frames[frames.length - 1] = { base, exp, ret: value };
    emit({
      short: `Return ${value}`.length <= 14 ? `Return ${value}` : 'Return',
      title: `power_recursive(${base}, ${exp}) returns ${value}`,
      body: even
        ? `Line 11 returns \`half * half = ${half} * ${half} = ${value}\`: two equal halves of the exponent make ${base}^${exp}.${root ? ` The stack is empty: the answer is **${value}**.` : ''}`
        : `Line 12 returns \`base * half * half = ${base} * ${half} * ${half} = ${value}\`: the extra ${base} replaces the factor that rounding dropped.${root ? ` The stack is empty: the answer is **${value}**.` : ''}`,
      lines: even ? [11] : [12],
      values: even ? { 11: `return ${half} * ${half} = ${value}` } : { 12: `return ${base} * ${half} * ${half} = ${value}` },
      exp,
      half,
      ...(root ? { result: String(value) } : {}),
    });
    frames.pop();
    return value;
  };

  run(start, true);
  return steps;
}

const BASE = 3;
const EXP = 13;
const RUN = tracePower(BASE, EXP);
/** Scene of run step n (0-based), so build steps show the moment they describe. */
const at = (n: number): Step['scene'] => RUN[n]?.scene ?? { entities: [] };
const startMetrics = { calls: 0, mults: 0, result: '—' } as const;
const FINAL_METRICS = RUN.at(-1)?.metrics ?? startMetrics;
/** Story steps before the run chapter: problem 1, idea 2, build 4. */
const RUN_START = 7;

/** 13 → 6 → 3 → 1 → 0: the exponent halves until it reaches the base case. */
const chain = (tone: Tone): Entity =>
  arr('chain', 0, 200, [13, 6, 3, 1, 0], { label: 'exp', tones: { 0: tone, 1: tone, 2: tone, 3: tone, 4: 'found' } });

export default defineWalkthrough({
  id: 'learn/recursion-divide-conquer/fast-power-binary-exponentiation',
  title: 'Fast Powering, halve the exponent',
  summary: 'From the idea to the code: compute a power with a handful of multiplications by solving half the exponent once and squaring the result.',
  minutes: 8,
  code: {
    lang: 'python',
    source: `def power_recursive(base: int, exp: int) -> int:
    # Base case: anything to the power 0 is 1
    if exp == 0:
        return 1

    # Divide: solve for half the exponent, once
    half = power_recursive(base, exp // 2)

    # Combine: square the half, add one base if exp is odd
    if exp % 2 == 0:
        return half * half
    return base * half * half`,
  },
  snapshots: {
    naive: `def power_naive(base: int, exp: int) -> int:
    result = 1
    for _ in range(exp):
        result *= base
    return result`,
  },
  metrics: [
    { key: 'calls', label: 'Calls' },
    { key: 'mults', label: 'Multiplications' },
    { key: 'result', label: 'Returns' },
  ],
  legend: [
    { tone: 'note', label: 'the call running now' },
    { tone: 'muted', label: 'waiting for the call above it' },
    { tone: 'found', label: 'a frame returning its answer' },
    { tone: 'compare', label: 'an exponent still to halve' },
    { tone: 'miss', label: 'repeated calls (half not reused)' },
  ],
  goals: [
    { text: 'See why 13 multiplications are too many', step: 2 },
    { text: 'Halve the exponent and square the result', step: 3 },
    { text: 'Handle odd exponents with one extra base', step: 7 },
    { text: 'Follow every call down to exp = 0 and back', step: RUN_START + 1 },
    { text: 'See why half is computed only once', step: RUN_START + RUN.length + 2 },
  ],
  steps: [
    {
      chapter: 'problem',
      short: 'The brief',
      title: 'Compute 3^13',
      body: 'Think of folding puff pastry: folding the dough in half again and again makes 64 layers in 6 folds, not 64 separate sheets.\n\nLine 1 takes a `base` and a whole-number exponent `exp` (0 or more) and returns `base ** exp`. Here, `3 ** 13 = 1,594,323`.',
      code: { view: 'signature', lines: [1] },
      metrics: startMetrics,
      scene: { entities: scene({ frames: [], base: BASE, exp: EXP, note: '3^13 = 3 × 3 × … × 3\n(13 factors)', noteTone: 'note' }) },
    },
    {
      chapter: 'idea',
      short: 'Too many',
      title: 'The obvious way: multiply 13 times',
      body: 'A loop multiplies `result` by `base` once per unit of the exponent: 13 multiplications for `3 ** 13`. For `exp = 10**18` that is a billion billion multiplications.\n\nIt is `O(exp)`, and it ignores that powers can be built from smaller powers.',
      code: { view: 'snapshot', id: 'naive', lines: [3, 4] },
      metrics: startMetrics,
      scene: { entities: scene({ frames: [], base: BASE, exp: EXP, note: 'exp = 13  →  13 multiplications\nexp = 10^18  →  10^18 of them', noteTone: 'miss' }) },
    },
    {
      chapter: 'idea',
      short: 'Halve it',
      title: 'A power is the square of a half-power',
      body: 'Since `3^12 = (3^6)²`, a power with an even exponent is the square of the power with **half** the exponent. For an odd one, `3^13 = 3 × 3^12`: one extra base, because `13 // 2` rounds down to 6.\n\nSo one smaller call plus one or two multiplications solve it. The exponent halves each time: 13, 6, 3, 1, 0.',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: { entities: scene({ frames: [], base: BASE, exp: EXP, extra: [chain('compare')], note: '3^13 = 3 × (3^6)²   odd\n3^6  = (3^3)²        even\n3^3  = 3 × (3^1)²   odd', noteTone: 'note' }) },
    },
    {
      chapter: 'build',
      short: 'Base case',
      title: 'Lines 2–4: the exponent 0 stops the halving',
      body: 'Halving 13 eventually reaches 0, so line 3 stops there and line 4 returns 1: any number to the power 0 is 1. Every chain of calls ends here.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4], lines: [3, 4] },
      metrics: RUN[4]?.metrics ?? startMetrics,
      changes: ['if exp == 0: return 1'],
      scene: at(4),
    },
    {
      chapter: 'build',
      short: 'Divide',
      title: 'Lines 6–7: solve for half the exponent, once',
      body: 'Line 7 calls the same function with `exp // 2` and stores the answer in `half`. `//` rounds down, so `13 // 2 = 6` and `6 // 2 = 3`.\n\nIt is called **once**, and `half` is reused below.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 6, 7], lines: [7] },
      metrics: RUN[0]?.metrics ?? startMetrics,
      changes: ['half = power_recursive(base, exp // 2)'],
      scene: at(0),
    },
    {
      chapter: 'build',
      short: 'Even',
      title: 'Lines 9–11: an even exponent squares half',
      body: 'Line 10 checks whether `exp` is even. If so, the two halves of the exponent are equal and line 11 returns `half * half`. For `exp = 6`, `half = 27` (that is `3^3`) and the answer is `27 * 27 = 729`.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 6, 7, 9, 10, 11], lines: [10, 11] },
      metrics: RUN[10]?.metrics ?? startMetrics,
      changes: ['if exp % 2 == 0: return half * half'],
      scene: at(10),
    },
    {
      chapter: 'build',
      short: 'Odd',
      title: 'Line 12: an odd exponent needs one more base',
      body: 'If `exp` is odd, `exp // 2` rounded down and dropped one factor. Line 12 puts it back: `base * half * half`. For `exp = 13`, `half = 729`, so `3 * 729 * 729 = 1,594,323`.\n\nThat’s the whole function. Now let’s run it, call by call.',
      code: { view: 'final', lines: [12] },
      metrics: RUN[12]?.metrics ?? startMetrics,
      changes: ['return base * half * half'],
      scene: at(12),
    },
    ...RUN,
    {
      chapter: 'why',
      short: 'Recap',
      title: 'The exponent halves, so O(log exp)',
      body: `Each call halves \`exp\`, so there are about \`log₂ exp\` calls with at most 2 multiplications each: **\`O(log exp)\` time**, and as many frames on the call stack: **\`O(log exp)\` space**.\n\nFor \`exp = 13\` that was ${RUN.at(-1)?.metrics?.['calls'] ?? 5} calls instead of 13 multiplications; for \`10**18\` it is about 60.`,
      code: { view: 'final', lines: [7, 10] },
      metrics: FINAL_METRICS,
      scene: {
        entities: [
          ...(RUN.at(-1)?.scene.entities.filter((e) => e.id !== 'note') ?? []),
          note('note', SIDE_X, 150, 'exp = 13       →  5 calls\nexp = 10^18   →  ~60 calls\nnaive: 10^18 multiplications', { tone: 'found' }),
        ],
      },
    },
    {
      chapter: 'why',
      short: 'Call once',
      title: 'Why half is computed once (line 7)',
      body: 'Writing `power_recursive(base, exp // 2) * power_recursive(base, exp // 2)` would make **two** calls per level, and each of those two more. The 5 levels would grow to 31 calls: back to `O(exp)`.\n\nThat is the key decision: store the half in `half` and reuse it, so every level makes one call.',
      code: { view: 'final', lines: [7, 11] },
      values: { 7: 'half = ...  # one call, reused', 11: 'half * half  # not two calls' },
      metrics: FINAL_METRICS,
      scene: {
        entities: scene({
          frames: [
            { base: BASE, exp: 13, key: 'exp = 13', value: '1 call', tone: 'compare' },
            { base: BASE, exp: 6, key: 'exp = 6', value: '2 calls', tone: 'miss' },
            { base: BASE, exp: 3, key: 'exp = 3', value: '4 calls', tone: 'miss' },
            { base: BASE, exp: 1, key: 'exp = 1', value: '8 calls', tone: 'miss' },
            { base: BASE, exp: 0, key: 'exp = 0', value: '16 calls', tone: 'miss' },
          ],
          base: BASE,
          note: 'two calls per level: 31 calls, O(exp)\none call per level: 5 calls, O(log exp)',
          noteTone: 'found',
        }),
      },
    },
  ],
  trace: {
    title: 'Run fast powering on your own numbers',
    inputs: [
      { name: 'base', label: 'Base (-9 to 9)', kind: 'number', default: '3' },
      { name: 'exp', label: 'Exponent (0 to 16)', kind: 'number', default: '13' },
    ],
    presets: [
      { label: 'Exponent 0', values: { base: '3', exp: '0' } },
      { label: 'Power of two', values: { base: '2', exp: '16' } },
      { label: 'Odd exponent', values: { base: '5', exp: '7' } },
      { label: 'Negative base', values: { base: '-2', exp: '5' } },
      { label: 'Base 0', values: { base: '0', exp: '4' } },
    ],
    run: (values) => {
      const base = values['base'];
      const exp = values['exp'];
      if (typeof base !== 'number' || typeof exp !== 'number') throw new Error('Enter a base and an exponent as single whole numbers.');
      if (exp < 0) throw new Error('The exponent must be 0 or more: negative exponents need fractions.');
      if (exp > 16 || Math.abs(base) > 9) throw new Error('Use a base from -9 to 9 and an exponent up to 16, so the call stack and the result fit on the stage.');
      return tracePower(base, exp);
    },
  },
});
