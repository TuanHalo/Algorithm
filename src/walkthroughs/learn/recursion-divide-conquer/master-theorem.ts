import { defineWalkthrough, map, note, vars } from '../../../lib/walkthrough/helpers';
import type { Entity, ScalarValue, Step, Tone } from '../../../lib/walkthrough/types';

/**
 * The recursion tree of T(n) = a·T(n/b) + n^c, summarised one row per level:
 * level k has a^k calls, each on n / b^k items and costing (n / b^k)^c.
 * The picture always uses n = b^LEVELS, so the leaves (size 1) sit on level LEVELS.
 */
const LEVELS = 4;
const SIDE_X = 460;
const NOTE_Y = 230;
const EPS = 1e-9;

/** Prints a float without noise: 1, 1.585, 2.807. */
const fmt = (x: number): string => String(Number(x.toFixed(3)));

interface Level {
  readonly size: number;
  readonly count: number;
  readonly cost: number;
  readonly work: number;
}

/** The work on each level of the tree for T(n) = a·T(n/b) + n^c with n = b^LEVELS. */
function levelsOf(a: number, b: number, c: number): Level[] {
  return Array.from({ length: LEVELS + 1 }, (_, k) => {
    const size = b ** (LEVELS - k);
    const count = a ** k;
    const cost = size ** c;
    return { size, count, cost, work: count * cost };
  });
}

type RowTone = (k: number) => Tone | undefined;

interface MasterState {
  readonly a: number;
  readonly b: number;
  readonly c: number;
  /** Shown once `crit = math.log(a, b)` has run. */
  readonly crit?: string;
  /** Draw the work-per-level table (off for the problem step and the float pitfall). */
  readonly table?: boolean;
  readonly rowTone?: RowTone;
  readonly note?: string;
  readonly noteTone?: Tone;
}

/** Scene: the work per level on the left, a, b, c and crit on the right, a note under the table. */
function scene(s: MasterState): Entity[] {
  const entities: Entity[] = [];
  if (s.table) {
    const rows = levelsOf(s.a, s.b, s.c);
    entities.push(
      map(
        'levels',
        0,
        0,
        `work per level (n = ${s.b ** LEVELS})`,
        rows.map((r, k) => ({
          key: k === 0 ? 'level 0: the root' : k === LEVELS ? `level ${k}: the leaves` : `level ${k}`,
          value: `${r.count} × ${r.cost} = ${r.work}`,
          ...(s.rowTone?.(k) ? { tone: s.rowTone(k) as Tone } : {}),
        })),
        { width: 400 },
      ),
    );
  }
  const row = (name: string, value: ScalarValue | undefined): { name: string; value: ScalarValue; tone: Tone } => ({
    name,
    value: value ?? '—',
    tone: value === undefined ? 'muted' : 'default',
  });
  entities.push(vars('vals', s.table ? SIDE_X : 0, 0, [row('a', s.a), row('b', s.b), row('c', s.c), row('crit', s.crit)], { label: 'T(n) = a·T(n/b) + n^c', width: 230 }));
  if (s.note) entities.push(note('note', 0, s.table ? NOTE_Y : 190, s.note, { tone: s.noteTone ?? 'note' }));
  return entities;
}

/** Which levels carry the work, for the verdict step. */
const dominant = (kase: 1 | 2 | 3): RowTone => (k) => {
  if (kase === 2) return 'found';
  if (kase === 1) return k === LEVELS ? 'found' : 'muted';
  return k === 0 ? 'found' : 'muted';
};

/** The two ends the comparison is really about: the root's work and the leaves' work. */
const ends: RowTone = (k) => (k === 0 || k === LEVELS ? 'compare' : undefined);

/**
 * Runs `solve_master_theorem` on any a, b, c and records one step per decision:
 * the critical exponent, each comparison, and the returned case.
 */
