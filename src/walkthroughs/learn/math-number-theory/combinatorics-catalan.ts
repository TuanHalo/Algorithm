import { arr, defineWalkthrough, link, note, vars } from '../../../lib/walkthrough/helpers';
import type { Entity, Step, Tone } from '../../../lib/walkthrough/types';

const VARS_Y = 150;
const NOTE_X = 220;

interface CatalanState {
  readonly n: number;
  /** The `catalan` list as the code holds it right now. */
  readonly values: readonly number[];
  /** Cell being filled (`catalan[i]`). */
  readonly i?: number;
  /** The split: `catalan[j]` pairs inside the first pair, `catalan[i - 1 - j]` after it. */
  readonly j?: number;
  readonly term?: number;
  /** Cells below this index are finished. */
  readonly final?: boolean;
  /** Before the code introduces `i` and `j`, show only `n`. */
  readonly bare?: boolean;
  readonly note?: string;
  readonly noteTone?: Tone;
}

/** Scene for one moment: the table, the cell being filled, the two factors and the variables. */
function scene(s: CatalanState): Entity[] {
  const tones: Record<number, Tone> = {};
  s.values.forEach((_, c) => {
    if (s.final) tones[c] = 'found';
    else if (s.i !== undefined && c < s.i) tones[c] = 'done';
  });
  const k = s.i !== undefined && s.j !== undefined ? s.i - 1 - s.j : undefined;
  if (s.j !== undefined && k !== undefined) {
    tones[s.j] = 'compare';
    tones[k] = 'compare';
  }
  if (s.i !== undefined && !s.final) tones[s.i] = 'active';

  const entities: Entity[] = [arr('catalan', 0, 0, s.values, { label: 'catalan', tones, codeVar: 'catalan' })];
  if (s.i !== undefined && s.j !== undefined && k !== undefined) {
    const label = s.term === undefined ? undefined : `${s.values[s.j] ?? 0} × ${s.values[k] ?? 0} = ${s.term}`;
    entities.push(link('from-j', { entity: 'catalan', index: s.j, side: 'top' }, { entity: 'catalan', index: s.i, side: 'top' }, { tone: 'compare', ...(label ? { label } : {}) }));
    if (k !== s.j) entities.push(link('from-k', { entity: 'catalan', index: k, side: 'top' }, { entity: 'catalan', index: s.i, side: 'top' }, { tone: 'compare' }));
  }
  entities.push(
    vars(
      'vals',
      0,
      VARS_Y,
      s.bare
        ? [{ name: 'n', value: s.n }]
        : [
            { name: 'n', value: s.n },
            { name: 'i', value: s.i ?? '—', tone: s.i === undefined ? 'muted' : 'default' },
            { name: 'j', value: s.j ?? '—', tone: s.j === undefined ? 'muted' : 'default' },
            { name: 'i - 1 - j', value: k ?? '—', tone: k === undefined ? 'muted' : 'default' },
          ],
      { label: 'variables', width: 180 },
    ),
  );
  if (s.note) entities.push(note('note', NOTE_X, VARS_Y, s.note, { tone: s.noteTone ?? 'note' }));
  return entities;
}

const MAX_N = 9;

