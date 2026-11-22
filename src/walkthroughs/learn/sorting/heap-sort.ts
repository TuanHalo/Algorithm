import { arr, defineWalkthrough, link, note, ptr, range, vars } from '../../../lib/walkthrough/helpers';
import { CELL, GAP, PITCH } from '../../../lib/walkthrough/layout';
import type { Entity, Step, Tone } from '../../../lib/walkthrough/types';

/**
 * The array runs along the floor; left of it the same values are drawn as the
 * tree they form (index k has children 2k + 1 and 2k + 2). Each value is one
 * tree block keyed by its identity, so a swap slides both the array cells and
 * the tree nodes. The tree is laid out in screen space (root on top, levels
 * straight below) and converted back to floor coordinates, so it reads as a
 * tree in the isometric view.
 */
const COS30 = Math.cos(Math.PI / 6);
/** Screen position of the root's centre, the gap between levels, and the bottom level's slot width. */
const TREE_SX = -150;
const TREE_SY = 40;
const LEVEL_SY = 95;
const BOTTOM_SX = 100;

/** A value plus a stable id, so a swapped value keeps its block and slides. */
interface Item {
  readonly v: number;
  readonly id: number;
}

const itemsOf = (values: readonly number[]): Item[] => values.map((v, id) => ({ v, id }));
const levelOf = (k: number): number => Math.floor(Math.log2(k + 1));

/** Floor position of tree slot k in a tree of n slots. */
function slotPos(k: number, n: number): { x: number; y: number } {
  const level = levelOf(k);
  const bottom = levelOf(Math.max(0, n - 1));
  const width = 2 ** bottom * BOTTOM_SX;
  const p = k - (2 ** level - 1);
  const sx = TREE_SX - width / 2 + (p + 0.5) * (width / 2 ** level);
  const sy = TREE_SY + level * LEVEL_SY;
  // The floor corner whose cell centre projects to (sx, sy): screen = ((x − y)·cos30°, (x + y)/2).
  const a = sx / COS30;
  const b = 2 * sy - CELL;
  return { x: Math.round((a + b) / 2), y: Math.round((b - a) / 2) };
}

interface HeapState {
  readonly items: readonly Item[];
  /** Slots 0…size − 1 form the heap; the rest are final. */
  readonly size: number;
  /** Node being repaired by heapify. */
  readonly root?: number;
  readonly largest?: number;
  /** Highlight only the child compared in this step (otherwise both). */
  readonly child?: number;
  readonly i?: number;
  readonly end?: number;
  readonly done?: boolean;
  readonly note?: string;
  readonly noteTone?: Tone;
}

/** Scene: the array with the heap part banded, the tree below it, and the variables on the right. */
function scene(s: HeapState): Entity[] {
  const n = s.items.length;
  const tones: Record<number, Tone> = {};
  for (let k = s.size; k < n; k += 1) tones[k] = 'done';
  if (s.root !== undefined) {
    const kids = s.child !== undefined ? [s.child] : [2 * s.root + 1, 2 * s.root + 2];
    for (const c of kids) if (c < s.size) tones[c] = 'compare';
    tones[s.root] = 'active';
  }
  if (s.largest !== undefined && s.largest !== s.root) tones[s.largest] = 'found';
  if (s.done) for (let k = 0; k < n; k += 1) tones[k] = 'done';

  const entities: Entity[] = [
    arr('arr', 0, 0, s.items.map((it) => it.v), { label: 'arr', tones, codeVar: 'arr', itemKeys: s.items.map((it) => it.id) }),
  ];
  if (!s.done && s.size > 0) entities.push(range('heap', 'arr', 0, s.size - 1, 'compare'));
  if (s.root !== undefined) entities.push(ptr('root', 'arr', s.root, 'root', { tone: 'active', codeVar: 'root' }));

  // The tree: one block per value at its slot, edges from each parent slot to its children.
  const nodeId = (k: number): string => `node-${s.items[k]?.id ?? k}`;
  s.items.forEach((it, k) => {
    const pos = slotPos(k, n);
    entities.push(arr(nodeId(k), pos.x, pos.y, [it.v], { indexLabels: [k], tones: { 0: tones[k] ?? 'default' } }));
  });
  for (let c = 1; c < n; c += 1) {
    const p = Math.floor((c - 1) / 2);
    const inHeap = c < s.size && !s.done;
    const repairing = s.root === p && inHeap && (s.child === undefined || s.child === c);
    entities.push(
      link(`edge-${p}-${c}`, { entity: nodeId(p) }, { entity: nodeId(c) }, {
        tone: repairing ? 'compare' : inHeap ? 'default' : 'muted',
        dashed: !inHeap,
      }),
    );
  }

  const right = n * PITCH - GAP;
  const dash = (v: number | undefined): number | string => v ?? '—';
  const tone = (v: number | undefined): Tone => (v === undefined ? 'muted' : 'default');
  entities.push(
    vars(
      'vals',
      right + 80,
      0,
      [
        { name: 'size', value: s.size },
        { name: 'i', value: dash(s.i), tone: tone(s.i) },
        { name: 'end', value: dash(s.end), tone: tone(s.end) },
        { name: 'root', value: dash(s.root), tone: tone(s.root) },
        { name: 'largest', value: dash(s.largest), tone: tone(s.largest) },
      ],
      { label: 'variables', width: 170 },
    ),
  );
  if (s.note) entities.push(note('note', right + 40, 330, s.note, { tone: s.noteTone ?? 'note' }));
  return entities;
}

