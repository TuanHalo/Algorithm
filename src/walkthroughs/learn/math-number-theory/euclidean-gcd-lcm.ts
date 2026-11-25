import { arr, defineWalkthrough, link, note, ptr, vars } from '../../../lib/walkthrough/helpers';
import type { Entity, Step, Tone } from '../../../lib/walkthrough/types';

const VARS_Y = 150;
const NOTE_X = 220;

interface GcdState {
  /** Every value the pair has taken so far: a, b, a % b, ... (cells shown so far). */
  readonly chain: readonly number[];
  /** `a` sits on chain[k] and `b` on chain[k + 1]. */
  readonly k: number;
  /** The remainder just computed (it is the last chain cell, not yet assigned). */
  readonly remainder?: number;
  /** The loop ended: `a` holds the answer. */
  readonly done?: boolean;
  readonly note?: string;
  readonly noteTone?: Tone;
}

/** Scene for one moment: the chain of remainders, `a` and `b` sliding along it, and the variables. */
function scene(s: GcdState): Entity[] {
  const cellTones: Record<number, Tone> = {};
  s.chain.forEach((_, i) => {
    if (i < s.k) cellTones[i] = 'muted';
  });
  if (s.remainder !== undefined) cellTones[s.k + 2] = 'active';
  if (s.done) cellTones[s.k] = 'found';

  const a = s.chain[s.k] ?? 0;
  const b = s.chain[s.k + 1] ?? 0;
  const entities: Entity[] = [arr('chain', 0, 0, s.chain, { label: 'a, b, then every remainder', tones: cellTones })];
  entities.push(ptr('a', 'chain', s.k, 'a', { tone: s.done ? 'found' : 'done', codeVar: 'a' }));
  entities.push(ptr('b', 'chain', s.k + 1, 'b', { tone: 'done', codeVar: 'b' }));
  if (s.remainder !== undefined) {
    entities.push(
      link('mod', { entity: 'chain', index: s.k, side: 'top' }, { entity: 'chain', index: s.k + 2, side: 'top' }, { label: `${a} % ${b} = ${s.remainder}`, tone: 'compare' }),
    );
  }
  entities.push(
    vars(
      'vals',
      0,
      VARS_Y,
      [
        { name: 'a', value: a },
        { name: 'b', value: b, tone: b === 0 ? 'found' : 'default' },
        { name: 'a % b', value: s.remainder ?? '—', tone: s.remainder === undefined ? 'muted' : 'default' },
      ],
      { label: 'variables', width: 180 },
    ),
  );
  if (s.note) entities.push(note('note', NOTE_X, VARS_Y, s.note, { tone: s.noteTone ?? 'note' }));
  return entities;
}

/** Every value Euclid's algorithm walks through: a, b, a % b, ... down to 0. */
function chainOf(a: number, b: number): number[] {
  const chain = [a, b];
  while ((chain.at(-1) ?? 0) !== 0) chain.push((chain.at(-2) ?? 0) % (chain.at(-1) ?? 1));
  return chain;
}

const MAX_CELLS = 10;

