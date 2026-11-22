import { arr, defineWalkthrough, note, ptr, range, vars } from '../../../lib/walkthrough/helpers';
import { GAP, PITCH } from '../../../lib/walkthrough/layout';
import type { Entity, ScalarValue, Step, Tone } from '../../../lib/walkthrough/types';

/**
 * The scene is the recursion tree: one row per depth, one block row per call.
 * A call's row shows its input slice, then the `merged` list it builds, then the
 * sorted list it returns.
 */
const ROW = 120;
/** Extra space at every split point, so the halves visibly drift apart. */
const SPLIT_GAP = 24;
/** Placeholder for a `merged` slot that hasn't been filled yet. */
const EMPTY = '·';

interface TreeNode {
  readonly lo: number;
  readonly hi: number;
  readonly depth: number;
  readonly x: number;
  readonly y: number;
}

/** Every call merge_sort makes on a list of n items, with its fixed floor position. */
function treeOf(n: number): TreeNode[] {
  const splits: { readonly pos: number; readonly depth: number }[] = [];
  const raw: { readonly lo: number; readonly hi: number; readonly depth: number }[] = [];
  const walk = (lo: number, hi: number, depth: number): void => {
    raw.push({ lo, hi, depth });
    if (hi - lo <= 1) return;
    const mid = lo + Math.floor((hi - lo) / 2);
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
const idOf = (t: TreeNode): string => (t.depth === 0 ? 'arr' : `call-${t.lo}-${t.hi}`);

interface NodeView {
  readonly values: readonly ScalarValue[];
  readonly tones?: Readonly<Record<number, Tone>>;
}

interface PtrAt {
  readonly node: string;
  readonly index: number;
}

interface MergeView {
  readonly tree: readonly TreeNode[];
  /** Visible calls, keyed by `lo-hi`. */
  readonly nodes: Readonly<Record<string, NodeView>>;
  /** The call that is running now. */
  readonly current?: string;
  readonly i?: PtrAt;
  readonly j?: PtrAt;
  readonly vars?: {
    readonly arr?: string;
    readonly mid?: number;
    readonly i?: number;
    readonly j?: number;
    readonly merged?: string;
  };
  readonly note?: string;
  readonly noteTone?: Tone;
}

/** Scene: the recursion tree, the running call's band, i and j on its halves, variables on the right. */
function scene(v: MergeView): Entity[] {
  const entities: Entity[] = [];
  const byKey = new Map(v.tree.map((t) => [keyOf(t.lo, t.hi), t] as const));
  for (const t of v.tree) {
    const view = v.nodes[keyOf(t.lo, t.hi)];
    if (!view) continue;
    const root = t.depth === 0;
    entities.push(arr(idOf(t), t.x, t.y, view.values, { tones: view.tones ?? {}, ...(root ? { label: 'arr', codeVar: 'arr' } : {}) }));
  }
  const current = v.current ? byKey.get(v.current) : undefined;
  if (current) entities.push(range('call', idOf(current), 0, current.hi - current.lo - 1, 'note'));
  const pointer = (name: 'i' | 'j', at: PtrAt | undefined): void => {
    const t = at ? byKey.get(at.node) : undefined;
    if (!at || !t || at.index >= t.hi - t.lo) return;
    entities.push(ptr(name, idOf(t), at.index, name, { side: 'top', tone: 'compare', codeVar: name }));
  };
  pointer('i', v.i);
  pointer('j', v.j);
  const width = Math.max(...v.tree.map((t) => t.x + (t.hi - t.lo) * PITCH - GAP));
  const depth = Math.max(...v.tree.map((t) => t.depth));
  const s = v.vars ?? {};
  const row = (name: string, value: ScalarValue | undefined): { name: string; value: ScalarValue; tone: Tone } => ({
    name,
    value: value ?? '—',
    tone: value === undefined ? 'muted' : 'default',
  });
  entities.push(
    vars('vals', width + 80, 0, [row('arr', s.arr), row('mid', s.mid), row('i', s.i), row('j', s.j), row('merged', s.merged)], {
      label: 'this call',
      width: 210,
    }),
  );
  if (v.note) entities.push(note('note', 0, (depth + 1) * ROW + 60, v.note, { tone: v.noteTone ?? 'note' }));
  return entities;
}

const show = (values: readonly ScalarValue[]): string => `[${values.join(', ')}]`;
const all = (n: number, tone: Tone): Record<number, Tone> => Object.fromEntries(Array.from({ length: n }, (_, k) => [k, tone]));
const fit = (text: string, fallback: string): string => (text.length <= 14 ? text : fallback);

/**
 * Runs merge sort on any input and records every call: each split, each base
 * case, and every compare / take of every merge, one decision per step.
 */
function traceMerge(input: readonly number[]): Step[] {
  const tree = treeOf(input.length);
  const find = (lo: number, hi: number): TreeNode | undefined => tree.find((t) => t.lo === lo && t.hi === hi);
  const steps: Step[] = [];
  const nodes: Record<string, NodeView> = {};
  let comparisons = 0;
  let calls = 0;

  interface Emit {
    readonly short: string;
    readonly title: string;
    readonly body: string;
    readonly lines: readonly number[];
    readonly values: Readonly<Record<number, string>>;
    readonly view: Omit<MergeView, 'tree' | 'nodes'>;
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
      metrics: { comparisons, calls, result: e.result ?? '—' },
      scene: { entities: scene({ tree, nodes: { ...nodes }, ...e.view }) },
    });
  };

  /** Sorts input[lo:hi] the way the code does; `side` says which line of the caller made the call. */
  const sort = (lo: number, hi: number, side: 'root' | 'left' | 'right'): number[] => {
    calls += 1;
    const k = keyOf(lo, hi);
    const values = input.slice(lo, hi);
    const len = values.length;
    const callLine = side === 'left' ? 8 : 9;
    const called = side === 'root' ? '' : `Line ${callLine} of the caller runs \`merge_sort(${show(values)})\`. `;

    if (len <= 1) {
      nodes[k] = { values, tones: all(len, side === 'root' ? 'found' : 'done') };
      emit({
        short: fit(`Base ${show(values)}`, 'Base case'),
        title: `merge_sort(${show(values)}): base case`,
        body: `${called}Line 3: it has ${len} item${len === 1 ? '' : 's'}, so line 4 returns it unchanged. One item is already sorted.`,
        lines: [3, 4],
        values: { 3: `${len} <= 1 → True`, 4: `return ${show(values)}` },
        view: { current: k, vars: { arr: show(values) } },
        ...(side === 'root' ? { result: show(values) } : {}),
      });
      return values;
    }

    const mid = Math.floor(len / 2);
    const leftNode = find(lo, lo + mid);
    const rightNode = find(lo + mid, hi);
    if (!leftNode || !rightNode) throw new Error('merge sort tree is missing a call');
    const lk = keyOf(leftNode.lo, leftNode.hi);
    const rk = keyOf(rightNode.lo, rightNode.hi);
    nodes[k] = { values };
    nodes[lk] = { values: values.slice(0, mid) };
    nodes[rk] = { values: values.slice(mid) };
    emit({
      short: fit(`Split ${show(values)}`, 'Split'),
      title: `merge_sort(${show(values)}): split at mid = ${mid}`,
      body: `${called}Line 3: ${len} items is more than 1, so this is not a base case. Line 7: \`mid = ${len} // 2 = ${mid}\`, so the halves are ${show(values.slice(0, mid))} and ${show(values.slice(mid))}.`,
      lines: [3, 7],
      values: { 3: `${len} <= 1 → False`, 7: `mid = ${len} // 2 = ${mid}` },
      view: { current: k, vars: { arr: show(values), mid } },
    });

    const left = sort(lo, lo + mid, 'left');
    const right = sort(lo + mid, hi, 'right');

    // Merge: this call's row now shows `merged`, filling left to right.
    const merged: number[] = [];
    let i = 0;
    let j = 0;
    const paint = (comparing: boolean, took: boolean): void => {
      const tones: Record<number, Tone> = {};
      for (let m = 0; m < len; m += 1) tones[m] = m < merged.length ? 'done' : 'muted';
      if (took) tones[merged.length - 1] = 'active';
      nodes[k] = { values: [...merged, ...Array.from({ length: len - merged.length }, () => EMPTY)], tones };
      const half = (values: readonly number[], at: number): NodeView => {
        const t: Record<number, Tone> = {};
        values.forEach((_, m) => (t[m] = m < at ? 'muted' : 'done'));
        if (comparing && at < values.length) t[at] = 'compare';
        return { values, tones: t };
      };
      nodes[lk] = half(left, i);
      nodes[rk] = half(right, j);
    };
    const state = (): MergeView['vars'] => ({ arr: show(values), mid, i, j, merged: show(merged) });
    const pointers = (): Pick<MergeView, 'i' | 'j'> => ({ i: { node: lk, index: i }, j: { node: rk, index: j } });

    for (;;) {
      const go = i < left.length && j < right.length;
      const first = merged.length === 0;
      paint(go, false);
      if (go) {
        comparisons += 1;
        const a = left[i] ?? 0;
        const b = right[j] ?? 0;
        emit({
          short: first ? 'Start merge' : 'Compare',
          title: `Compare left[${i}] = ${a} with right[${j}] = ${b}`,
          body: `${first ? `Both halves are back: ${show(left)} and ${show(right)}. Line 12 starts an empty \`merged\` (the row above now shows it), and line 13 sets \`i = j = 0\`. ` : ''}Line 14: both halves still have values. Line 15 asks whether ${a} ≤ ${b}: ${a <= b ? 'yes' : 'no'}.`,
          lines: first ? [12, 13, 14, 15] : [14, 15],
          values: first
            ? { 12: 'merged = []', 13: 'i = j = 0', 14: `0 < ${left.length} and 0 < ${right.length} → True`, 15: `${a} <= ${b} → ${a <= b ? 'True' : 'False'}` }
            : { 14: `${i} < ${left.length} and ${j} < ${right.length} → True`, 15: `${a} <= ${b} → ${a <= b ? 'True' : 'False'}` },
          view: { current: k, ...pointers(), vars: state() },
        });
      } else {
        const usedUp = i < left.length ? 'right' : 'left';
        emit({
          short: 'Stop',
          title: `${usedUp} is used up: stop comparing`,
          body: `Line 14: \`${usedUp === 'right' ? 'j' : 'i'} = ${usedUp === 'right' ? j : i}\` reached the end of \`${usedUp}\`, so the loop ends. What is left in the other half is already sorted.`,
          lines: [14],
          values: { 14: `${i} < ${left.length} and ${j} < ${right.length} → False` },
          view: { current: k, ...pointers(), vars: state() },
        });
        break;
      }
      const fromLeft = (left[i] ?? 0) <= (right[j] ?? 0);
      const value = fromLeft ? (left[i] ?? 0) : (right[j] ?? 0);
      merged.push(value);
      if (fromLeft) i += 1;
      else j += 1;
      paint(false, true);
      emit({
        short: `Take ${value}`,
        title: `Take ${value} from ${fromLeft ? 'left' : 'right'}`,
        body: fromLeft
          ? `Line 16 appends ${value} to \`merged\`, and line 17 moves \`i\` to ${i}.`
          : `Line 19 appends ${value} to \`merged\`, and line 20 moves \`j\` to ${j}.`,
        lines: fromLeft ? [16, 17] : [19, 20],
        values: fromLeft ? { 16: `merged = ${show(merged)}`, 17: `i = ${i}` } : { 19: `merged = ${show(merged)}`, 20: `j = ${j}` },
        view: { current: k, ...pointers(), vars: state() },
      });
    }

    const restLeft = left.slice(i);
    const restRight = right.slice(j);
    const before = merged.length;
    merged.push(...restLeft, ...restRight);
    i = left.length;
    j = right.length;
    paint(false, false);
    const tones: Record<number, Tone> = all(len, 'done');
    for (let m = before; m < len; m += 1) tones[m] = 'active';
    nodes[k] = { values: [...merged], tones };
    emit({
      short: 'Leftovers',
      title: `Append the leftover${restLeft.length + restRight.length === 1 ? '' : 's'}: ${show([...restLeft, ...restRight])}`,
      body: `Line 23 appends what is left of \`left\` (${show(restLeft)}) and line 24 what is left of \`right\` (${show(restRight)}). They are sorted and at least as big as everything merged so far.`,
      lines: [23, 24],
      values: { 23: `merged.extend(${show(restLeft)})`, 24: `merged.extend(${show(restRight)})` },
      view: { current: k, vars: state() },
    });

    nodes[k] = { values: [...merged], tones: all(len, side === 'root' ? 'found' : 'done') };
    nodes[lk] = { values: left, tones: all(left.length, 'muted') };
    nodes[rk] = { values: right, tones: all(right.length, 'muted') };
    emit({
      short: side === 'root' ? 'Return' : fit(`Return ${show(merged)}`, 'Return'),
      title: side === 'root' ? `Sorted: ${show(merged)}` : `merge_sort(${show(values)}) returns ${show(merged)}`,
      body:
        side === 'root'
          ? `Line 25 returns the merged list. The whole sort took ${comparisons} comparison${comparisons === 1 ? '' : 's'} over ${calls} calls.`
          : `Line 25 returns ${show(merged)}. Back in the caller, line ${callLine} stores it in \`${side}\`.`,
      lines: [25],
      values: { 25: `return ${show(merged)}` },
      view: { vars: state() },
      ...(side === 'root' ? { result: show(merged) } : {}),
    });
    return merged;
  };

  sort(0, input.length, 'root');
  return steps;
}

