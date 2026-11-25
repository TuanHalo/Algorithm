import { arr, defineWalkthrough, note, vars } from '../../../lib/walkthrough/helpers';
import { GAP, PITCH } from '../../../lib/walkthrough/layout';
import { heapify, heappop, heappush, treeEntities, treeSlots } from '../../../lib/walkthrough/merge-tree';
import type { TreeDraw, TreeEdge, TreeShape } from '../../../lib/walkthrough/merge-tree';
import type { Entity, Step, Tone } from '../../../lib/walkthrough/types';

/** A file (or a merged file) in the heap: its size and the tree node it stands for. */
interface Item {
  readonly v: number;
  readonly id: string;
}

interface MergeNode extends TreeShape {
  readonly v: number;
}

interface Plan {
  readonly nodes: readonly MergeNode[];
  readonly rootId: string;
  /** Number of files (leaves). */
  readonly files: number;
}

const lt = (a: Item, b: Item): boolean => a.v < b.v;

/** Runs the algorithm once, silently, to learn the finished tree so every node can be drawn at its final spot. */
function planMerges(sizes: readonly number[]): Plan {
  const heap: Item[] = sizes.map((v, i) => ({ v, id: `f${i}` }));
  const nodes: MergeNode[] = heap.map((it) => ({ id: it.id, v: it.v }));
  heapify(heap, lt);
  let made = 0;
  while (heap.length > 1) {
    const first = heappop(heap, lt);
    const second = heappop(heap, lt);
    const id = `m${made}`;
    made += 1;
    nodes.push({ id, v: first.v + second.v, left: first.id, right: second.id });
    heappush(heap, { v: first.v + second.v, id }, lt);
  }
  return { nodes, rootId: heap[0]?.id ?? 'f0', files: sizes.length };
}

type Phase = 'pop1' | 'pop2' | 'cost' | 'push';

interface MergeState {
  readonly plan: Plan;
  readonly heap: readonly Item[];
  /** Merged nodes that exist so far. */
  readonly created: readonly string[];
  /** Nodes already merged into a parent. */
  readonly consumed: readonly string[];
  readonly first?: Item;
  readonly second?: Item;
  readonly fresh?: string;
  readonly phase?: Phase;
  readonly cost?: number;
  readonly total: number;
  readonly note?: string;
  readonly noteTone?: Tone;
  /** Draw only the tree (the idea steps). */
  readonly bare?: boolean;
  /** Tone overrides by node id. */
  readonly mark?: Readonly<Record<string, Tone>>;
}

/** Scene: the heap array and variables on the right, the merge tree on the left. */
function scene(s: MergeState): Entity[] {
  const slots = treeSlots(s.plan.nodes, s.plan.rootId);
  const present = new Set([...s.plan.nodes.filter((n) => n.left === undefined).map((n) => n.id), ...s.created]);
  const tone = (id: string): Tone => {
    if (s.mark?.[id]) return s.mark[id] ?? 'default';
    if (s.phase === 'pop1' && id === s.first?.id) return 'active';
    if (s.phase === 'pop2') return id === s.second?.id ? 'active' : id === s.first?.id ? 'compare' : s.consumed.includes(id) ? 'done' : 'default';
    if (s.phase === 'cost' && (id === s.first?.id || id === s.second?.id)) return 'compare';
    if (s.phase === 'push' && id === s.fresh) return 'active';
    return s.consumed.includes(id) ? 'done' : 'default';
  };
  const draws: TreeDraw[] = s.plan.nodes.filter((n) => present.has(n.id)).map((n) => ({ id: n.id, value: n.v, caption: '', tone: tone(n.id) }));
  const edges: TreeEdge[] = s.plan.nodes
    .filter((n) => n.left !== undefined && n.right !== undefined && present.has(n.id))
    .flatMap((n) => [n.left as string, n.right as string].map((c) => ({ from: n.id, to: c, tone: n.id === s.fresh ? ('compare' as Tone) : ('default' as Tone) })));
  const entities: Entity[] = treeEntities(slots, draws, edges);

  if (!s.bare) {
    if (s.heap.length > 0) {
      entities.push(
        arr('heap', 0, 0, s.heap.map((it) => it.v), { label: 'heap', codeVar: 'heap', itemKeys: s.heap.map((it) => it.id), tones: s.phase === 'push' && s.fresh ? Object.fromEntries(s.heap.flatMap((it, k) => (it.id === s.fresh ? [[k, 'active' as Tone]] : []))) : {} }),
      );
    }
    const right = s.plan.files * PITCH - GAP;
    entities.push(
      vars(
        'vals',
        right + 80,
        0,
        [
          { name: 'first', value: s.first?.v ?? '—', tone: s.first ? 'default' : 'muted' },
          { name: 'second', value: s.second?.v ?? '—', tone: s.second ? 'default' : 'muted' },
          { name: 'merge_cost', value: s.cost ?? '—', tone: s.cost === undefined ? 'muted' : 'default' },
          { name: 'total_cost', value: s.total },
        ],
        { label: 'variables', width: 180 },
      ),
    );
  }
  if (s.note) entities.push(note('note', s.bare ? -120 : s.plan.files * PITCH - GAP + 40, s.bare ? 330 : 330, s.note, { tone: s.noteTone ?? 'note' }));
  return entities;
}