/** Runs Euclid's gcd on any pair and records one step per decision (chapter "run", final code). */
function traceGcd(a0: number, b0: number): Step[] {
  const chain = chainOf(a0, b0);
  if (chain.length > MAX_CELLS) throw new Error('That pair needs too many turns to draw on the stage. Try smaller numbers.');
  const turns = chain.length - 2;
  const steps: Step[] = [];
  let done = 0;
  const metrics = (result: string | number = '—'): Record<string, string | number> => ({ turns: done, result });
  const upTo = (n: number): number[] => chain.slice(0, n);

  steps.push({
    chapter: 'run',
    short: 'Start',
    title: `Start with a = ${a0}, b = ${b0}`,
    body: `The pair starts as the two arguments. Line 2 asks \`b != 0\`: \`${b0} != 0\` is **${b0 !== 0 ? 'true, so the loop starts' : 'false, so there is nothing to do'}**.`,
    code: { view: 'final', lines: [2] },
    values: { 2: `${b0} != 0 → ${b0 !== 0 ? 'True' : 'False'}` },
    metrics: metrics(),
    scene: { entities: scene({ chain: upTo(2), k: 0 }) },
  });

  for (let t = 0; t < turns; t += 1) {
    const a = chain[t] ?? 0;
    const b = chain[t + 1] ?? 0;
    const r = chain[t + 2] ?? 0;
    const q = Math.floor(a / b);
    steps.push({
      chapter: 'run',
      short: `${a} % ${b}`,
      title: `${a} % ${b} = ${r}`,
      body: `${t === 0 ? '' : `Line 2: \`${b} != 0\`, so go again. `}Line 3 first works out \`a % b\`: cutting pieces of ${b} off ${a} leaves \`${a} = ${q} × ${b} + ${r}\`, a leftover of **${r}**.`,
      code: { view: 'final', lines: t === 0 ? [3] : [2, 3] },
      values: t === 0 ? { 3: `${a} % ${b} = ${r}` } : { 2: `${b} != 0 → True`, 3: `${a} % ${b} = ${r}` },
      metrics: metrics(),
      scene: { entities: scene({ chain: upTo(t + 3), k: t, remainder: r }) },
    });
    done += 1;
    steps.push({
      chapter: 'run',
      short: `a, b = ${b}, ${r}`,
      title: `The pair becomes (${b}, ${r})`,
      body: `Line 3 then assigns both at once: \`a = ${b}\` and \`b = ${r}\`. Both pairs have the same common divisors, so the gcd did not change, but the numbers got smaller.`,
      code: { view: 'final', lines: [3] },
      values: { 3: `a, b = ${b}, ${r}` },
      metrics: metrics(),
      changes: [`a = ${b}`, `b = ${r}`],
      scene: { entities: scene({ chain: upTo(t + 3), k: t + 1 }) },
    });
  }

  const g = chain[turns] ?? 0;
  if (turns > 0) {
    steps.push({
      chapter: 'run',
      short: 'b is 0',
      title: 'b reached 0: the loop stops',
      body: `Line 2: \`0 != 0\` is false, so the loop ends. The last leftover was 0, which means ${g} divides the previous value exactly.`,
      code: { view: 'final', lines: [2] },
      values: { 2: '0 != 0 → False' },
      metrics: metrics(),
      scene: { entities: scene({ chain: upTo(turns + 2), k: turns, done: true }) },
    });
  }
  steps.push({
    chapter: 'run',
    short: 'Return',
    title: `Return ${g}`,
    body: `Line 4 returns \`a\`, which is **${g}**${turns > 0 ? ` after ${turns} turn${turns === 1 ? '' : 's'}` : ''}.`,
    code: { view: 'final', lines: [4] },
    values: { 4: `return ${g}` },
    metrics: metrics(g),
    scene: { entities: scene({ chain: upTo(turns + 2), k: turns, done: true, note: `gcd(${a0}, ${b0}) = ${g}`, noteTone: 'found' }) },
  });
  return steps;
}

const A = 48;
const B = 18;
const RUN = traceGcd(A, B);
/** Scene of run step n (0-based), so build steps show the moment they describe. */
const at = (n: number): Step['scene'] => RUN[n]?.scene ?? { entities: [] };
const startMetrics = { turns: 0, result: '—' } as const;
const FINAL_METRICS = RUN.at(-1)?.metrics ?? startMetrics;
const FULL_CHAIN = chainOf(A, B);