const INPUT = [5, 2, 4, 1] as const;
const TREE = treeOf(INPUT.length);
const RUN = traceMerge(INPUT);
/** Scene of run step n (0-based), so build steps show the moment they describe. */
const at = (n: number): Step['scene'] => RUN[n]?.scene ?? { entities: [] };
const startMetrics = { comparisons: 0, calls: 0, result: '—' } as const;
const RUN_START = 9;
const LAST_RUN = RUN.at(-1);
const FINAL_METRICS = LAST_RUN?.metrics ?? startMetrics;

export default defineWalkthrough({
  id: 'learn/sorting/merge-sort',
  title: 'Merge Sort, split then zip together',
  summary: 'From the idea to the code: split the list in half, sort each half the same way, then merge the two sorted halves by always taking the smaller front value.',
  minutes: 9,
  code: {
    lang: 'python',
    source: `def merge_sort(arr: list[int]) -> list[int]:
    # Base case: 0 or 1 item is already sorted
    if len(arr) <= 1:
        return arr

    # Divide: split array down the middle
    mid = len(arr) // 2
    left = merge_sort(arr[:mid])
    right = merge_sort(arr[mid:])

    # Conquer: merge two sorted halves
    merged: list[int] = []
    i = j = 0
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:
            merged.append(left[i])
            i += 1
        else:
            merged.append(right[j])
            j += 1

    # Append remaining items from either half
    merged.extend(left[i:])
    merged.extend(right[j:])
    return merged`,
  },
  metrics: [
    { key: 'comparisons', label: 'Comparisons' },
    { key: 'calls', label: 'Calls' },
    { key: 'result', label: 'Returns' },
  ],
  legend: [
    { tone: 'note', label: 'the call running now' },
    { tone: 'compare', label: 'front values compared' },
    { tone: 'active', label: 'just added to merged' },
    { tone: 'done', label: 'sorted / merged so far' },
    { tone: 'muted', label: 'already taken · empty slot' },
  ],
  goals: [
    { text: 'Split until single items, then merge back', step: 2 },
    { text: 'Let the function sort each half for you', step: 4 },
    { text: 'Merge two sorted halves with two pointers', step: 6 },
    { text: 'Follow every call down the tree and back up', step: RUN_START + 1 },
    { text: 'See why <= keeps merge sort stable', step: RUN_START + RUN.length + 2 },
  ],
  steps: [
    {
      chapter: 'problem',
      short: 'The brief',
      title: 'Sort [5, 2, 4, 1]',
      body: 'Like sorting a messy stack of test papers: split it in half, sort each half, then zip the two piles together by always taking the smaller top paper.\n\nLine 1 takes a list `arr` and returns a new sorted list.',
      code: { view: 'signature', lines: [1] },
      metrics: startMetrics,
      scene: { entities: scene({ tree: TREE, nodes: { [keyOf(0, 4)]: { values: INPUT } } }) },
    },
    {
      chapter: 'idea',
      short: 'Split, merge',
      title: 'Split down to single items, then merge back up',
      body: 'A list of one item is already sorted. So keep halving until every piece has one item: that is the tree below.\n\nThen walk back up, merging two sorted pieces at a time. Merging is easy: compare the two front values and take the smaller one.',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: {
        entities: scene({
          tree: TREE,
          nodes: Object.fromEntries(TREE.map((t) => [keyOf(t.lo, t.hi), { values: INPUT.slice(t.lo, t.hi) }])),
          note: 'split:  [5, 2] [4, 1] → [5] [2] [4] [1]\nmerge:  [5] [2] → [2, 5]    [4] [1] → [1, 4]\nmerge:  [2, 5] [1, 4] → [1, 2, 4, 5]',
        }),
      },
    },
    {
      chapter: 'build',
      short: 'Base case',
      title: 'Lines 2–4: one item is already sorted',
      body: 'Line 3 stops the splitting: a list with 0 or 1 items is returned as it is (line 4). Every branch of the tree ends here, like `[5]` below.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4], lines: [3, 4] },
      metrics: startMetrics,
      changes: ['if len(arr) <= 1: return arr'],
      scene: at(2),
    },
    {
      chapter: 'build',
      short: 'Split',
      title: 'Lines 6–8: split, and sort the left half',
      body: 'Line 7 finds the middle, `4 // 2 = 2`. Line 8 calls `merge_sort` on the left half: the same function solves the smaller problem and hands back a sorted list.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 6, 7, 8], lines: [7, 8] },
      metrics: startMetrics,
      changes: ['mid = len(arr) // 2', 'left = merge_sort(arr[:mid])'],
      scene: at(0),
    },
    {
      chapter: 'build',
      short: 'Right half',
      title: 'Lines 9–12: sort the right half, start merged',
      body: 'Line 9 sorts the right half the same way. With both halves sorted, line 12 starts an empty `merged` list for the result.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 6, 7, 8, 9, 11, 12], lines: [9, 12] },
      metrics: startMetrics,
      changes: ['right = merge_sort(arr[mid:])', 'merged = []'],
      scene: at(16),
    },
    {
      chapter: 'build',
      short: 'Compare',
      title: 'Lines 13–15: compare the two front values',
      body: 'Line 13 points `i` and `j` at the front of each half. Line 14 loops while both halves still have values, and line 15 compares the two front values.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 6, 7, 8, 9, 11, 12, 13, 14, 15], lines: [13, 14, 15] },
      metrics: startMetrics,
      changes: ['i = j = 0', 'while i < len(left) and j < len(right)', 'if left[i] <= right[j]'],
      scene: at(17),
    },
    {
      chapter: 'build',
      short: 'Take left',
      title: 'Lines 16–18: take from the left',
      body: 'If the left value is smaller or equal, line 16 appends it to `merged` and line 17 moves `i` past it.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 6, 7, 8, 9, 11, 12, 13, 14, 15, 16, 17, 18], lines: [16, 17] },
      metrics: startMetrics,
      changes: ['merged.append(left[i])', 'i += 1'],
      scene: at(20),
    },
    {
      chapter: 'build',
      short: 'Take right',
      title: 'Lines 19–22: otherwise take from the right',
      body: 'Otherwise line 19 appends the right value and line 20 moves `j`.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 6, 7, 8, 9, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 22], lines: [19, 20] },
      metrics: startMetrics,
      changes: ['merged.append(right[j])', 'j += 1'],
      scene: at(18),
    },
    {
      chapter: 'build',
      short: 'Leftovers',
      title: 'Lines 23–25: append what is left',
      body: 'When one half runs out, the rest of the other half is already sorted and at least as big as everything merged, so lines 23–24 append it. Line 25 returns `merged`.\n\nNow let’s run it, call by call.',
      code: { view: 'final', lines: [23, 24, 25] },
      metrics: startMetrics,
      changes: ['merged.extend(left[i:])', 'merged.extend(right[j:])', 'return merged'],
      scene: at(24),
    },
    ...RUN,
    {
      chapter: 'why',
      short: 'Recap',
      title: 'log n levels, n work per level',
      body: 'The tree has about `log₂ n` levels, and the merges on each level handle `n` values in total: **`O(n log n)` time**, in every case. The `merged` lists need **`O(n)` extra space**.',
      code: { view: 'final', lines: [7, 14] },
      metrics: FINAL_METRICS,
      scene: { entities: [...(LAST_RUN?.scene.entities ?? []), note('note', 0, 3 * ROW + 60, '8 items      →  3 levels\n1,000,000    →  20 levels\neach level merges all n', { tone: 'found' })] },
    },
    {
      chapter: 'why',
      short: 'Stable',
      title: 'Why line 15 uses <= instead of <',
      body: 'When the two front values are equal, `<=` takes the one from `left`, which came first in the original list. So equal values keep their order: merge sort is **stable**.\n\nWith `<` it would take from `right` first and swap their order, so `<=` is the key decision.',
      code: { view: 'final', lines: [15, 16] },
      values: { 15: '3ᵃ <= 3ᵇ → True', 16: 'take 3ᵃ (from left) first' },
      metrics: { comparisons: 1, calls: 3, result: '[3ᵃ, 3ᵇ]' },
      scene: {
        entities: [
          arr('trap', 0, 0, ['3ᵃ', '3ᵇ'], { label: 'arr', codeVar: 'arr', tones: all(2, 'found') }),
          arr('trap-l', 0, ROW, ['3ᵃ'], { tones: { 0: 'compare' } }),
          arr('trap-r', PITCH + SPLIT_GAP, ROW, ['3ᵇ'], { tones: { 0: 'compare' } }),
          note('note', 0, 2 * ROW + 60, '<=  →  [3ᵃ, 3ᵇ]  order kept\n<   →  [3ᵇ, 3ᵃ]  order flipped', { tone: 'found' }),
        ],
      },
    },
  ],
  trace: {
    title: 'Run merge sort on your own numbers',
    inputs: [{ name: 'arr', label: 'Numbers to sort', kind: 'numbers', default: '5, 2, 4, 1' }],
    presets: [
      { label: 'Odd length', values: { arr: '7, 3, 9, 1, 5' } },
      { label: 'Reversed', values: { arr: '6, 5, 4, 3, 2, 1' } },
      { label: 'Duplicates', values: { arr: '3, 1, 3, 2' } },
      { label: 'One half wins', values: { arr: '1, 2, 3, 7, 8, 9' } },
    ],
    maxItems: 8,
    run: (values) => {
      const input = values['arr'];
      if (!Array.isArray(input) || input.length === 0) throw new Error('Enter at least one number.');
      return traceMerge(input);
    },
  },
});