/** Runs optimal merge on any input and records one step per decision (chapter "run", final code). */
function traceMerge(sizes: readonly number[]): Step[] {
  const plan = planMerges(sizes);
  const heap: Item[] = sizes.map((v, i) => ({ v, id: `f${i}` }));
  const steps: Step[] = [];
  const created: string[] = [];
  const consumed: string[] = [];
  let total = 0;
  let merges = 0;
  const metrics = (result: string | number = '—'): Record<string, string | number> => ({ merges, totalCost: total, result });
  const state = (extra: Partial<MergeState>): Entity[] => scene({ plan, heap: [...heap], created: [...created], consumed: [...consumed], total, ...extra });
  const list = (): string => `[${heap.map((it) => it.v).join(', ')}]`;

  heapify(heap, lt);
  steps.push({
    chapter: 'run',
    short: 'Heapify',
    title: `Turn ${sizes.length} file size${sizes.length === 1 ? '' : 's'} into a min-heap`,
    body: `Line 5 copies the sizes into \`heap\`. Line 6 \`heapify\`s it, so the smallest size sits at \`heap[0]\`: the heap now reads ${list()}. Line 7 starts \`total_cost = 0\`.\n\nThe leaves of the tree on the left are the original files.`,
    code: { view: 'final', lines: [5, 6, 7] },
    values: { 5: `heap = ${JSON.stringify(sizes)}`, 6: `heap = ${list()}`, 7: 'total_cost = 0' },
    metrics: metrics(),
    scene: { entities: state({}) },
  });

  while (heap.length > 1) {
    const sizeBefore = heap.length;
    const first = heappop(heap, lt);
    steps.push({
      chapter: 'run',
      short: `Pop ${first.v}`,
      title: `Pop the smallest file: ${first.v}`,
      body: `Line 9: \`len(heap) > 1\` is true (${sizeBefore} files), so another merge is needed. Line 10 pops the smallest: \`first = ${first.v}\`. The heap is now ${list()}.`,
      code: { view: 'final', lines: [9, 10] },
      values: { 9: `${sizeBefore} > 1 → True`, 10: `first = ${first.v}` },
      metrics: metrics(),
      scene: { entities: state({ first, phase: 'pop1' }) },
    });
    const second = heappop(heap, lt);
    steps.push({
      chapter: 'run',
      short: `Pop ${second.v}`,
      title: `Pop the next smallest: ${second.v}`,
      body: `Line 11 pops again: \`second = ${second.v}\`. These are the two smallest files, so they are merged first and sit deepest in the tree.`,
      code: { view: 'final', lines: [11] },
      values: { 11: `second = ${second.v}` },
      metrics: metrics(),
      scene: { entities: state({ first, second, phase: 'pop2' }) },
    });
    const cost = first.v + second.v;
    total += cost;
    merges += 1;
    steps.push({
      chapter: 'run',
      short: `Cost ${cost}`,
      title: `Merging ${first.v} and ${second.v} costs ${cost}`,
      body: `Line 12: \`merge_cost = ${first.v} + ${second.v} = ${cost}\`: both files are read and written once. Line 13 adds it to the running total: \`total_cost = ${total}\`.`,
      code: { view: 'final', lines: [12, 13] },
      values: { 12: `merge_cost = ${first.v} + ${second.v} = ${cost}`, 13: `total_cost = ${total}` },
      changes: [`total_cost = ${total}`],
      metrics: metrics(),
      scene: { entities: state({ first, second, cost, phase: 'cost' }) },
    });
    const id = `m${created.length}`;
    created.push(id);
    consumed.push(first.id, second.id);
    heappush(heap, { v: cost, id }, lt);
    steps.push({
      chapter: 'run',
      short: `Push ${cost}`,
      title: `Push the merged file ${cost} back`,
      body: `Line 14 pushes \`${cost}\` back onto the heap, which is now ${list()}. In the tree, the new file ${cost} becomes the parent of ${first.v} and ${second.v}.\n\nThe merged file may be merged again later, so its size is paid again.`,
      code: { view: 'final', lines: [14] },
      values: { 14: `heap = ${list()}` },
      changes: [`new tree node ${cost} = ${first.v} + ${second.v}`],
      metrics: metrics(),
      scene: { entities: state({ first, second, cost, fresh: id, phase: 'push' }) },
    });
  }

  const only = heap[0];
  steps.push({
    chapter: 'run',
    short: 'Return',
    title: `One file left: return ${total}`,
    body: `Line 9: \`len(heap) > 1\` is false, so there is a single file${only ? ` of size ${only.v}` : ''}. Line 16 returns **${total}**, the cheapest total cost${merges === 0 ? ' (there was nothing to merge)' : ` of ${merges} merge${merges === 1 ? '' : 's'}`}.`,
    code: { view: 'final', lines: [9, 16] },
    values: { 9: `${heap.length} > 1 → False`, 16: `return ${total}` },
    metrics: metrics(total),
    scene: { entities: state({ mark: { [plan.rootId]: 'found' } }) },
  });
  return steps;
}