export default defineWalkthrough({
  id: 'learn/math-number-theory/euclidean-gcd-lcm',
  title: 'Euclid’s gcd: shrink the pair until one is zero',
  summary: 'From the idea to the code: find the greatest common divisor by replacing (a, b) with (b, a % b) until b is 0.',
  minutes: 6,
  code: {
    lang: 'python',
    source: `def gcd(a: int, b: int) -> int:
    while b != 0:
        a, b = b, a % b  # same common divisors, smaller numbers
    return a`,
  },
  snapshots: {
    brute: `def gcd(a: int, b: int) -> int:
    for d in range(max(a, b), 0, -1):
        if a % d == 0 and b % d == 0:
            return d
    return 0`,
  },
  metrics: [
    { key: 'turns', label: 'Turns' },
    { key: 'result', label: 'Returns' },
  ],
  legend: [
    { tone: 'active', label: 'new remainder' },
    { tone: 'compare', label: 'the % being worked out' },
    { tone: 'muted', label: 'left behind' },
    { tone: 'found', label: 'the gcd' },
  ],
  goals: [
    { text: 'See why trying every divisor is too slow', step: 2 },
    { text: 'Understand why gcd(a, b) = gcd(b, a % b)', step: 4 },
    { text: 'Build the loop line by line', step: 5 },
    { text: 'Follow every remainder down to zero', step: 8 },
    { text: 'Know why stopping at b = 0 is safe', step: 18 },
  ],
  steps: [
    {
      chapter: 'problem',
      short: 'The brief',
      title: 'Find the biggest number that divides both 48 and 18',
      body: 'A bathroom floor is 48 × 18 and must be tiled with identical squares and no cuts. What is the biggest square tile that works?\n\nLine 1 takes two whole numbers `a` and `b` (0 or more, never both 0) and returns their **greatest common divisor**.',
      code: { view: 'signature', lines: [1] },
      metrics: startMetrics,
      scene: { entities: scene({ chain: [A, B], k: 0 }) },
    },
    {
      chapter: 'idea',
      short: 'Brute force',
      title: 'The obvious way: try every divisor',
      body: 'Lines 2–4 count down from the bigger number and return the first `d` that divides both. For 48 and 18 that is **43 tries** (48, 47, … down to 6).\n\nFor numbers near a quintillion that never finishes. That is `O(max(a, b))`.',
      code: { view: 'snapshot', id: 'brute', lines: [2, 3, 4] },
      metrics: startMetrics,
      scene: { entities: scene({ chain: [A, B], k: 0, note: 'd = 48, 47, 46, … , 6\n43 tries for tiny numbers\nO(max(a, b)) is far too slow', noteTone: 'miss' }) },
    },
    {
      chapter: 'idea',
      short: 'Cut a strip',
      title: 'Cut 18-wide pieces off 48 and look at the leftover',
      body: 'Two 18 × 18 tiles cover 36 of the 48, leaving a strip of 12. Any tile that fits the whole floor must also fit that strip, so the leftover matters.\n\nIn numbers: `48 = 2 × 18 + 12`. The leftover is `48 % 18 = 12`.',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: { entities: scene({ chain: [A, B, 12], k: 0, remainder: 12, note: '48 = 2 × 18 + 12\nthe leftover 12 is what a % b gives' }) },
    },
    {
      chapter: 'idea',
      short: 'Same divisors',
      title: 'Why gcd(a, b) = gcd(b, a % b)',
      body: 'Write `a = q × b + r` with `r = a % b`. If `d` divides `a` and `b`, it divides `a − q × b = r`. If `d` divides `b` and `r`, it divides `q × b + r = a`.\n\nSo (a, b) and (b, r) have **exactly the same common divisors**, hence the same gcd, and `r < b`, so the numbers shrink. When `b` hits 0, `gcd(a, 0) = a`.',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: { entities: scene({ chain: FULL_CHAIN, k: 0, note: 'd | a and d | b  ⇔  d | b and d | r\nsame divisors → same gcd\nr < b, so it always shrinks' }) },
    },
    {
      chapter: 'build',
      short: 'Loop',
      title: 'Line 2: keep going while b is not zero',
      body: 'The pair is `(a, b)`. As long as `b != 0` there is still a leftover to take, so the loop runs. Once `b` is 0 we are done, because `gcd(a, 0) = a`.',
      code: { view: 'reveal', reveal: [1, 2], lines: [2] },
      metrics: startMetrics,
      changes: ['while b != 0'],
      scene: at(0),
    },
    {
      chapter: 'build',
      short: 'Shrink',
      title: 'Line 3: replace (a, b) with (b, a % b)',
      body: 'The formula from the idea, as one line. Both sides are assigned at once, so `a % b` uses the **old** `a` and `b` before either changes.',
      code: { view: 'reveal', reveal: [1, 2, 3], lines: [3] },
      metrics: { ...startMetrics, turns: 1 },
      changes: ['a, b = b, a % b'],
      scene: at(2),
    },
    {
      chapter: 'build',
      short: 'Return',
      title: 'Line 4: when the loop ends, a is the answer',
      body: 'The loop only stops with `b == 0`, and `gcd(a, 0) = a`, so line 4 returns `a`.\n\nThat is the whole function. Now let’s run it.',
      code: { view: 'final', lines: [4] },
      metrics: FINAL_METRICS,
      changes: ['return a'],
      scene: at(RUN.length - 1),
    },
    ...RUN,
    {
      chapter: 'why',
      short: 'Recap',
      title: 'The numbers halve every two turns: O(log)',
      body: 'Whenever `a ≥ b`, the leftover `a % b` is **less than half of a**: if `b ≤ a / 2` it is below `b`, otherwise it equals `a − b`. So every two turns the numbers at least halve, giving `O(log(min(a, b)))` turns and `O(1)` space.\n\nSwitch to **🧪 Try your own** to run it on any pair.',
      code: { view: 'final', lines: [2, 3] },
      metrics: FINAL_METRICS,
      scene: { entities: scene({ chain: FULL_CHAIN, k: 3, done: true, note: 'a % b < a / 2 when a ≥ b\n→ the pair halves every two turns\n→ O(log min(a, b))', noteTone: 'found' }) },
    },
    {
      chapter: 'why',
      short: 'Stop at 0',
      title: 'Why b = 0 is the safe place to stop',
      body: 'Every number divides 0, so the common divisors of `(a, 0)` are just the divisors of `a`, and the biggest is `a` itself. That is why line 2 can stop at `b == 0` and line 4 returns `a` with nothing more to check.\n\nThat is the key decision: the loop keeps the gcd fixed while the numbers fall, and 0 is where the answer is read off.',
      code: { view: 'final', lines: [2, 4] },
      values: { 2: '0 != 0 → False', 4: 'return 6' },
      metrics: FINAL_METRICS,
      scene: { entities: scene({ chain: FULL_CHAIN, k: 3, done: true, note: 'gcd(a, 0) = a\nevery number divides 0', noteTone: 'found' }) },
    },
  ],
  trace: {
    title: 'Run Euclid’s algorithm on your own pair',
    inputs: [
      { name: 'a', label: 'a (0 to 99)', kind: 'number', default: '48' },
      { name: 'b', label: 'b (0 to 99)', kind: 'number', default: '18' },
    ],
    presets: [
      { label: 'Coprime', values: { a: '35', b: '18' } },
      { label: 'a < b', values: { a: '18', b: '48' } },
      { label: 'b is 0', values: { a: '7', b: '0' } },
      { label: 'Equal', values: { a: '12', b: '12' } },
      { label: 'One divides', values: { a: '21', b: '7' } },
      { label: 'Fibonacci', values: { a: '55', b: '34' } },
    ],
    run: (values) => {
      const a = values['a'];
      const b = values['b'];
      if (typeof a !== 'number' || typeof b !== 'number') throw new Error('Enter two whole numbers.');
      if (a < 0 || a > 99 || b < 0 || b > 99) throw new Error('Use whole numbers from 0 to 99 so the steps fit on the stage.');
      return traceGcd(a, b);
    },
  },
});