function traceMaster(a: number, b: number, c: number): Step[] {
  const steps: Step[] = [];
  const rows = levelsOf(a, b, c);
  const rootWork = rows[0]?.work ?? 0;
  const leafWork = rows[LEVELS]?.work ?? 0;
  const crit = Math.log(a) / Math.log(b);
  const shown = fmt(crit);
  const base = { a, b, c, table: true } as const;
  const ratio = fmt(a / b ** c);
  const emit = (e: { short: string; title: string; body: string; lines: readonly number[]; values: Readonly<Record<number, string>>; state: Omit<MasterState, 'a' | 'b' | 'c' | 'table'>; result?: string }): void => {
    steps.push({
      chapter: 'run',
      short: e.short,
      title: e.title,
      body: e.body,
      code: { view: 'final', lines: e.lines },
      values: e.values,
      metrics: { rootWork, leafWork, result: e.result ?? '—' },
      scene: { entities: scene({ ...base, ...e.state }) },
    });
  };

  emit({
    short: 'Critical exp.',
    title: `crit = log_${b}(${a}) = ${shown}`,
    body: `Line 6 asks: to what power must \`b = ${b}\` be raised to get \`a = ${a}\`? That is \`crit = math.log(${a}, ${b}) = ${shown}\`. The tree has \`n^crit\` leaves, so the leaves cost about \`n^${shown}\` in total.\n\nThe root costs \`n^c = n^${c}\`. The rest of the code compares these two.`,
    lines: [6],
    values: { 6: `crit = math.log(${a}, ${b}) = ${shown}` },
    state: { crit: shown, rowTone: ends },
  });

  const small = c < crit - EPS;
  emit({
    short: 'Leaves win?',
    title: small ? `${c} < ${shown}: the leaves win` : `${c} < ${shown}? No`,
    body: small
      ? `Line 8: \`${c} < ${shown} - 1e-9\` is true. Each level's work is \`${a} / ${b}^${c} = ${ratio}\` times the one above, so it **grows** toward the leaves and the bottom row carries the total.`
      : `Line 8: \`${c} < ${shown} - 1e-9\` is false, so the leaves do not dominate. Each level's work is \`${a} / ${b}^${c} = ${ratio}\` times the one above, which is not more than 1.`,
    lines: [8],
    values: { 8: `${c} < ${shown} - 1e-9 → ${small ? 'True' : 'False'}` },
    state: { crit: shown, rowTone: ends },
  });
  if (small) {
    emit({
      short: 'Case 1',
      title: `Case 1: Theta(n^${shown})`,
      body: `Line 9 returns **Case 1**: the work is the leaves' \`n^${shown}\`. Here that is ${leafWork} against ${rootWork} at the root.`,
      lines: [9],
      values: { 9: `return "Case 1: Theta(n^${shown})"` },
      state: { crit: shown, rowTone: dominant(1), note: `leaves ${leafWork} > root ${rootWork}\ntotal ≈ the leaves: n^${shown}`, noteTone: 'found' },
      result: 'Case 1',
    });
    return steps;
  }

  const big = c > crit + EPS;
  emit({
    short: 'Root wins?',
    title: big ? `${c} > ${shown}: the root wins` : `${c} > ${shown}? No`,
    body: big
      ? `Line 10: \`${c} > ${shown} + 1e-9\` is true. Each level's work is \`${ratio}\` times the one above, so it **shrinks** toward the leaves and the root row carries the total.`
      : `Line 10: \`${c} > ${shown} + 1e-9\` is false too, so \`c\` equals \`crit\` within the tolerance. Every level's work is \`${ratio}\` times the one above: exactly the same.`,
    lines: [10],
    values: { 10: `${c} > ${shown} + 1e-9 → ${big ? 'True' : 'False'}` },
    state: { crit: shown, rowTone: ends },
  });
  if (big) {
    emit({
      short: 'Case 3',
      title: `Case 3: Theta(n^${c})`,
      body: `Line 11 returns **Case 3**: the work is the root's \`n^${c}\`. Here that is ${rootWork} against ${leafWork} at the leaves.`,
      lines: [11],
      values: { 11: `return "Case 3: Theta(n^${c})"` },
      state: { crit: shown, rowTone: dominant(3), note: `root ${rootWork} > leaves ${leafWork}\ntotal ≈ the root: n^${c}`, noteTone: 'found' },
      result: 'Case 3',
    });
    return steps;
  }
  emit({
    short: 'Case 2',
    title: `Case 2: Theta(n^${c} log n)`,
    body: `Line 12 returns **Case 2**: every level does the same work, ${rootWork}, and there are \`log n\` levels, so the total is \`n^${c} log n\`.`,
    lines: [12],
    values: { 12: `return "Case 2: Theta(n^${c} log n)"` },
    state: { crit: shown, rowTone: dominant(2), note: `every level: ${rootWork}\n${LEVELS + 1} levels → n^${c} · log n`, noteTone: 'found' },
    result: 'Case 2',
  });
  return steps;
}