const SIZES = [5, 2, 4, 7] as const;
const RUN = traceMerge(SIZES);
const PLAN = planMerges(SIZES);
const at = (n: number): Step['scene'] => RUN[n]?.scene ?? { entities: [] };
const startMetrics = { merges: 0, totalCost: 0, result: '—' } as const;
const FINAL_METRICS = RUN.at(-1)?.metrics ?? startMetrics;
const ALL = PLAN.nodes.filter((n) => n.left !== undefined).map((n) => n.id);

export default defineWalkthrough({
  id: 'learn/greedy/optimal-merge-patterns',
  title: 'Optimal Merge Patterns, always merge the two smallest',
  summary: 'From re-copied files to the code: merge files two at a time with a min-heap, smallest pair first, and watch the merge tree grow.',
  minutes: 8,
  code: {
    lang: 'python',
    source: `import heapq


def optimal_merge_cost(file_sizes: list[int]) -> int:
    heap = list(file_sizes)
    heapq.heapify(heap)
    total_cost = 0

    while len(heap) > 1:
        first = heapq.heappop(heap)
        second = heapq.heappop(heap)
        merge_cost = first + second
        total_cost += merge_cost
        heapq.heappush(heap, merge_cost)

    return total_cost`,
  },
  metrics: [
    { key: 'merges', label: 'Merges' },
    { key: 'totalCost', label: 'Total cost' },
    { key: 'result', label: 'Returns' },
  ],
  legend: [
    { tone: 'active', label: 'file being popped / new file' },
    { tone: 'compare', label: 'files being merged' },
    { tone: 'done', label: 'already merged' },
    { tone: 'found', label: 'the finished file' },
  ],
  goals: [
    { text: 'See why a file’s size is paid once per merge above it', step: 2 },
    { text: 'Build the heap loop one idea at a time', step: 4 },
    { text: 'Follow every pop, cost and push', step: 9 },
    { text: 'Know why the two smallest go first', step: 24 },
  ],
  steps: [
    {
      chapter: 'problem',
      short: 'The brief',
      title: 'Merge 4 files into one as cheaply as possible',
      body: 'Merging two files copies both, so it costs the **sum of their sizes**. Merged files can be merged again, but only two at a time.\n\nLine 4 takes the `file_sizes` and returns the lowest total cost of merging them all into one. Here: sizes 5, 2, 4 and 7.',
      code: { view: 'signature', lines: [4] },
      metrics: startMetrics,
      scene: { entities: scene({ plan: PLAN, heap: [], created: [], consumed: [], total: 0, bare: true }) },
    },
    {
      chapter: 'idea',
      short: 'Pay per level',
      title: 'A file is paid again for every merge above it',
      body: 'Merging 2 and 4 gives a file of 6. If that is merged again, the 2 and the 4 are copied **again**. So each size is paid once per level of the merge tree above it: `cost = Σ size × depth`.\n\nHere the merge tree ends up with 2 and 4 three levels deep, 5 two levels and 7 one: `6 + 12 + 10 + 7 = 35`.',
      code: { view: 'signature' },
      metrics: { merges: 3, totalCost: 35, result: '—' },
      scene: { entities: scene({ plan: PLAN, heap: [], created: ALL, consumed: [], total: 35, bare: true, note: '2·3 + 4·3 + 5·2 + 7·1 = 35', noteTone: 'found' }) },
    },
    {
      chapter: 'idea',
      short: 'Smallest first',
      title: 'So the smallest files should sit deepest',
      body: 'To pay the most levels for the **smallest** sizes, merge the two smallest files first, then repeat with what is left. Merging the biggest first would cost 7 + 5 = 12, then 16, then 18: **46**, not 35.\n\nWe need the two smallest files over and over, and a min-heap hands them out in `O(log n)`.',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: { entities: scene({ plan: PLAN, heap: [], created: ALL, consumed: [], total: 35, bare: true, mark: { f1: 'compare', f2: 'compare' }, note: 'smallest first: 35\nbiggest first: 46' }) },
    },
    {
      chapter: 'build',
      short: 'Min-heap',
      title: 'Lines 5–6: put the sizes into a min-heap',
      body: '`heapq.heapify` rearranges the list in place so that `heap[0]` is always the smallest size. Popping from it returns sizes in increasing order.',
      code: { view: 'reveal', reveal: [1, 4, 5, 6], lines: [5, 6] },
      metrics: startMetrics,
      changes: ['heap = list(file_sizes)', 'heapq.heapify(heap)'],
      scene: at(0),
    },
    {
      chapter: 'build',
      short: 'Loop',
      title: 'Lines 7 and 9: a running cost, and merge until one file is left',
      body: '`total_cost` adds up every merge. While more than one file is in the heap, there is still a merge to do.',
      code: { view: 'reveal', reveal: [1, 4, 5, 6, 7, 9], lines: [7, 9] },
      metrics: startMetrics,
      changes: ['total_cost = 0', 'while len(heap) > 1'],
      scene: at(0),
    },
    {
      chapter: 'build',
      short: 'Two smallest',
      title: 'Lines 10–11: pop the two smallest files',
      body: 'Two pops in a row give the two smallest sizes: `first` and `second`. They leave the heap, because they are about to become one file.',
      code: { view: 'reveal', reveal: [1, 4, 5, 6, 7, 9, 10, 11], lines: [10, 11] },
      metrics: startMetrics,
      changes: ['first = heappop(heap)', 'second = heappop(heap)'],
      scene: at(2),
    },
    {
      chapter: 'build',
      short: 'Merge',
      title: 'Lines 12–14: pay for the merge and push the new file back',
      body: 'The merge costs `first + second`, which is added to the total. The merged file goes back on the heap, because it may need merging again.',
      code: { view: 'reveal', reveal: [1, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14], lines: [12, 13, 14] },
      metrics: { merges: 1, totalCost: 6, result: '—' },
      changes: ['merge_cost = first + second', 'total_cost += merge_cost', 'heappush(heap, merge_cost)'],
      scene: at(4),
    },
    {
      chapter: 'build',
      short: 'Return',
      title: 'Line 16: return the total',
      body: 'When one file is left, everything is merged and `total_cost` is the cheapest cost.\n\nThat’s the whole function. Now let’s run it.',
      code: { view: 'final', lines: [16] },
      metrics: FINAL_METRICS,
      changes: ['return total_cost'],
      scene: at(RUN.length - 1),
    },
    ...RUN,
    {
      chapter: 'why',
      short: 'Recap',
      title: 'n − 1 merges, each with heap work: O(n log n)',
      body: 'Building the heap is `O(n)`. Then there are `n − 1` merges, each doing two pops and one push at `O(log n)`, so **`O(n log n)` time**. The heap holds at most `n` sizes: `O(n)` space.\n\nSwitch to **🧪 Try your own** to merge your own files.',
      code: { view: 'final', lines: [6, 9] },
      metrics: FINAL_METRICS,
      scene: { entities: scene({ plan: PLAN, heap: [{ v: 18, id: 'm2' }], created: ALL, consumed: ['f0', 'f1', 'f2', 'f3', 'm0', 'm1'], total: 35, mark: { m2: 'found' }, note: 'n = 4 files → 3 merges' }) },
    },
    {
      chapter: 'why',
      short: 'Two smallest',
      title: 'Lines 10–11 always take the two smallest, so small files go deepest',
      body: 'Every pop returns the smallest size left, so small files are merged early and end up deep in the tree, where they are paid for the most levels. Big files wait and are paid once or twice.\n\nThat is the key decision: swapping a larger file into an earlier merge would multiply a bigger size by more levels, so the total could only grow. The greedy choice is optimal. It is exactly how Huffman coding builds its tree.',
      code: { view: 'final', lines: [10, 11] },
      values: { 10: 'first = 2, then 4, then 5', 11: 'second = 4, then 6, then 7' },
      metrics: FINAL_METRICS,
      scene: { entities: scene({ plan: PLAN, heap: [], created: ALL, consumed: [], total: 35, bare: true, mark: { f1: 'compare', f2: 'compare', m0: 'compare' }, note: '2 and 4 sit deepest: paid 3 times' }) },
    },
  ],
  trace: {
    title: 'Run optimal merge on your own file sizes',
    inputs: [{ name: 'sizes', label: 'File sizes (up to 6)', kind: 'numbers', default: '5, 2, 4, 7' }],
    presets: [
      { label: 'Four files', values: { sizes: '5, 2, 4, 7' } },
      { label: 'Five files', values: { sizes: '20, 4, 30, 5, 12' } },
      { label: 'Two files', values: { sizes: '3, 8' } },
      { label: 'One file', values: { sizes: '10' } },
      { label: 'Equal sizes', values: { sizes: '4, 4, 4, 4' } },
      { label: 'Doubling', values: { sizes: '1, 2, 4, 8, 16' } },
    ],
    maxItems: 6,
    run: (values) => {
      const sizes = values['sizes'];
      if (!Array.isArray(sizes) || sizes.length === 0) throw new Error('Enter some file sizes.');
      if (sizes.some((s) => s < 1)) throw new Error('File sizes must be 1 or more.');
      return traceMerge(sizes);
    },
  },
});