const show = (items: readonly Item[]): string => `[${items.map((it) => it.v).join(', ')}]`;

interface Emit {
  readonly short: string;
  readonly title: string;
  readonly body: string;
  readonly lines: readonly number[];
  readonly values: Readonly<Record<number, string>>;
  readonly view: Omit<HeapState, 'items'>;
  readonly result?: string;
}

/** How a heapify call was reached: the caller's lines and values, and a sentence saying so. */
interface Caller {
  readonly text: string;
  readonly lines: readonly number[];
  readonly values: Readonly<Record<number, string>>;
  readonly i?: number;
  readonly end?: number;
}

/**
 * Runs heap sort on any input and records every heapify call one decision per
 * step: the left-child check, the right-child check, then swap or stop.
 */
function traceHeap(values: readonly number[]): Step[] {
  const items = itemsOf(values);
  const n = items.length;
  const steps: Step[] = [];
  let swaps = 0;
  let heap = n;
  const v = (k: number): number => items[k]?.v ?? 0;
  const emit = (e: Emit): void => {
    steps.push({
      chapter: 'run',
      short: e.short,
      title: e.title,
      body: e.body,
      code: { view: 'final', lines: e.lines },
      values: e.values,
      metrics: { heap, swaps, result: e.result ?? '—' },
      scene: { entities: scene({ items: [...items], ...e.view }) },
    });
  };

  const heapify = (size: number, root: number, caller: Caller): void => {
    const left = 2 * root + 1;
    const right = 2 * root + 2;
    const ctx = { size, i: caller.i, end: caller.end };
    if (left >= size) {
      emit({
        short: `Leaf ${root}`,
        title: `heapify(arr, ${size}, ${root}): index ${root} is a leaf`,
        body: `${caller.text} Line 15: its children would be at ${left} and ${right}, but the heap only has ${size} item${size === 1 ? '' : 's'} (indexes 0–${size - 1}). Lines 16 and 18 find no child, so line 21 sees \`largest == root\` and the call ends.`,
        lines: [...caller.lines, 15, 16, 21],
        values: { ...caller.values, 15: `left, right = ${left}, ${right}`, 16: `${left} < ${size} → False`, 21: `${root} != ${root} → False` },
        view: { ...ctx, root, largest: root },
      });
      return;
    }
    let largest = root;
    const leftBigger = v(left) > v(root);
    const leftValues: Record<number, string> = {
      ...caller.values,
      14: `largest = ${root}`,
      15: `left, right = ${left}, ${right}`,
      16: `${left} < ${size} and ${v(left)} > ${v(root)} → ${leftBigger ? 'True' : 'False'}`,
    };
    if (leftBigger) leftValues[17] = `largest = ${left}`;
    emit({
      short: `Root ${root}: left`,
      title: `heapify(arr, ${size}, ${root}): is the left child ${v(left)} bigger than ${v(root)}?`,
      body: `${caller.text} Line 14: \`largest = ${root}\` for now. Line 15: its children are at ${left} and ${right}. Line 16: the left child holds ${v(left)}, ${leftBigger ? `bigger than ${v(root)}, so line 17 sets \`largest = ${left}\`` : `not bigger than ${v(root)}, so \`largest\` stays ${root}`}.`,
      lines: [...caller.lines, 14, 15, 16, ...(leftBigger ? [17] : [])],
      values: leftValues,
      view: { ...ctx, root, child: left, largest: leftBigger ? left : root },
    });
    if (leftBigger) largest = left;

    if (right < size) {
      const rightBigger = v(right) > v(largest);
      emit({
        short: 'Right child',
        title: `Is the right child ${v(right)} bigger than ${v(largest)}?`,
        body: `Line 18: the right child holds ${v(right)}. ${rightBigger ? `It beats ${v(largest)}, so line 19 sets \`largest = ${right}\`.` : `It is not bigger than ${v(largest)}, so \`largest\` stays ${largest}.`}`,
        lines: rightBigger ? [18, 19] : [18],
        values: rightBigger
          ? { 18: `${right} < ${size} and ${v(right)} > ${v(largest)} → True`, 19: `largest = ${right}` }
          : { 18: `${right} < ${size} and ${v(right)} > ${v(largest)} → False` },
        view: { ...ctx, root, child: right, largest: rightBigger ? right : largest },
      });
      if (rightBigger) largest = right;
    } else {
      emit({
        short: 'No right',
        title: `No right child: index ${right} is outside the heap`,
        body: `Line 18: \`${right} < ${size}\` is false, so there is no right child and \`largest\` stays ${largest}.`,
        lines: [18],
        values: { 18: `${right} < ${size} → False` },
        view: { ...ctx, root, largest },
      });
    }

    if (largest === root) {
      emit({
        short: 'Settled',
        title: `${v(root)} is at least as big as its children: settled`,
        body: `Line 21: \`largest == root\`, so ${v(root)} already obeys the heap rule here. Nothing moves and the call ends.`,
        lines: [21],
        values: { 21: `${largest} != ${root} → False` },
        view: { ...ctx, root, largest },
      });
      return;
    }
    const a = v(root);
    const b = v(largest);
    [items[root], items[largest]] = [items[largest] ?? { v: b, id: -1 }, items[root] ?? { v: a, id: -2 }];
    swaps += 1;
    emit({
      short: `Swap ${b}↔${a}`,
      title: `Swap ${b} up, ${a} down`,
      body: `Line 21: the biggest of the three is a child, so the heap rule is broken here. Line 22 swaps them: ${b} moves up to index ${root}, ${a} moves down to index ${largest}. ${show(items)}.`,
      lines: [21, 22],
      values: { 21: `${largest} != ${root} → True`, 22: `arr[${root}], arr[${largest}] = ${b}, ${a}` },
      view: { ...ctx, root, largest },
    });
    heapify(size, largest, {
      text: `Line 23 calls \`heapify(arr, ${size}, ${largest})\`: ${a} may still be smaller than its new children.`,
      lines: [23],
      values: { 23: `heapify(arr, ${size}, ${largest})` },
      ...(caller.i !== undefined ? { i: caller.i } : {}),
      ...(caller.end !== undefined ? { end: caller.end } : {}),
    });
  };

  const firstParent = Math.floor(n / 2) - 1;
  emit({
    short: 'Start',
    title: firstParent >= 0 ? `Build the heap: parents ${firstParent} down to 0` : 'One item: already a heap',
    body:
      firstParent >= 0
        ? `Line 2: \`n = ${n}\`. Indexes ${firstParent + 1}–${n - 1} are leaves (no children), so they are already tiny heaps. Line 4 repairs the parents, from \`i = ${n} // 2 - 1 = ${firstParent}\` back to the root.`
        : `Line 2: \`n = ${n}\`. No index has children, so the build loop on line 4 does nothing.`,
    lines: [2, 4],
    values: { 2: `n = ${n}`, 4: `i = ${firstParent}` },
    view: { size: n, ...(firstParent >= 0 ? { i: firstParent } : {}) },
  });
  for (let i = firstParent; i >= 0; i -= 1) {
    heapify(n, i, {
      text: `Line 4: \`i = ${i}\`. Line 5 calls \`heapify(arr, ${n}, ${i})\`.`,
      lines: [4, 5],
      values: { 4: `i = ${i}`, 5: `heapify(arr, ${n}, ${i})` },
      i,
    });
  }
  for (let end = n - 1; end > 0; end -= 1) {
    const top = v(0);
    const last = v(end);
    [items[0], items[end]] = [items[end] ?? { v: last, id: -1 }, items[0] ?? { v: top, id: -2 }];
    swaps += 1;
    heap = end;
    emit({
      short: `end = ${end}`,
      title: `Move the max ${top} to index ${end}`,
      body: `${end === n - 1 ? 'The heap is built: every parent is at least as big as its children, so the maximum is at the root. ' : ''}Line 7: \`end = ${end}\`. Line 8 swaps the root ${top} with \`arr[${end}]\`: ${show(items)}. Index ${end} is final, and the heap shrinks to ${end} item${end === 1 ? '' : 's'}.`,
      lines: [7, 8],
      values: { 7: `end = ${end}`, 8: `arr[0], arr[${end}] = ${last}, ${top}` },
      view: { size: end, end },
    });
    heapify(end, 0, {
      text: `Line 9 calls \`heapify(arr, ${end}, 0)\`: ${last} just landed on the root and may be too small.`,
      lines: [9],
      values: { 9: `heapify(arr, ${end}, 0)` },
      end,
    });
  }
  heap = 0;
  emit({
    short: 'Return',
    title: `Sorted: ${show(items)}`,
    body: `The loop on line 7 is done, so line 10 returns the array, sorted in place with ${swaps} swap${swaps === 1 ? '' : 's'}.`,
    lines: [10],
    values: { 10: `return ${show(items)}` },
    view: { size: 0, done: true },
    result: show(items),
  });
  return steps;
}

