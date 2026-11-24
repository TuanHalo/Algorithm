import { arr, defineWalkthrough, note, range, vars } from '../../../lib/walkthrough/helpers';
import { GAP, PITCH } from '../../../lib/walkthrough/layout';
import type { Entity, ScalarValue, Step, Tone } from '../../../lib/walkthrough/types';

/**
 * Same recursion-tree layout as merge sort (`sorting/merge-sort.ts`): one row per
 * depth, one block row per call, extra space at every split.
 */
const ROW = 120;
const SPLIT_GAP = 24;

interface TreeNode {
  readonly lo: number;
  readonly hi: number;
  readonly depth: number;
  readonly x: number;
  readonly y: number;
}

/** Every call max_value makes on the range [0, n), with its fixed floor position. */
function treeOf(n: number): TreeNode[] {
  const splits: { readonly pos: number; readonly depth: number }[] = [];
  const raw: { readonly lo: number; readonly hi: number; readonly depth: number }[] = [];
  const walk = (lo: number, hi: number, depth: number): void => {
    raw.push({ lo, hi, depth });
    if (hi - lo <= 1) return;
    const mid = Math.floor((lo + hi) / 2);
    splits.push({ pos: mid, depth });
    walk(lo, mid, depth + 1);
    walk(mid, hi, depth + 1);
  };
  walk(0, n, 0);
  return raw.map((r) => ({
    ...r,
    x: r.lo * PITCH + splits.filter((s) => s.depth < r.depth && s.pos <= r.lo).length * SPLIT_GAP,
    y: r.depth * ROW,
  }));
}

const keyOf = (lo: number, hi: number): string => `${lo}-${hi}`;
const idOf = (t: TreeNode): string => (t.depth === 0 ? 'nums' : `call-${t.lo}-${t.hi}`);

interface NodeView {
  readonly values: readonly ScalarValue[];
  readonly tones?: Readonly<Record<number, Tone>>;
}

interface MaxView {
  readonly tree: readonly TreeNode[];
  /** Visible calls, keyed by `lo-hi`. */
  readonly nodes: Readonly<Record<string, NodeView>>;
  /** The call that is running now. */
  readonly current?: string;
  readonly vars?: {
    readonly lo?: number;
    readonly hi?: number;
    readonly mid?: number;
    readonly left?: number;
    readonly right?: number;
  };
  readonly note?: string;
  readonly noteTone?: Tone;
}

/** Scene: the recursion tree, the running call's band, the running call's variables on the right. */
function scene(v: MaxView): Entity[] {
  const entities: Entity[] = [];
  const byKey = new Map(v.tree.map((t) => [keyOf(t.lo, t.hi), t] as const));
  for (const t of v.tree) {
    const view = v.nodes[keyOf(t.lo, t.hi)];
    if (!view) continue;
    entities.push(arr(idOf(t), t.x, t.y, view.values, { tones: view.tones ?? {}, ...(t.depth === 0 ? { label: 'nums', codeVar: 'nums' } : {}) }));
  }
  const current = v.current ? byKey.get(v.current) : undefined;
  if (current) entities.push(range('call', idOf(current), 0, current.hi - current.lo - 1, 'note'));
  const width = Math.max(...v.tree.map((t) => t.x + (t.hi - t.lo) * PITCH - GAP));
  const depth = Math.max(...v.tree.map((t) => t.depth));
  const s = v.vars ?? {};
  const row = (name: string, value: number | undefined): { name: string; value: ScalarValue; tone: Tone } => ({
    name,
    value: value ?? '—',
    tone: value === undefined ? 'muted' : 'default',
  });
  entities.push(
    vars('vals', width + 80, 0, [row('lo', s.lo), row('hi', s.hi), row('mid', s.mid), row('left_max', s.left), row('right_max', s.right)], {
      label: 'this call',
      width: 210,
    }),
  );
  if (v.note) entities.push(note('note', 0, (depth + 1) * ROW + 60, v.note, { tone: v.noteTone ?? 'note' }));
  return entities;
}