// Story input: merge sort, T(n) = 2·T(n/2) + n.
const A = 2;
const B = 2;
const C = 1;
const RUN = traceMaster(A, B, C);
/** Scene of run step n (0-based), so build steps show the moment they describe. */
const at = (n: number): Step['scene'] => RUN[n]?.scene ?? { entities: [] };
const lastOf = (steps: readonly Step[]): Step['scene'] => steps.at(-1)?.scene ?? { entities: [] };
const startMetrics = { rootWork: 16, leafWork: 16, result: '—' } as const;
const FINAL_METRICS = RUN.at(-1)?.metrics ?? startMetrics;
/** Story steps before the run chapter: problem 1, idea 2, build 4. */
const RUN_START = 7;

const CASE1 = traceMaster(4, 2, 1);
const CASE3 = traceMaster(2, 2, 2);

export default defineWalkthrough({
  id: 'learn/recursion-divide-conquer/master-theorem',
  title: 'The Master Theorem, who does the work',
  summary: 'From the idea to the code: compare the work at the root of a recursion tree with the work at its leaves to read off the running time of a divide-and-conquer recurrence.',
  minutes: 8,
  code: {
    lang: 'python',
    source: `import math


def solve_master_theorem(a: int, b: int, c: int) -> str:
    # Critical exponent: the recursion tree has n^crit leaves
    crit = math.log(a, b)

    if c < crit - 1e-9:
        return f"Case 1: Theta(n^{crit:.2f})"  # leaves dominate
    if c > crit + 1e-9:
        return f"Case 3: Theta(n^{c})"  # root dominates
    return f"Case 2: Theta(n^{c} log n)"  # every level equal`,
  },
  metrics: [
    { key: 'rootWork', label: 'Root work' },
    { key: 'leafWork', label: 'Leaf work' },
    { key: 'result', label: 'Returns' },
  ],
  legend: [
    { tone: 'compare', label: 'the root and the leaves being compared' },
    { tone: 'found', label: 'the level(s) that carry the total' },
    { tone: 'muted', label: 'levels that do not decide it' },
  ],
  goals: [
    { text: 'Read work per level off the recursion tree', step: 2 },
    { text: 'Compare the root with the leaves using crit', step: 3 },
    { text: 'Write the three cases', step: 5 },
    { text: 'Follow every comparison to the verdict', step: RUN_START + 1 },
    { text: 'See why equality needs a tolerance', step: RUN_START + RUN.length + 2 },
  ],
  steps: [
    {
      chapter: 'problem',
      short: 'The brief',
      title: 'How fast is T(n) = 2·T(n/2) + n?',
      body: 'Picture a company: the CEO splits a job among `a` managers, each handles `n/b` of it, and every layer spends `n^c` coordinating. Who does most of the work: the frontline leaves, every layer equally, or the CEO?\n\nLine 4 takes `a`, `b` and `c` and names the bound. Here that is merge sort: `a = 2`, `b = 2`, `c = 1`.',
      code: { view: 'signature', lines: [4] },
      metrics: startMetrics,
      scene: { entities: scene({ a: A, b: B, c: C, note: 'T(n) = 2·T(n/2) + n\n2 calls on half the input,\nplus n to split and combine' }) },
    },
    {
      chapter: 'idea',
      short: 'Per level',
      title: 'Add up the work one level at a time',
      body: 'Draw the recursion tree. Level `k` has `a^k` calls, each on `n / b^k` items and costing `(n / b^k)^c`. For merge sort that is `2^k × (16 / 2^k) = 16` on every level.\n\nSo the total is the sum of a column of numbers. The question is which rows are big.',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: { entities: scene({ a: A, b: B, c: C, table: true, rowTone: () => 'compare', note: 'every level costs the same, 16\n5 levels → n · log n' }) },
    },
    {
      chapter: 'idea',
      short: 'Root vs leaves',
      title: 'A bigger a makes the leaves win; a bigger c, the root',
      body: 'Try `a = 4`: now the work per level **doubles** going down, and the leaves hold most of it. The tree has `a^(log_b n) = n^(log_b a)` leaves, and `log_b a` is the **critical exponent** `crit`.\n\nSo compare the root\'s `n^c` with the leaves\' `n^crit`: comparing `c` with `crit` is the whole test.',
      code: { view: 'signature' },
      metrics: { rootWork: 16, leafWork: 256, result: '—' },
      scene: { entities: scene({ a: 4, b: 2, c: 1, crit: '2', table: true, rowTone: ends, note: 'a = 4: 16, 32, 64, 128, 256\nleaves: 4^4 = 256 = n^crit, crit = 2' }) },
    },
    {
      chapter: 'build',
      short: 'Critical exp.',
      title: 'Lines 5–6: the exponent of the leaves',
      body: 'Line 6 computes `crit = math.log(a, b)`: the power to which `b` is raised to get `a`. The tree has `n^crit` leaves, each costing `O(1)`, so `crit` is the exponent of the leaves\' total work.',
      code: { view: 'reveal', reveal: [1, 4, 5, 6], lines: [6] },
      metrics: RUN[0]?.metrics ?? startMetrics,
      changes: ['crit = math.log(a, b)'],
      scene: at(0),
    },
    {
      chapter: 'build',
      short: 'Case 1',
      title: 'Lines 8–9: c < crit, the leaves dominate',
      body: 'If `c` is below `crit`, the root is cheap next to the leaves, so line 9 returns `n^crit`. The `1e-9` keeps a rounding error from counting as "smaller"; the last step explains why.',
      code: { view: 'reveal', reveal: [1, 4, 5, 6, 8, 9], lines: [8, 9] },
      metrics: CASE1.at(-1)?.metrics ?? startMetrics,
      changes: ['if c < crit - 1e-9: return n^crit'],
      scene: lastOf(CASE1),
    },
    {
      chapter: 'build',
      short: 'Case 3',
      title: 'Lines 10–11: c > crit, the root dominates',
      body: 'If `c` is above `crit`, each level costs less than the one above, so the root decides and line 11 returns `n^c`.',
      code: { view: 'reveal', reveal: [1, 4, 5, 6, 8, 9, 10, 11], lines: [10, 11] },
      metrics: CASE3.at(-1)?.metrics ?? startMetrics,
      changes: ['if c > crit + 1e-9: return n^c'],
      scene: lastOf(CASE3),
    },
    {
      chapter: 'build',
      short: 'Case 2',
      title: 'Line 12: otherwise every level is equal',
      body: 'If neither check fired, `c` equals `crit`: every level does the same work, and `log n` levels add a `log n` factor. Line 12 returns `n^c log n`.\n\nThat’s the whole function. Now let’s run it on merge sort.',
      code: { view: 'final', lines: [12] },
      metrics: FINAL_METRICS,
      scene: lastOf(RUN),
    },
    ...RUN,
    {
      chapter: 'why',
      short: 'Recap',
      title: 'One comparison decides the whole recurrence',
      body: 'The function does a constant amount of work: **`O(1)` time and space**. It is a shortcut for summing the whole tree: compare `c` with `crit`, and the winner (leaves, every level, or root) sets the running time.\n\nIt only fits recurrences of the form `a·T(n/b) + n^c`; unequal splits like `T(n/3) + T(2n/3)` need other tools.',
      code: { view: 'final', lines: [8, 10, 12] },
      metrics: FINAL_METRICS,
      scene: {
        entities: [
          map(
            'levels',
            0,
            0,
            'who wins',
            [
              { key: 'c < crit', value: 'leaves: n^crit', tone: 'compare' },
              { key: 'c = crit', value: 'every level: n^c log n', tone: 'found' },
              { key: 'c > crit', value: 'root: n^c', tone: 'compare' },
            ],
            { width: 400 },
          ),
          vars('vals', SIDE_X, 0, [{ name: 'a', value: A }, { name: 'b', value: B }, { name: 'c', value: C }, { name: 'crit', value: '1' }], { label: 'T(n) = a·T(n/b) + n^c', width: 230 }),
          note('note', 0, 150, 'merge sort: c = crit = 1\n→ Case 2, n · log n', { tone: 'found' }),
        ],
      },
    },
    {
      chapter: 'why',
      short: 'Tolerance',
      title: 'Why the checks use 1e-9 instead of ==',
      body: 'Logarithms are floats. `math.log(125, 5)` should be exactly 3, but Python gives `3.0000000000000004`. With a plain `c == crit` that would miss Case 2 and wrongly call it Case 3.\n\nThat is the key decision: compare within a tiny tolerance, so rounding noise never changes the case.',
      code: { view: 'final', lines: [8, 10] },
      values: { 6: 'crit = 3.0000000000000004', 8: '3 < crit - 1e-9 → False', 10: '3 > crit + 1e-9 → False' },
      metrics: { rootWork: '—', leafWork: '—', result: 'Case 2' },
      scene: { entities: scene({ a: 125, b: 5, c: 3, crit: '3.0000000000000004', note: '3 == 3.0000000000000004 → False\n"==" misses Case 2 (wrong)\nwithin 1e-9 finds it (right)', noteTone: 'miss' }) },
    },
  ],
  trace: {
    title: 'Solve your own recurrence T(n) = a·T(n/b) + n^c',
    inputs: [
      { name: 'a', label: 'a: subproblems (1 to 8)', kind: 'number', default: '2' },
      { name: 'b', label: 'b: shrink factor (2 to 4)', kind: 'number', default: '2' },
      { name: 'c', label: 'c: exponent of the combine cost (0 to 4)', kind: 'number', default: '1' },
    ],
    presets: [
      { label: 'Merge sort', values: { a: '2', b: '2', c: '1' } },
      { label: 'Binary search', values: { a: '1', b: '2', c: '0' } },
      { label: 'Karatsuba', values: { a: '3', b: '2', c: '1' } },
      { label: 'Strassen', values: { a: '7', b: '2', c: '2' } },
      { label: 'Root dominates', values: { a: '4', b: '2', c: '3' } },
    ],
    run: (values) => {
      const a = values['a'];
      const b = values['b'];
      const c = values['c'];
      if (typeof a !== 'number' || typeof b !== 'number' || typeof c !== 'number') throw new Error('Enter a, b and c as single whole numbers.');
      if (a < 1 || a > 8) throw new Error('a must be from 1 to 8 (at least one subproblem).');
      if (b < 2 || b > 4) throw new Error('b must be from 2 to 4 (the input has to shrink: b > 1).');
      if (c < 0 || c > 4) throw new Error('c must be from 0 to 4.');
      return traceMaster(a, b, c);
    },
  },
});