// Story input: [2, 4, 1, 3]. Ids are the original positions, so blocks keep their identity as they move.
const S = (...order: readonly number[]): Item[] => order.map((id) => ({ v: [2, 4, 1, 3][id] ?? 0, id }));
const START = S(0, 1, 2, 3); // [2, 4, 1, 3]
const SIFT = S(1, 0, 2, 3); // [4, 2, 1, 3]
const HEAP = S(1, 3, 2, 0); // [4, 3, 1, 2]
const OUT1 = S(0, 3, 2, 1); // [2, 3, 1, 4]
const OUT3 = S(2, 0, 3, 1); // [1, 2, 3, 4]
const RUN = traceHeap([2, 4, 1, 3]);
const RUN_START = 9;
const FINAL_METRICS = RUN.at(-1)?.metrics ?? { heap: 0, swaps: 0, result: '—' };

export default defineWalkthrough({
  id: 'learn/sorting/heap-sort',
  title: 'Heap Sort, the max rises to the top',
  summary: 'From the idea to the code: treat the array as a tree, make every parent bigger than its children, then move the biggest value to the end again and again.',
  minutes: 9,
  code: {
    lang: 'python',
    source: `def heap_sort(arr: list[int]) -> list[int]:
    n = len(arr)
    # Build max-heap bottom-up (leaf nodes are already valid heaps)
    for i in range(n // 2 - 1, -1, -1):
        heapify(arr, n, i)
    # Extract max root one by one to the end of the array
    for end in range(n - 1, 0, -1):
        arr[0], arr[end] = arr[end], arr[0]
        heapify(arr, end, 0)  # Restore heap on remaining items
    return arr


def heapify(arr: list[int], size: int, root: int) -> None:
    largest = root
    left, right = 2 * root + 1, 2 * root + 2
    if left < size and arr[left] > arr[largest]:
        largest = left
    if right < size and arr[right] > arr[largest]:
        largest = right
    # Sift down if a child is bigger than the current root
    if largest != root:
        arr[root], arr[largest] = arr[largest], arr[root]
        heapify(arr, size, largest)`,
  },
  metrics: [
    { key: 'heap', label: 'Heap size' },
    { key: 'swaps', label: 'Swaps' },
    { key: 'result', label: 'Returns' },
  ],
  legend: [
    { tone: 'active', label: 'root being repaired' },
    { tone: 'compare', label: 'child being checked / heap part' },
    { tone: 'found', label: 'largest so far' },
    { tone: 'done', label: 'in its final slot' },
    { tone: 'muted', label: 'edge outside the heap' },
  ],
  goals: [
    { text: 'See the tree hiding inside the array', step: 2 },
    { text: 'Build a max-heap, then peel off the max', step: 3 },
    { text: 'Write heapify: sift a value down', step: 6 },
    { text: 'Watch the heap being built, node by node', step: RUN_START + 1 },
    { text: 'See why heapify swaps with the bigger child', step: RUN_START + RUN.length + 2 },
  ],
  steps: [
    {
      chapter: 'problem',
      short: 'The brief',
      title: 'Sort [2, 4, 1, 3] in place',
      body: 'Like a knockout tournament: the strongest player rises to the top, then the rest play again for the next spot.\n\nLine 1 takes a list `arr` and sorts it in place, smallest to largest.',
      code: { view: 'signature', lines: [1] },
      metrics: { heap: 4, swaps: 0, result: '—' },
      scene: { entities: scene({ items: START, size: 4 }) },
    },
    {
      chapter: 'idea',
      short: 'Hidden tree',
      title: 'Index k’s children are 2k + 1 and 2k + 2',
      body: 'The same array, read as a tree (below): index 0 is the root, and index `k` has children `2k + 1` and `2k + 2`. In a **max-heap** every parent is at least as big as its children, so the maximum sits at index 0.\n\nRepeatedly swap that maximum to the end and repair the heap: the array fills up from the back in order.',
      code: { view: 'signature' },
      metrics: { heap: 4, swaps: 0, result: '—' },
      scene: { entities: scene({ items: HEAP, size: 4, note: 'max-heap: 4 ≥ 3, 1  and  3 ≥ 2\n[0] → [1] [2]     [1] → [3]' }) },
    },
    {
      chapter: 'build',
      short: 'Build heap',
      title: 'Lines 2–4: start from the last parent',
      body: 'Leaves have no children, so they are already tiny heaps. Line 4 walks the parents from the last one, `n // 2 − 1`, back to the root, so every subtree below is already a heap when its parent is repaired.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4], lines: [2, 4] },
      metrics: { heap: 4, swaps: 0, result: '—' },
      changes: ['n = len(arr)', 'for i in range(n // 2 - 1, -1, -1)'],
      scene: { entities: scene({ items: START, size: 4, i: 1 }) },
    },
    {
      chapter: 'build',
      short: 'Extract loop',
      title: 'Lines 5–7: repair each parent, then extract',
      body: 'Line 5 calls `heapify` (written below) to push each parent down until it is bigger than its children. Line 7 then walks `end` from the last slot down to 1.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5, 6, 7], lines: [5, 7] },
      metrics: { heap: 4, swaps: 0, result: '—' },
      changes: ['heapify(arr, n, i)', 'for end in range(n - 1, 0, -1)'],
      scene: { entities: scene({ items: HEAP, size: 4 }) },
    },
    {
      chapter: 'build',
      short: 'Swap max',
      title: 'Lines 8–10: move the max to the end',
      body: 'Line 8 swaps the root, the biggest value, into `arr[end]`, where it is final. Line 9 repairs the smaller heap of `end` items. Line 10 returns the sorted array.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], lines: [8, 9, 10] },
      metrics: { heap: 3, swaps: 1, result: '—' },
      changes: ['arr[0], arr[end] = arr[end], arr[0]', 'heapify(arr, end, 0)', 'return arr'],
      scene: { entities: scene({ items: OUT1, size: 3, end: 3 }) },
    },
    {
      chapter: 'build',
      short: 'heapify',
      title: 'Lines 13–15: the root and its two children',
      body: '`heapify` repairs one node. Line 14 assumes the root is the largest, and line 15 finds its children with the `2k + 1`, `2k + 2` rule.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 13, 14, 15], lines: [14, 15] },
      metrics: { heap: 4, swaps: 0, result: '—' },
      changes: ['largest = root', 'left, right = 2 * root + 1, 2 * root + 2'],
      scene: { entities: scene({ items: START, size: 4, root: 0, largest: 0 }) },
    },
    {
      chapter: 'build',
      short: 'Left child',
      title: 'Lines 16–18: is the left child bigger?',
      body: 'Line 16 checks that the left child exists inside the heap (`left < size`) and is bigger; if so, line 17 makes it the largest. Line 18 starts the same check for the right child.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 13, 14, 15, 16, 17, 18], lines: [16, 17, 18] },
      metrics: { heap: 4, swaps: 0, result: '—' },
      changes: ['if left < size and arr[left] > arr[largest]: largest = left'],
      scene: { entities: scene({ items: START, size: 4, root: 0, child: 1, largest: 1 }) },
    },
    {
      chapter: 'build',
      short: 'Right child',
      title: 'Lines 19–21: right child, then decide',
      body: 'Line 19 picks the right child if it is bigger still. Line 21 asks whether the largest is a child, which means the root is out of place.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 13, 14, 15, 16, 17, 18, 19, 20, 21], lines: [19, 21] },
      metrics: { heap: 4, swaps: 0, result: '—' },
      changes: ['largest = right', 'if largest != root'],
      scene: { entities: scene({ items: START, size: 4, root: 0, largest: 1 }) },
    },
    {
      chapter: 'build',
      short: 'Sift down',
      title: 'Lines 22–23: swap, then keep sifting',
      body: 'Line 22 swaps the bigger child up and the root down. Line 23 repeats `heapify` where the root landed, until it settles.\n\nNow let’s run it, one check at a time. Watch the tree under the array.',
      code: { view: 'final', lines: [22, 23] },
      metrics: { heap: 4, swaps: 1, result: '—' },
      changes: ['arr[root], arr[largest] = arr[largest], arr[root]', 'heapify(arr, size, largest)'],
      scene: { entities: scene({ items: SIFT, size: 4, root: 0, largest: 1 }) },
    },
    ...RUN,
    {
      chapter: 'why',
      short: 'Recap',
      title: 'n extractions, each O(log n)',
      body: 'The tree has about `log₂ n` levels, so one `heapify` sifts at most that far. Building the heap takes `O(n)`, and each of the `n` extractions costs `O(log n)`: **`O(n log n)` time** in every case, with `O(1)` extra space.\n\nIts long swaps make it **not stable**.',
      code: { view: 'final', lines: [7, 9] },
      metrics: FINAL_METRICS,
      scene: { entities: scene({ items: OUT3, size: 0, done: true, note: 'n = 1,000,000:\n~20 levels per sift-down', noteTone: 'found' }) },
    },
    {
      chapter: 'why',
      short: 'Sift down',
      title: 'Why lines 22–23 swap with the bigger child',
      body: 'After line 8 drops a small value onto the root, only that root breaks the heap rule. Swapping it with its **bigger** child keeps the new parent ≥ both children, and line 23 follows the value down one level at a time.\n\nPicking the bigger child is the key decision: with the smaller one, the heap rule would break.',
      code: { view: 'final', lines: [16, 18, 22, 23] },
      values: { 22: 'bigger child moves up', 23: 'repeat one level down' },
      metrics: { heap: 3, swaps: 4, result: '—' },
      scene: { entities: scene({ items: OUT1, size: 3, root: 0, largest: 1, note: 'root 2, children 3 and 1:\nswap with 3 → 3 ≥ 2 and 3 ≥ 1  ✓\nswap with 1 → 1 < 3            ✗' }) },
    },
  ],
  trace: {
    title: 'Run heap sort on your own numbers',
    inputs: [{ name: 'arr', label: 'Numbers to sort', kind: 'numbers', default: '2, 4, 1, 3' }],
    presets: [
      { label: 'Textbook', values: { arr: '4, 10, 3, 5, 1' } },
      { label: 'Already a heap', values: { arr: '9, 7, 8, 3, 5' } },
      { label: 'Sorted', values: { arr: '1, 2, 3, 4, 5' } },
      { label: 'Duplicates', values: { arr: '3, 1, 3, 2' } },
    ],
    maxItems: 7,
    run: (values) => {
      const input = values['arr'];
      if (!Array.isArray(input) || input.length === 0) throw new Error('Enter at least one number.');
      return traceHeap(input);
    },
  },
});