/** Runs the Catalan recurrence for any n and records one step per decision (chapter "run", final code). */
function traceCatalan(n: number): Step[] {
  const steps: Step[] = [];
  const values: number[] = Array.from({ length: n + 1 }, () => 0);
  let terms = 0;
  const metrics = (result: string | number = '—'): Record<string, string | number> => ({ terms, result });

  values[0] = 1;
  steps.push({
    chapter: 'run',
    short: 'Table',
    title: `A table of ${n + 1} zeros, with catalan[0] = 1`,
    body: `Line 2 makes \`catalan = [0] * ${n + 1}\`, one cell for each of C₀ … C${subscript(n)}. Line 3 sets \`catalan[0] = 1\`: with zero pairs there is exactly one string, the empty one.`,
    code: { view: 'final', lines: [2, 3] },
    values: { 2: `[0] * ${n + 1}`, 3: 'catalan[0] = 1' },
    metrics: metrics(),
    changes: ['catalan[0] = 1'],
    scene: { entities: scene({ n, values: [...values], bare: true }) },
  });

  for (let i = 1; i <= n; i += 1) {
    steps.push({
      chapter: 'run',
      short: `i = ${i}`,
      title: `Fill catalan[${i}]: strings with ${i} pair${i === 1 ? '' : 's'}`,
      body: `Line 5 sets \`i = ${i}\`. The first \`(\` closes after some \`j\` inner pairs, so \`catalan[${i}]\` is a sum of ${i} product${i === 1 ? '' : 's'}, one for each \`j\` from 0 to ${i - 1}. Every cell it needs is already filled.`,
      code: { view: 'final', lines: [5] },
      values: { 5: `i = ${i}` },
      metrics: metrics(),
      scene: { entities: scene({ n, values: [...values], i }) },
    });
    for (let j = 0; j < i; j += 1) {
      const k = i - 1 - j;
      const a = values[j] ?? 0;
      const c = values[k] ?? 0;
      const before = values[i] ?? 0;
      const term = a * c;
      values[i] = before + term;
      terms += 1;
      steps.push({
        chapter: 'run',
        short: `C${i}: j=${j}`,
        title: `j = ${j}: ${j} pair${j === 1 ? '' : 's'} inside, ${k} after`,
        body: `Line 6 sets \`j = ${j}\`. Line 7 multiplies \`catalan[${j}] × catalan[${k}] = ${a} × ${c} = ${term}\` and adds it: \`catalan[${i}]\` goes from ${before} to **${values[i]}**.`,
        code: { view: 'final', lines: [6, 7] },
        values: { 6: `j = ${j}`, 7: `catalan[${i}] += ${a} × ${c} → ${values[i]}` },
        metrics: metrics(),
        changes: [`catalan[${i}] = ${values[i]}`],
        scene: { entities: scene({ n, values: [...values], i, j, term }) },
      });
    }
  }

  steps.push({
    chapter: 'run',
    short: 'Return',
    title: `Return C₀ … C${subscript(n)}`,
    body: `${n === 0 ? 'Line 5: `range(1, 1)` is empty, so the loop is skipped. ' : `After ${terms} product${terms === 1 ? '' : 's'}, the table is full. `}Line 9 returns **[${values.join(', ')}]**.`,
    code: { view: 'final', lines: n === 0 ? [5, 9] : [9] },
    values: n === 0 ? { 5: 'range(1, 1) → empty', 9: 'return [1]' } : { 9: `return [${values.join(', ')}]` },
    metrics: metrics(`C${subscript(n)} = ${values[n] ?? 1}`),
    scene: { entities: scene({ n, values: [...values], final: true, note: `C${subscript(n)} = ${values[n] ?? 1}`, noteTone: 'found' }) },
  });
  return steps;
}

function subscript(n: number): string {
  const digits = '₀₁₂₃₄₅₆₇₈₉';
  return String(n)
    .split('')
    .map((d) => digits[Number(d)] ?? d)
    .join('');
}

const N = 5;
const RUN = traceCatalan(N);
const byShort = (short: string): number => RUN.findIndex((s) => s.short === short);
/** Scene of the run step with this rail label, so build steps show the moment they describe. */
const at = (short: string): Step['scene'] => RUN[byShort(short)]?.scene ?? { entities: [] };
const startMetrics = { terms: 0, result: '—' } as const;
const FINAL_METRICS = RUN.at(-1)?.metrics ?? startMetrics;
const FILLED = [1, 1, 2, 5, 14, 42] as const;