const show = (values: readonly number[]): string => `[${values.join(', ')}]`;
const fit = (text: string, fallback: string): string => (text.length <= 14 ? text : fallback);

/** What a call hands back: the maximum and the index it sits at. */
interface Best {
  readonly value: number;
  readonly index: number;
}

/**
 * Runs `max_value` on any input and records every call: each divide, each base
 * case, each combine and each return, one decision per step.
 */
function traceMax(input: readonly number[]): Step[] {
  const n = input.length;
  const tree = treeOf(n);
  const steps: Step[] = [];
  const nodes: Record<string, NodeView> = { [keyOf(0, n)]: { values: input } };
  let calls = 0;
  let combines = 0;

  interface Emit {
    readonly short: string;
    readonly title: string;
    readonly body: string;
    readonly lines: readonly number[];
    readonly values: Readonly<Record<number, string>>;
    readonly view: Omit<MaxView, 'tree' | 'nodes'>;
    readonly result?: string;
  }
  const emit = (e: Emit): void => {
    steps.push({
      chapter: 'run',
      short: e.short,
      title: e.title,
      body: e.body,
      code: { view: 'final', lines: e.lines },
      values: e.values,
      metrics: { calls, combines, result: e.result ?? '—' },
      scene: { entities: scene({ tree, nodes: { ...nodes }, ...e.view }) },
    });
  };
  const only = (values: readonly number[], index: number, tone: Tone, other: Tone): Record<number, Tone> =>
    Object.fromEntries(values.map((_, m) => [m, m === index ? tone : other]));

  /** Solves input[lo:hi] the way the code does; `side` says which line of the caller made the call. */
  const solve = (lo: number, hi: number, side: 'root' | 'left' | 'right'): Best => {
    calls += 1;
    const k = keyOf(lo, hi);
    const values = input.slice(lo, hi);
    const callLine = side === 'left' ? 8 : 9;
    const called = side === 'root' ? '' : `Line ${callLine} of the caller runs \`max_value(nums, ${lo}, ${hi})\`. `;

    if (hi - lo === 1) {
      const value = values[0] ?? 0;
      nodes[k] = { values, tones: { 0: side === 'root' ? 'found' : 'done' } };
      emit({
        short: fit(`Base ${show(values)}`, 'Base case'),
        title: `max_value(${show(values)}): base case`,
        body: `${called}Line 3: \`${hi} - ${lo} == 1\` is true, so the range holds a single item. Line 4 returns it: one item is its own maximum, ${value}.${side === 'root' ? '' : ` Back in the caller, line ${callLine} stores it.`}`,
        lines: [3, 4],
        values: { 3: `${hi} - ${lo} == 1 → True`, 4: `return nums[${lo}] = ${value}` },
        view: { current: k, vars: { lo, hi } },
        ...(side === 'root' ? { result: String(value) } : {}),
      });
      return { value, index: lo };
    }

    const mid = Math.floor((lo + hi) / 2);
    const lk = keyOf(lo, mid);
    const rk = keyOf(mid, hi);
    nodes[k] = { values };
    nodes[lk] = { values: input.slice(lo, mid) };
    nodes[rk] = { values: input.slice(mid, hi) };
    emit({
      short: fit(`Divide ${show(values)}`, 'Divide'),
      title: `max_value(${show(values)}): divide at mid = ${mid}`,
      body: `${called}Line 3: \`${hi} - ${lo} == 1\` is false, so there is more than one item. Line 7: \`mid = (${lo} + ${hi}) // 2 = ${mid}\`, so the halves are ${show(input.slice(lo, mid))} and ${show(input.slice(mid, hi))}.`,
      lines: [3, 7],
      values: { 3: `${hi} - ${lo} == 1 → False`, 7: `mid = (${lo} + ${hi}) // 2 = ${mid}` },
      view: { current: k, vars: { lo, hi, mid } },
    });

    const left = solve(lo, mid, 'left');
    const right = solve(mid, hi, 'right');

    // Combine: the bigger answer wins (the left one on a tie, like Python's max).
    combines += 1;
    const winner = right.value > left.value ? right : left;
    const leftValues = input.slice(lo, mid);
    const rightValues = input.slice(mid, hi);
    nodes[lk] = { values: leftValues, tones: only(leftValues, left.index - lo, 'compare', 'muted') };
    nodes[rk] = { values: rightValues, tones: only(rightValues, right.index - mid, 'compare', 'muted') };
    nodes[k] = { values, tones: only(values, winner.index - lo, 'active', 'default') };
    emit({
      short: 'Combine',
      title: `max(${left.value}, ${right.value}) = ${winner.value}`,
      body: `Both halves answered: \`left_max = ${left.value}\` and \`right_max = ${right.value}\`. Line 12 keeps the bigger one, ${winner.value}. No other value of this range can beat it, because each half's maximum already beat everything in its half.`,
      lines: [12],
      values: { 12: `max(${left.value}, ${right.value}) = ${winner.value}` },
      view: { current: k, vars: { lo, hi, mid, left: left.value, right: right.value } },
    });

    nodes[k] = { values, tones: only(values, winner.index - lo, side === 'root' ? 'found' : 'done', side === 'root' ? 'default' : 'muted') };
    nodes[lk] = { values: leftValues, tones: only(leftValues, -1, 'muted', 'muted') };
    nodes[rk] = { values: rightValues, tones: only(rightValues, -1, 'muted', 'muted') };
    emit({
      short: side === 'root' ? 'Return' : fit(`Return ${winner.value}`, 'Return'),
      title: side === 'root' ? `Maximum: ${winner.value}` : `max_value(${show(values)}) returns ${winner.value}`,
      body:
        side === 'root'
          ? `Line 12 returns **${winner.value}**. ${calls} calls and ${combines} combines found it: one combine per divide.`
          : `Line 12 returns ${winner.value}. Back in the caller, line ${callLine} stores it in \`${side}_max\`.`,
      lines: [12],
      values: { 12: `return ${winner.value}` },
      view: { vars: { lo, hi, mid, left: left.value, right: right.value } },
      ...(side === 'root' ? { result: String(winner.value) } : {}),
    });
    return winner;
  };

  solve(0, n, 'root');
  return steps;
}

