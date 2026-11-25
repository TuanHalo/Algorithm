import { arr, defineWalkthrough, link, map, note, vars } from '../../../lib/walkthrough/helpers';
import { tableBesideArray } from '../../../lib/walkthrough/layout';
import type { Entity, MapEntry, ScalarValue, Step, Tone } from '../../../lib/walkthrough/types';

/**
 * The 2D table dp[item][capacity] drawn as stacked rows (`row-k`, y = k × ROW_Y):
 * row 0 is "no items", row k is "after item k". The code keeps one row, `dp`:
 * it sits on the row of the item being packed and slides down for the next
 * item, leaving a copy of the previous row above it. Both reads of an update
 * come from that row above: "skip" (same capacity) and "take" (w − wt).
 */
const ROW_Y = 130;

type Phase = 'bare' | 'init' | 'item' | 'relax' | 'done';

interface SackState {
  readonly weights: readonly number[];
  readonly values: readonly number[];
  readonly cap: number;
  readonly phase: Phase;
  /** Item being packed (0-based); dp sits on row item + 1. */
  readonly item?: number;
  readonly w?: number;
  readonly dp?: readonly number[];
  /** Finished rows above dp, row 0 (no items) first. */
  readonly above?: readonly (readonly number[])[];
  /** Which read won the max in a relax step. */
  readonly take?: boolean;
  /** A whole table instead of dp (idea chapter). */
  readonly table?: readonly (readonly ScalarValue[])[];
  readonly tableTones?: Readonly<Record<string, Tone>>;
  /** In the idea table, the cell [row, w] to explain with skip / take arcs. */
  readonly focus?: readonly [number, number];
  readonly note?: string;
  readonly noteTone?: Tone;
  readonly bare?: boolean;
}

const rowId = (k: number): string => `row-${k}`;

/** Scene: the rows, the dp row, the skip / take reads, the variables and the items. */
function scene(s: SackState): Entity[] {
  const { weights, values, cap, phase, item, w } = s;
  const rows = weights.length + 1;
  const label = (k: number): string => (k === 0 ? 'no items' : `item ${k}`);
  const entities: Entity[] = [];
  const blank = (): string[] => Array.from({ length: cap + 1 }, () => '?');
  const dpRow = item !== undefined ? item + 1 : undefined;
  const wt = item !== undefined ? (weights[item] ?? 0) : 0;
  const val = item !== undefined ? (values[item] ?? 0) : 0;

  for (let k = 0; k < rows; k += 1) {
    const y = k * ROW_Y;
    if (s.table) {
      const tones: Record<number, Tone> = {};
      for (let j = 0; j <= cap; j += 1) {
        const t = s.tableTones?.[`${k},${j}`];
        if (t) tones[j] = t;
      }
      entities.push(arr(rowId(k), 0, y, s.table[k] ?? blank(), { label: label(k), tones }));
      continue;
    }
    if (dpRow !== undefined && k === dpRow) continue;
    const old = s.above?.[k];
    const tones: Record<number, Tone> = {};
    if (old) {
      old.forEach((_, j) => (tones[j] = 'done'));
      if (phase === 'relax' && w !== undefined && dpRow !== undefined && k === dpRow - 1) {
        tones[w] = 'compare';
        tones[w - wt] = 'compare';
      }
      entities.push(arr(rowId(k), 0, y, old, { label: label(k), tones }));
    } else {
      for (let j = 0; j <= cap; j += 1) tones[j] = 'muted';
      entities.push(arr(rowId(k), 0, y, blank(), { label: label(k), tones }));
    }
  }

  if (s.dp && dpRow !== undefined) {
    const tones: Record<number, Tone> = {};
    s.dp.forEach((_, j) => {
      if (phase === 'init') tones[j] = 'done';
      else if (phase === 'item') tones[j] = 'muted';
      else if (phase === 'relax' && w !== undefined) tones[j] = j > w ? 'done' : j === w ? 'active' : 'muted';
      else tones[j] = 'done';
    });
    if (phase === 'done') tones[cap] = 'found';
    entities.push(arr('dp', 0, dpRow * ROW_Y, s.dp, { label: 'dp', tones, codeVar: 'dp' }));
    if (phase === 'relax' && w !== undefined && dpRow > 0) {
      const up = rowId(dpRow - 1);
      entities.push(link('skip', { entity: up, index: w, side: 'bottom' }, { entity: 'dp', index: w, side: 'top' }, { tone: s.take ? 'miss' : 'found', dashed: s.take, flow: !s.take, label: 'skip' }));
      entities.push(link('take', { entity: up, index: w - wt, side: 'bottom' }, { entity: 'dp', index: w, side: 'top' }, { tone: s.take ? 'found' : 'miss', dashed: !s.take, flow: s.take, label: `take +${val}` }));
    }
  }

  if (s.table && s.focus) {
    const [fr, fw] = s.focus;
    const fwt = weights[fr - 1] ?? 0;
    const fval = values[fr - 1] ?? 0;
    entities.push(link('skip', { entity: rowId(fr - 1), index: fw, side: 'bottom' }, { entity: rowId(fr), index: fw, side: 'top' }, { tone: 'compare', label: 'skip' }));
    entities.push(link('take', { entity: rowId(fr - 1), index: fw - fwt, side: 'bottom' }, { entity: rowId(fr), index: fw, side: 'top' }, { tone: 'compare', label: `take +${fval}` }));
  }

  const right = tableBesideArray(cap + 1, 4);
  if (!s.bare) {
    const dash = '—';
    const holding = item !== undefined && item >= 0 && phase !== 'done';
    entities.push(
      vars(
        'vals',
        right,
        0,
        [
          { name: 'cap', value: cap },
          { name: 'wt', value: holding ? wt : dash, tone: holding ? 'default' : 'muted' },
          { name: 'val', value: holding ? val : dash, tone: holding ? 'default' : 'muted' },
          { name: 'w', value: w ?? dash, tone: w === undefined ? 'muted' : 'default' },
        ],
        { label: 'variables', width: 150 },
      ),
    );
  }
  const entries: MapEntry[] = weights.map((wgt, k) => ({
    key: `item ${k + 1}`,
    value: `wt ${wgt}, val ${values[k] ?? 0}`,
    tone: item === k && phase !== 'done' ? 'active' : item !== undefined && k < item ? 'done' : 'default',
  }));
  entities.push(map('items', right, 300, 'items', entries, { width: 210 }));
  if (s.note) entities.push(note('note', 0, rows * ROW_Y + 30, s.note, { tone: s.noteTone ?? 'note' }));
  return entities;
}