export default defineWalkthrough({
  id: 'learn/math-number-theory/combinatorics-catalan',
  title: 'Catalan numbers from the split recurrence',
  summary: 'From the idea to the code: count balanced bracket strings by splitting on the first pair, and fill the table of Catalan numbers.',
  minutes: 7,
  code: {
    lang: 'python',
    source: `def catalan_numbers(n: int) -> list[int]:
    catalan = [0] * (n + 1)
    catalan[0] = 1  # the empty string is the only way to use 0 pairs

    for i in range(1, n + 1):
        for j in range(i):
            catalan[i] += catalan[j] * catalan[i - 1 - j]

    return catalan`,
  },
  metrics: [
    { key: 'terms', label: 'Products added' },
    { key: 'result', label: 'Returns' },
  ],
  legend: [
    { tone: 'active', label: 'cell being filled' },
    { tone: 'compare', label: 'the two factors' },
    { tone: 'done', label: 'filled' },
    { tone: 'found', label: 'the finished table' },
  ],
  goals: [
    { text: 'Count balanced brackets without listing them', step: 2 },
    { text: 'Understand where the recurrence comes from', step: 3 },
    { text: 'Build the double loop line by line', step: 4 },
    { text: 'Follow every product of the table', step: 8 },
    { text: 'Know why the second index is i − 1 − j', step: 31 },
  ],
  steps: [
    {
      chapter: 'problem',
      short: 'The brief',
      title: 'How many balanced bracket strings use n pairs?',
      body: 'With 3 pairs there are 5: `((()))`, `(()())`, `(())()`, `()(())`, `()()()`. The same counts appear for binary tree shapes, triangulations of a polygon and non-crossing handshakes.\n\nLine 1 takes `n` and returns the counts for 0, 1, … `n` pairs. We will do `n = 5`.',
      code: { view: 'signature', lines: [1] },
      metrics: startMetrics,
      scene: { entities: scene({ n: N, values: [0, 0, 0, 0, 0, 0], bare: true, note: 'n = 3 → 5 strings:\n((()))  (()())  (())()\n()(())  ()()()' }) },
    },
    {
      chapter: 'idea',
      short: 'List them all',
      title: 'The obvious way: build every string and check it',
      body: 'There are `2 × n` slots, each `(` or `)`, so `4ⁿ` strings. For `n = 3` that is 64 strings to check, and only 5 are balanced; for `n = 15` it is a billion.\n\nThis idea is not in the code below: we count without ever building a string.',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: { entities: scene({ n: N, values: [0, 0, 0, 0, 0, 0], bare: true, note: 'n = 3: 4³ = 64 strings, 5 balanced\nn = 15: over a billion strings', noteTone: 'miss' }) },
    },
    {
      chapter: 'idea',
      short: 'Split on first',
      title: 'Split on the first ( : it closes after j inner pairs',
      body: 'In a balanced string the first `(` closes at some `)`. Between them sit `j` pairs, balanced on their own: **C_j** ways. After it come the other `n − 1 − j` pairs, also balanced: **C_(n−1−j)** ways. The first `(` and its `)` account for the remaining one pair.\n\nSo `C_n = Σ C_j × C_(n−1−j)` over `j = 0 … n − 1`. For n = 3: `1×2 + 1×1 + 2×1 = 5`.',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: {
        entities: scene({
          n: N,
          values: [1, 1, 2, 5, 0, 0],
          bare: true,
          note: 'j=0: ( ) then 2 pairs → C₀ × C₂ = 2\nj=1: ( x ) then 1 pair → C₁ × C₁ = 1\nj=2: ( xx ) then 0   → C₂ × C₀ = 2',
        }),
      },
    },
    {
      chapter: 'build',
      short: 'Table',
      title: 'Lines 2–3: one cell per count, and C₀ = 1',
      body: '`catalan[i]` will hold the count for `i` pairs, so we need `n + 1` cells. With zero pairs there is exactly one string, the empty one, so `catalan[0] = 1`: it is the seed every other cell grows from.',
      code: { view: 'reveal', reveal: [1, 2, 3], lines: [2, 3] },
      metrics: startMetrics,
      changes: ['catalan = [0] * (n + 1)', 'catalan[0] = 1'],
      scene: at('Table'),
    },
    {
      chapter: 'build',
      short: 'Each count',
      title: 'Line 5: fill one cell at a time, from 1 up to n',
      body: '`i` is the number of pairs we are counting now. Each count needs only smaller ones, so going upward guarantees they are already in the table.',
      code: { view: 'reveal', reveal: [1, 2, 3, 5], lines: [5] },
      metrics: startMetrics,
      changes: ['for i in range(1, n + 1)'],
      scene: at('i = 3'),
    },
    {
      chapter: 'build',
      short: 'Split sum',
      title: 'Lines 6–7: add one product for every split j',
      body: 'For each `j` from 0 to `i − 1`: `catalan[j]` counts the strings inside the first pair, `catalan[i - 1 - j]` the strings after it. Their product counts the strings for this split, and `+=` adds up all splits.',
      code: { view: 'reveal', reveal: [1, 2, 3, 5, 6, 7], lines: [6, 7] },
      metrics: { ...startMetrics, terms: 1 },
      changes: ['for j in range(i)', 'catalan[i] += catalan[j] * catalan[i - 1 - j]'],
      scene: at('C3: j=0'),
    },
    {
      chapter: 'build',
      short: 'Return',
      title: 'Line 9: return the whole table',
      body: 'Returning the list gives every count from `C₀` to `Cₙ`, so one call answers all smaller questions too.\n\nThat is the whole function. Now let’s run it.',
      code: { view: 'final', lines: [9] },
      metrics: FINAL_METRICS,
      changes: ['return catalan'],
      scene: RUN.at(-1)?.scene ?? { entities: [] },
    },
    ...RUN,
    {
      chapter: 'why',
      short: 'Recap',
      title: 'n(n+1)/2 products: O(n²) time, O(n) space',
      body: 'Cell `i` takes `i` products, so the table takes `1 + 2 + … + n = n(n+1)/2` of them: **`O(n²)` time** and `O(n)` space for the list. Here `n = 5` took 15.\n\nSwitch to **🧪 Try your own** to fill the table for any `n` up to 9.',
      code: { view: 'final', lines: [5, 6, 7] },
      metrics: FINAL_METRICS,
      scene: { entities: scene({ n: N, values: [...FILLED], final: true, note: 'n = 5 → 15 products\nn = 9 → 45 products\nn(n+1)/2 → O(n²)', noteTone: 'found' }) },
    },
    {
      chapter: 'why',
      short: 'i − 1 − j',
      title: 'Why line 7 pairs catalan[j] with catalan[i − 1 − j]',
      body: 'The first `(` and its matching `)` use up **one** of the `i` pairs. The other `i − 1` pairs split into `j` inside and `i − 1 − j` after, so the two indexes always add up to `i − 1`, and every split is counted exactly once.\n\nThat is the key decision: `i − 1 − j`, not `i − j`. With `i = 3, j = 0` the factors are `C₀ × C₂`.',
      code: { view: 'final', lines: [6, 7] },
      values: { 6: 'j = 0', 7: 'catalan[3] += catalan[0] × catalan[2]' },
      metrics: FINAL_METRICS,
      scene: {
        entities: [
          ...(at('C3: j=0').entities.filter((e) => e.id !== 'note')),
          note('note', NOTE_X, VARS_Y, 'j + (i − 1 − j) = i − 1\nthe first ( ) pair is the missing one\nso 0 + 2 = 3 − 1', { tone: 'found' }),
        ],
      },
    },
  ],
  trace: {
    title: 'Fill the Catalan table for your own n',
    inputs: [{ name: 'n', label: `n (0 to ${MAX_N})`, kind: 'number', default: '5' }],
    presets: [
      { label: 'n = 0', values: { n: '0' } },
      { label: 'n = 1', values: { n: '1' } },
      { label: 'Three pairs', values: { n: '3' } },
      { label: 'Biggest', values: { n: String(MAX_N) } },
    ],
    run: (values) => {
      const n = values['n'];
      if (typeof n !== 'number') throw new Error('Enter a single whole number.');
      if (n < 0 || n > MAX_N) throw new Error(`Use a whole number from 0 to ${MAX_N} so the table fits on the stage.`);
      return traceCatalan(n);
    },
  },
});