const INPUT = [3, 8, 2, 5] as const;
const TREE = treeOf(INPUT.length);
const RUN = traceMax(INPUT);
/** Scene of run step n (0-based), so build steps show the moment they describe. */
const at = (n: number): Step['scene'] => RUN[n]?.scene ?? { entities: [] };
const startMetrics = { calls: 0, combines: 0, result: '—' } as const;
const LAST_RUN = RUN.at(-1);
const FINAL_METRICS = LAST_RUN?.metrics ?? startMetrics;
/** Story steps before the run chapter: problem 1, idea 2, build 4. */
const RUN_START = 7;
const allCalls = Object.fromEntries(TREE.map((t) => [keyOf(t.lo, t.hi), { values: INPUT.slice(t.lo, t.hi) }]));

export default defineWalkthrough({
  id: 'learn/recursion-divide-conquer/divide-and-conquer-paradigm',
  title: 'Divide and Conquer, split, solve, combine',
  summary: 'From the idea to the code: split a problem into independent halves, solve each half with the same function, and combine the two answers.',
  minutes: 9,
  code: {
    lang: 'python',
    source: `def max_value(nums: list[int], lo: int, hi: int) -> int:
    # Conquer: a range of one item is its own maximum
    if hi - lo == 1:
        return nums[lo]

    # Divide: split the range [lo, hi) in half
    mid = (lo + hi) // 2
    left_max = max_value(nums, lo, mid)
    right_max = max_value(nums, mid, hi)

    # Combine: the bigger of the two answers wins
    return max(left_max, right_max)`,
  },
  metrics: [
    { key: 'calls', label: 'Calls' },
    { key: 'combines', label: 'Combines' },
    { key: 'result', label: 'Returns' },
  ],
  legend: [
    { tone: 'note', label: 'the call running now' },
    { tone: 'compare', label: 'the two answers being combined' },
    { tone: 'active', label: 'the winner of a combine' },
    { tone: 'done', label: 'a call’s answer' },
    { tone: 'muted', label: 'finished, not the answer' },
  ],
  goals: [
    { text: 'Split a problem into independent halves', step: 2 },
    { text: 'Name the three phases: divide, conquer, combine', step: 3 },
    { text: 'Write the base case and the divide', step: 4 },
    { text: 'Follow every call down the tree and back up', step: RUN_START + 1 },
    { text: 'See why the combine can trust the halves', step: RUN_START + RUN.length + 2 },
  ],
  steps: [
    {
      chapter: 'problem',
      short: 'The brief',
      title: 'Find the biggest of [3, 8, 2, 5]',
      body: 'Think of a census: no one interviews 100 million people alone. The country splits into states, states into counties, and each small team reports up.\n\nLine 1 takes a list `nums` and a range `lo` to `hi` (`hi` excluded), and returns the maximum in that range. Start with `lo = 0`, `hi = 4`.',
      code: { view: 'signature', lines: [1] },
      metrics: startMetrics,
      scene: { entities: scene({ tree: TREE, nodes: { [keyOf(0, 4)]: { values: INPUT } }, vars: { lo: 0, hi: 4 } }) },
    },
    {
      chapter: 'idea',
      short: 'Three phases',
      title: 'Divide, conquer, combine',
      body: '**Divide** the range into two halves. **Conquer** each half by asking the same function, down to a single item, which is its own answer. **Combine** the two answers into the answer for the whole range.\n\nA loop would find a maximum just as well; here the combine is one line, so the three phases are easy to see.',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: {
        entities: scene({
          tree: TREE,
          nodes: allCalls,
          note: 'divide:   [3, 8, 2, 5] → [3, 8] [2, 5] → singles\nconquer:  a single item is its own max\ncombine:  max(3, 8) = 8,  max(2, 5) = 5,  max(8, 5) = 8',
        }),
      },
    },
    {
      chapter: 'idea',
      short: 'Independent',
      title: 'The halves never share work',
      body: 'No item is in both halves, so solving the left half tells you nothing about the right half and neither needs the other. That is what makes divide and conquer different from dynamic programming, where subproblems overlap.\n\nIt also means the branches could run on different CPU cores.',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: {
        entities: scene({
          tree: TREE,
          nodes: {
            [keyOf(0, 4)]: { values: INPUT, tones: {} },
            [keyOf(0, 2)]: { values: [3, 8], tones: { 0: 'compare', 1: 'compare' } },
            [keyOf(2, 4)]: { values: [2, 5], tones: { 0: 'done', 1: 'done' } },
          },
          note: 'no value sits in both halves\n→ nothing is solved twice',
          noteTone: 'found',
        }),
      },
    },
    {
      chapter: 'build',
      short: 'Conquer',
      title: 'Lines 2–4: one item is its own maximum',
      body: 'Line 3 stops the splitting: a range with `hi - lo == 1` holds one item, and line 4 returns it. Every branch of the tree ends here, like `[3]` below.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4], lines: [3, 4] },
      metrics: RUN[2]?.metrics ?? startMetrics,
      changes: ['if hi - lo == 1: return nums[lo]'],
      scene: at(2),
    },
    {
      chapter: 'build',
      short: 'Divide',
      title: 'Lines 6–8: split at the middle, solve the left half',
      body: 'Line 7 finds the middle: `mid = (lo + hi) // 2`. With `lo = 0` and `hi = 4` that is 2, so the halves are `0..2` and `2..4`, and no item is lost or used twice. Line 8 asks `max_value` for the left half.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 6, 7, 8], lines: [7, 8] },
      metrics: RUN[0]?.metrics ?? startMetrics,
      changes: ['mid = (lo + hi) // 2', 'left_max = max_value(nums, lo, mid)'],
      scene: at(0),
    },
    {
      chapter: 'build',
      short: 'Right half',
      title: 'Line 9: solve the right half the same way',
      body: 'Line 9 makes the second call, on `mid..hi`. It is the same function on the other half, so nothing new is needed.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 6, 7, 8, 9], lines: [9] },
      metrics: RUN[6]?.metrics ?? startMetrics,
      changes: ['right_max = max_value(nums, mid, hi)'],
      scene: at(6),
    },
    {
      chapter: 'build',
      short: 'Combine',
      title: 'Lines 11–12: the bigger answer wins',
      body: 'Each half has returned its maximum. Line 12 keeps the bigger of `left_max` and `right_max`: the maximum of the whole range.\n\nThat’s the whole function. Now let’s run it, call by call.',
      code: { view: 'final', lines: [12] },
      metrics: RUN[11]?.metrics ?? startMetrics,
      changes: ['return max(left_max, right_max)'],
      scene: at(11),
    },
    ...RUN,
    {
      chapter: 'why',
      short: 'Recap',
      title: 'Cost = divide + combine, over all levels',
      body: 'The tree has `2n − 1` calls, each doing `O(1)` work to divide and combine: **`O(n)` time**. Only one branch is on the call stack at a time, so it needs just **`O(log n)` space**.\n\nWhen the combine costs `O(n)` instead (merge sort), every level does `n` work and the total becomes `O(n log n)`.',
      code: { view: 'final', lines: [7, 12] },
      metrics: FINAL_METRICS,
      scene: { entities: [...(LAST_RUN?.scene.entities ?? []), note('note', 0, 3 * ROW + 60, '4 items →  7 calls, 3 combines\ndivide + combine: O(1) per call\nmerge sort: O(n) per level', { tone: 'found' })] },
    },
    {
      chapter: 'why',
      short: 'Trust halves',
      title: 'Why the combine can trust the halves',
      body: 'Line 12 never looks at the items again. It trusts that `left_max` really is the biggest of the left half and `right_max` of the right half, so the winner of the two must beat everything.\n\nThat is the key decision of divide and conquer: solve **independent** subproblems and give the combine step only their answers.',
      code: { view: 'final', lines: [12] },
      values: { 12: 'max(8, 5) → 8 beats every item' },
      metrics: FINAL_METRICS,
      scene: {
        entities: scene({
          tree: TREE,
          nodes: {
            [keyOf(0, 4)]: { values: INPUT, tones: { 1: 'found' } },
            [keyOf(0, 2)]: { values: [3, 8], tones: { 0: 'muted', 1: 'compare' } },
            [keyOf(2, 4)]: { values: [2, 5], tones: { 0: 'muted', 1: 'compare' } },
          },
          vars: { lo: 0, hi: 4, mid: 2, left: 8, right: 5 },
          note: 'left_max = 8 beats 3 and 8\nright_max = 5 beats 2 and 5\n→ max(8, 5) beats all four',
          noteTone: 'found',
        }),
      },
    },
  ],
  trace: {
    title: 'Run divide and conquer on your own numbers',
    inputs: [{ name: 'nums', label: 'Numbers to search', kind: 'numbers', default: '3, 8, 2, 5' }],
    presets: [
      { label: 'Single item', values: { nums: '5' } },
      { label: 'Odd length', values: { nums: '7, 1, 9, 4, 6' } },
      { label: 'Duplicates', values: { nums: '4, 9, 9, 2' } },
      { label: 'Negatives', values: { nums: '-3, -8, -1, -5' } },
    ],
    maxItems: 8,
    run: (values) => {
      const input = values['nums'];
      if (!Array.isArray(input) || input.length === 0) throw new Error('Enter at least one number.');
      return traceMax(input);
    },
  },
});