/** Runs knapsack_01 and records one step per decision (chapter "run", final code). */
function traceSack(weights: readonly number[], values: readonly number[], cap: number): Step[] {
  const steps: Step[] = [];
  let takes = 0;
  let checks = 0;
  const metrics = (result: ScalarValue = '—'): Record<string, ScalarValue> => ({ checks, takes, result });
  const dp = Array.from({ length: cap + 1 }, () => 0);
  const above: number[][] = [];
  const base = { weights, values, cap };

  steps.push({
    chapter: 'run',
    short: 'No items',
    title: `${cap + 1} capacities, value 0 each`,
    body: `Line 2 builds \`dp = [0] * ${cap + 1}\`: with no items packed yet, every capacity 0…${cap} is worth 0.`,
    code: { view: 'final', lines: [2] },
    values: { 2: `dp = [${dp.join(', ')}]` },
    metrics: metrics(),
    scene: { entities: scene({ ...base, phase: 'init', item: -1, dp: [...dp] }) },
  });

  weights.forEach((wt, i) => {
    const val = values[i] ?? 0;
    above.push([...dp]);
    const fits = wt <= cap;
    steps.push({
      chapter: 'run',
      short: `Item ${i + 1}`,
      title: `Item ${i + 1}: weight ${wt}, value ${val}`,
      body: fits
        ? `Line 3 takes \`wt = ${wt}\`, \`val = ${val}\`. \`dp\` still holds the best values without it (the row above). Capacities below ${wt} can’t hold it, so they keep their values.`
        : `Line 3 takes \`wt = ${wt}\`, \`val = ${val}\`. It’s heavier than \`cap = ${cap}\`, so line 4’s range is empty and nothing changes.`,
      code: { view: 'final', lines: [3] },
      values: { 3: `wt, val = ${wt}, ${val}` },
      metrics: metrics(),
      scene: { entities: scene({ ...base, phase: 'item', item: i, dp: [...dp], above: above.map((r) => [...r]) }) },
    });
    for (let w = cap; w >= wt; w -= 1) {
      const skip = dp[w] ?? 0;
      const rest = dp[w - wt] ?? 0;
      const takeValue = val + rest;
      const take = takeValue > skip;
      checks += 1;
      if (take) {
        dp[w] = takeValue;
        takes += 1;
      }
      steps.push({
        chapter: 'run',
        short: `w = ${w}`,
        title: take ? `Capacity ${w}: take it, ${takeValue} > ${skip}` : `Capacity ${w}: skip it, ${takeValue} ≤ ${skip}`,
        body: `Line 4 sets \`w = ${w}\`. Line 5 compares **skip** (\`dp[${w}] = ${skip}\`) with **take**: \`${val} + dp[${w} − ${wt}] = ${val} + ${rest} = ${takeValue}\`. ${take ? `Taking wins: \`dp[${w}] = ${takeValue}\`.` : `Taking isn’t better, so \`dp[${w}]\` stays ${skip}.`}`,
        code: { view: 'final', lines: [4, 5] },
        values: { 4: `w = ${w}`, 5: `max(${skip}, ${val} + ${rest}) = ${Math.max(skip, takeValue)}` },
        metrics: metrics(),
        scene: { entities: scene({ ...base, phase: 'relax', item: i, w, dp: [...dp], above: above.map((r) => [...r]), take }) },
      });
    }
  });

  const answer = dp[cap] ?? 0;
  steps.push({
    chapter: 'run',
    short: 'Return',
    title: `Best value within ${cap}: ${answer}`,
    body: `Every item has had its turn. Line 6 returns \`dp[${cap}]\` = **${answer}**, the best value that fits in capacity ${cap}.`,
    code: { view: 'final', lines: [6] },
    values: { 6: `return ${answer}` },
    metrics: metrics(answer),
    scene: { entities: scene({ ...base, phase: 'done', item: weights.length - 1, dp: [...dp], above: above.map((r) => [...r]) }) },
  });
  return steps;
}

/** The full 2D table dp[k][w]. */
function fullTable(weights: readonly number[], values: readonly number[], cap: number): number[][] {
  const t: number[][] = [Array.from({ length: cap + 1 }, () => 0)];
  weights.forEach((wt, i) => {
    const prev = t[i] ?? [];
    t.push(prev.map((v, w) => (w >= wt ? Math.max(v, (values[i] ?? 0) + (prev[w - wt] ?? 0)) : v)));
  });
  return t;
}

const WEIGHTS = [1, 3, 4] as const;
const VALUES = [15, 20, 30] as const;
const CAP = 4;
const BASE = { weights: WEIGHTS, values: VALUES, cap: CAP } as const;
const RUN = traceSack(WEIGHTS, VALUES, CAP);
const startMetrics = { checks: 0, takes: 0, result: '—' } as const;
const FINAL_METRICS = RUN.at(-1)?.metrics ?? startMetrics;
const BUILD_END = 8;
const TABLE = fullTable(WEIGHTS, VALUES, CAP);
const QUESTIONS = TABLE.map((row) => row.map(() => '?'));

/** Scene of run step k (0-based), so build steps show the moment they describe. */
function at(k: number): Step['scene'] {
  return RUN[k]?.scene ?? { entities: [] };
}

export default defineWalkthrough({
  id: 'learn/dynamic-programming/zero-one-knapsack',
  title: '0/1 Knapsack, skip or take',
  summary: 'From the idea to the code: pack the most value under a weight limit, deciding for every item and every capacity whether taking the item beats leaving it.',
  minutes: 9,
  code: {
    lang: 'python',
    source: `def knapsack_01(weights: list[int], values: list[int], cap: int) -> int:
    dp = [0] * (cap + 1)
    for wt, val in zip(weights, values):
        for w in range(cap, wt - 1, -1):  # Reverse prevents reusing the same item
            dp[w] = max(dp[w], val + dp[w - wt])
    return dp[cap]`,
  },
  snapshots: {
    brute: `def knapsack_01(weights: list[int], values: list[int], cap: int) -> int:
    def best(i: int, room: int) -> int:
        if i == len(weights):
            return 0  # No items left to decide
        skip = best(i + 1, room)
        if weights[i] > room:
            return skip
        return max(skip, values[i] + best(i + 1, room - weights[i]))
    return best(0, cap)`,
  },
  metrics: [
    { key: 'checks', label: 'Checks' },
    { key: 'takes', label: 'Takes' },
    { key: 'result', label: 'Returns' },
  ],
  legend: [
    { tone: 'active', label: 'dp[w] being decided' },
    { tone: 'compare', label: 'skip / take reads' },
    { tone: 'done', label: 'decided' },
    { tone: 'muted', label: 'unchanged / not yet' },
    { tone: 'miss', label: 'losing choice' },
    { tone: 'found', label: 'winning choice / answer' },
  ],
  goals: [
    { text: 'See why trying every subset is 2ⁿ', step: 2 },
    { text: 'Choose skip or take for every capacity', step: 3 },
    { text: 'Watch a take beat a skip', step: BUILD_END + 3 },
    { text: 'Know why capacities go downwards', step: BUILD_END + RUN.length + 2 },
  ],
  steps: [
    {
      chapter: 'problem',
      short: 'The brief',
      title: 'Pack the most value that fits',
      body: 'Each item has a weight and a value, and each can be packed **at most once** (that’s the “0/1”). Line 1 returns the biggest total value whose weight stays within `cap`.\n\nHere items (1, 15), (3, 20), (4, 30) and `cap = 4`: the answer is **35** (weights 1 + 3).',
      code: { view: 'signature', lines: [1] },
      metrics: startMetrics,
      scene: { entities: scene({ ...BASE, phase: 'bare', bare: true, table: QUESTIONS, note: 'cap = 4\nitems 1 + 2: weight 4, value 35 ✓\nitem 3 alone: weight 4, value 30' }) },
    },
    {
      chapter: 'idea',
      short: 'Every subset',
      title: 'The obvious way: skip or take, recursively',
      body: 'Lines 5–8 try both choices for every item: `n` items give **2ⁿ** subsets, a million for 20 items. Yet the only things that matter are **which item is next** and **how much room is left**.\n\nThat’s just `(n + 1) × (cap + 1)` different questions, here the 20 cells of this table, each asked again and again.',
      code: { view: 'snapshot', id: 'brute', lines: [5, 8] },
      metrics: startMetrics,
      scene: { entities: scene({ ...BASE, phase: 'bare', bare: true, table: QUESTIONS, note: 'row = items decided, column = room\n20 different questions\nn = 40 items: 10¹² subsets', noteTone: 'miss' }) },
    },
    {
      chapter: 'idea',
      short: 'Skip or take',
      title: 'Each cell: the better of skip and take',
      body: 'Let `dp[k][w]` be the best value using the first `k` items within weight `w`. Item k is either **skipped**, giving `dp[k − 1][w]`, or **taken**, giving its value plus the best of the rest in `w − wt`: **dp[k][w] = max(dp[k − 1][w], val + dp[k − 1][w − wt])**.\n\nBoth reads come from the row above, so rows are filled top to bottom.',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: {
        entities: scene({
          ...BASE,
          phase: 'bare',
          bare: true,
          table: TABLE,
          focus: [2, 4],
          tableTones: { '1,4': 'compare', '1,1': 'compare', '2,4': 'active' },
          note: 'item 2 (wt 3, val 20), w = 4:\nskip: 15, take: 20 + dp[1][1] = 35\nmax → 35',
        }),
      },
    },
    {
      chapter: 'idea',
      short: 'One row',
      title: 'Keep one row, and fill it from the right',
      body: 'Row k only reads row k − 1, so one list `dp` is enough if it is updated in place. Going from the **biggest** capacity down, `dp[w − wt]` hasn’t been touched yet this round: it still holds the row above.\n\nSo `dp[w] = max(dp[w], val + dp[w − wt])` does the whole recurrence.',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: { entities: scene({ ...BASE, phase: 'relax', item: 1, w: 4, dp: [0, 15, 15, 15, 35], above: [TABLE[0] ?? [], TABLE[1] ?? []], take: true, bare: true, note: 'w goes 4, 3, …: dp[1] is still old\nso “take” reads the row above' }) },
    },
    {
      chapter: 'build',
      short: 'Empty sack',
      title: 'Line 2: no items, no value',
      body: 'Before any item, every capacity 0…`cap` is worth 0: `dp = [0] * (cap + 1)`.',
      code: { view: 'reveal', reveal: [1, 2], lines: [2] },
      metrics: startMetrics,
      changes: ['dp = [0] * (cap + 1)'],
      scene: at(0),
    },
    {
      chapter: 'build',
      short: 'Loops',
      title: 'Lines 3–4: each item once, capacities downwards',
      body: 'Line 3 hands out the items one by one. Line 4 walks the capacities from `cap` down to `wt`; smaller ones can’t hold the item and are left alone.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4], lines: [3, 4] },
      metrics: startMetrics,
      changes: ['for wt, val in zip(weights, values)', 'for w in range(cap, wt - 1, -1)'],
      scene: at(1),
    },
    {
      chapter: 'build',
      short: 'Max',
      title: 'Line 5: skip or take',
      body: 'Line 5 is the recurrence on one row: keep `dp[w]` (skip), or take the item and add the best of the remaining room, `val + dp[w − wt]`.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5], lines: [5] },
      metrics: startMetrics,
      changes: ['dp[w] = max(dp[w], val + dp[w - wt])'],
      scene: at(2),
    },
    {
      chapter: 'build',
      short: 'Return',
      title: 'Line 6: the full capacity',
      body: 'After the last item, `dp[cap]` is the best value within the whole limit, and line 6 returns it.\n\nThat’s the whole function. Now let’s run it.',
      code: { view: 'final', lines: [6] },
      metrics: startMetrics,
      changes: ['return dp[cap]'],
      scene: RUN.at(-1)?.scene ?? { entities: [] },
    },
    ...RUN,
    {
      chapter: 'why',
      short: 'Recap',
      title: 'Every item × every capacity: O(n · W)',
      body: 'Each of the `n` items checks at most `cap + 1` capacities once, so it’s **`O(n · W)` time**, and one row is kept: **`O(W)` space**. Trying every subset is `O(2ⁿ)`.\n\nSwitch to **🧪 Try your own** to pack your own items.',
      code: { view: 'final', lines: [3, 4, 5] },
      metrics: FINAL_METRICS,
      scene: { entities: scene({ ...BASE, phase: 'done', item: 2, dp: TABLE[3] ?? [], above: TABLE.slice(0, 3), note: '3 items: 8 subsets, 7 checks here\n40 items, W = 1000:\n10¹² subsets vs 40 000 checks', noteTone: 'found' }) },
    },
    {
      chapter: 'why',
      short: 'Downwards',
      title: 'Why line 4 runs the capacities downwards',
      body: 'Going down, `dp[w − wt]` is still last item’s value when it’s read, so each item is packed at most once. That is the key decision.\n\nGo upwards and `dp[w − wt]` may already include this item: with item 1 (weight 1, value 15), `dp[1] = 15`, then `dp[2] = 15 + dp[1] = 30`, i.e. item 1 packed twice. That’s the unlimited-copies knapsack, not 0/1.',
      code: { view: 'final', lines: [4] },
      values: { 4: 'w = 4, 3, 2, 1: dp[w − wt] is still old' },
      metrics: FINAL_METRICS,
      scene: { entities: scene({ ...BASE, phase: 'relax', item: 0, w: 2, dp: [0, 0, 15, 15, 15], above: [TABLE[0] ?? []], take: true, note: 'downwards: dp[2] = 15 + dp[1] = 15 + 0 ✓\nupwards: dp[1] = 15 first\n→ dp[2] = 15 + 15 = 30 ✗ (twice)' }) },
    },
  ],
  trace: {
    title: 'Run knapsack_01 on your own items',
    inputs: [
      { name: 'weights', label: 'weights (1 to 7)', kind: 'numbers', default: '2, 3, 4' },
      { name: 'values', label: 'values', kind: 'numbers', default: '3, 4, 5' },
      { name: 'cap', label: 'cap (0 to 7)', kind: 'number', default: '5' },
    ],
    presets: [
      { label: 'Lesson example', values: { weights: '1, 3, 4', values: '15, 20, 30', cap: '4' } },
      { label: 'Nothing fits', values: { weights: '5, 6', values: '10, 12', cap: '4' } },
      { label: 'Greedy trap', values: { weights: '3, 2, 2', values: '5, 3, 3', cap: '4' } },
      { label: 'Capacity 0', values: { weights: '1', values: '9', cap: '0' } },
    ],
    maxItems: 3,
    run: (values) => {
      const weights = values['weights'];
      const vals = values['values'];
      const cap = values['cap'];
      if (!Array.isArray(weights) || !Array.isArray(vals) || weights.length === 0) throw new Error('Enter at least one item.');
      if (weights.length !== vals.length) throw new Error('Give every weight a value (same count in both lists).');
      if (weights.some((wt) => wt < 1 || wt > 7)) throw new Error('Weights go from 1 to 7.');
      if (vals.some((v) => v < 0 || v > 99)) throw new Error('Values go from 0 to 99.');
      if (typeof cap !== 'number' || cap < 0 || cap > 7) throw new Error('Pick cap from 0 to 7, so the table fits on the stage.');
      return traceSack(weights, vals, cap);
    },
  },
});
