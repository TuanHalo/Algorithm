import { arr, defineWalkthrough, map, note, vars } from '../../../lib/walkthrough/helpers';
import { GAP, PITCH } from '../../../lib/walkthrough/layout';
import { heapify, heappop, heappush, treeEntities, treeSlots } from '../../../lib/walkthrough/merge-tree';
import type { TreeDraw, TreeEdge, TreeShape } from '../../../lib/walkthrough/merge-tree';
import type { Entity, MapEntry, Step, Tone, VarRow } from '../../../lib/walkthrough/types';

const letter = (i: number): string => String.fromCharCode(65 + i);

/** A heap entry `(freq, uid, node)`: Python compares freq first, then uid. */
interface Item {
  readonly v: number;
  readonly uid: number;
  readonly id: string;
}

interface HNode extends TreeShape {
  readonly v: number;
}

interface Plan {
  readonly nodes: readonly HNode[];
  readonly rootId: string;
  readonly symbols: number;
  /** Final code of every leaf (`prefix or "0"`). */
  readonly codes: ReadonlyMap<string, string>;
}

const lt = (a: Item, b: Item): boolean => a.v < b.v || (a.v === b.v && a.uid < b.uid);

/** Runs the algorithm once, silently, so every node can be drawn at its final spot. */
function planHuffman(freqs: readonly number[]): Plan {
  const heap: Item[] = freqs.map((v, i) => ({ v, uid: i, id: letter(i) }));
  const nodes: HNode[] = heap.map((it) => ({ id: it.id, v: it.v }));
  heapify(heap, lt);
  let uid = heap.length;
  let made = 0;
  while (heap.length > 1) {
    const a = heappop(heap, lt);
    const b = heappop(heap, lt);
    const id = `m${made}`;
    made += 1;
    nodes.push({ id, v: a.v + b.v, left: a.id, right: b.id });
    heappush(heap, { v: a.v + b.v, uid, id }, lt);
    uid += 1;
  }
  const rootId = heap[0]?.id ?? 'A';
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const codes = new Map<string, string>();
  const walk = (id: string, prefix: string): void => {
    const node = byId.get(id);
    if (node?.left === undefined || node.right === undefined) {
      codes.set(id, prefix || '0');
      return;
    }
    walk(node.left, `${prefix}0`);
    walk(node.right, `${prefix}1`);
  };
  walk(rootId, '');
  return { nodes, rootId, symbols: freqs.length, codes };
}

type Phase = 'pop1' | 'pop2' | 'push';

interface HuffState {
  readonly plan: Plan;
  readonly heap: readonly Item[];
  readonly created: readonly string[];
  readonly consumed: readonly string[];
  readonly f1?: Item;
  readonly f2?: Item;
  readonly fresh?: string;
  readonly phase?: Phase;
  readonly uid: number;
  /** Walk phase: the node being walked, its ancestors, the nodes entered so far and the codes stored. */
  readonly walkAt?: string;
  readonly prefix?: string;
  readonly stack?: readonly string[];
  readonly entered?: readonly string[];
  readonly stored?: readonly string[];
  /** Show the codes table (line 17 onwards). */
  readonly showCodes?: boolean;
  /** Draw only the tree (idea steps). */
  readonly bare?: boolean;
  readonly mark?: Readonly<Record<string, Tone>>;
  readonly note?: string;
  readonly noteTone?: Tone;
}

/** Scene: the tree on the left, the heap, variables and codes table on the right. */
function scene(s: HuffState): Entity[] {
  const slots = treeSlots(s.plan.nodes, s.plan.rootId);
  const leaf = (n: HNode): boolean => n.left === undefined;
  const present = new Set([...s.plan.nodes.filter(leaf).map((n) => n.id), ...s.created]);
  const stored = new Set(s.stored ?? []);
  const tone = (id: string): Tone => {
    if (s.mark?.[id]) return s.mark[id] ?? 'default';
    if (s.walkAt !== undefined) return id === s.walkAt ? 'active' : stored.has(id) ? 'found' : s.stack?.includes(id) ? 'compare' : 'default';
    if (s.phase === 'pop1' && id === s.f1?.id) return 'active';
    if (s.phase === 'pop2') return id === s.f2?.id ? 'active' : id === s.f1?.id ? 'compare' : s.consumed.includes(id) ? 'done' : 'default';
    if (s.phase === 'push' && id === s.fresh) return 'active';
    return s.consumed.includes(id) ? 'done' : 'default';
  };
  const caption = (n: HNode): string => {
    if (!leaf(n)) return '';
    return stored.has(n.id) ? `${n.id}=${s.plan.codes.get(n.id) ?? ''}` : n.id;
  };
  const draws: TreeDraw[] = s.plan.nodes.filter((n) => present.has(n.id)).map((n) => ({ id: n.id, value: n.v, caption: caption(n), tone: tone(n.id) }));
  const entered = new Set(s.entered ?? []);
  const edges: TreeEdge[] = s.plan.nodes
    .filter((n) => n.left !== undefined && n.right !== undefined && present.has(n.id))
    .flatMap((n) =>
      [n.left as string, n.right as string].map((c, bit) => ({
        from: n.id,
        to: c,
        tone: (n.id === s.fresh || (s.walkAt !== undefined && entered.has(c)) ? 'compare' : 'default') as Tone,
        label: s.walkAt !== undefined && entered.has(c) ? String(bit) : s.bare && s.showCodes ? String(bit) : undefined,
      })),
    );
  const entities: Entity[] = treeEntities(slots, draws, edges);

  if (s.bare) {
    if (s.note) entities.push(note('note', -120, 330, s.note, { tone: s.noteTone ?? 'note' }));
    return entities;
  }
  const right = s.plan.symbols * PITCH - GAP;
  const x = right + 80;
  if (s.heap.length > 0) {
    entities.push(
      arr('heap', 0, 0, s.heap.map((it) => it.v), {
        label: 'heap (freq; symbol or uid below)',
        codeVar: 'heap',
        itemKeys: s.heap.map((it) => it.id),
        indexLabels: s.heap.map((it) => (it.id.startsWith('m') ? `#${it.uid}` : it.id)),
        tones: s.phase === 'push' && s.fresh ? Object.fromEntries(s.heap.flatMap((it, k) => (it.id === s.fresh ? [[k, 'active' as Tone]] : []))) : {},
      }),
    );
  }
  const walking = s.walkAt !== undefined || s.showCodes === true;
  const rows: VarRow[] = walking
    ? [
        { name: 'node', value: s.walkAt === undefined ? '—' : leaf(s.plan.nodes.find((n) => n.id === s.walkAt) ?? { id: '', v: 0 }) ? `'${s.walkAt}'` : `pair ${s.plan.nodes.find((n) => n.id === s.walkAt)?.v ?? ''}`, tone: s.walkAt === undefined ? 'muted' : 'default' },
        { name: 'prefix', value: s.prefix === undefined ? '—' : `'${s.prefix}'`, tone: s.prefix === undefined ? 'muted' : 'default' },
      ]
    : [
        { name: 'f1', value: s.f1?.v ?? '—', tone: s.f1 ? 'default' : 'muted' },
        { name: 'f2', value: s.f2?.v ?? '—', tone: s.f2 ? 'default' : 'muted' },
        { name: 'uid', value: s.uid },
      ];
  entities.push(vars('vals', x, 0, rows, { label: 'variables', width: 180 }));
  if (s.showCodes) {
    const entries: MapEntry[] = (s.stored ?? []).map((id) => ({ key: id, value: `'${s.plan.codes.get(id) ?? ''}'`, tone: id === s.walkAt ? 'active' : 'done' }));
    entities.push(map('codes', x, 150, 'codes', entries, { width: 180, codeVar: 'codes' }));
  }
  if (s.note) entities.push(note('note', x - 40, 330, s.note, { tone: s.noteTone ?? 'note' }));
  return entities;
}

/** Runs Huffman coding on any frequencies and records one step per decision (chapter "run", final code). */
function traceHuffman(freqs: readonly number[]): Step[] {
  const plan = planHuffman(freqs);
  const byId = new Map(plan.nodes.map((n) => [n.id, n]));
  const heap: Item[] = freqs.map((v, i) => ({ v, uid: i, id: letter(i) }));
  const steps: Step[] = [];
  const created: string[] = [];
  const consumed: string[] = [];
  const stored: string[] = [];
  let uid = heap.length;
  let merges = 0;
  const metrics = (result: string | number = '—'): Record<string, string | number> => ({ merges, codes: stored.length, result });
  const state = (extra: Partial<HuffState>): Entity[] => scene({ plan, heap: [...heap], created: [...created], consumed: [...consumed], uid, ...extra });
  const list = (): string => `[${heap.map((it) => it.v).join(', ')}]`;
  const name = (id: string): string => (byId.get(id)?.left === undefined ? `'${id}'` : `the pair of weight ${byId.get(id)?.v}`);

  steps.push({
    chapter: 'run',
    short: 'Leaf tuples',
    title: `One heap entry per symbol: (freq, idx, char)`,
    body: `Lines 5–7 build a tuple \`(freq, idx, ch)\` for each of the ${freqs.length} symbols. The \`idx\` (their position, 0, 1, 2…) will break ties between equal frequencies. The tree on the left shows the symbols as leaves.`,
    code: { view: 'final', lines: [5, 6, 7] },
    values: { 6: `entries: ${heap.map((it) => `(${it.v}, ${it.uid}, '${it.id}')`).join(' ')}` },
    metrics: metrics(),
    scene: { entities: state({}) },
  });
  heapify(heap, lt);
  steps.push({
    chapter: 'run',
    short: 'Heapify',
    title: 'Heapify, and start numbering new nodes after the leaves',
    body: `Line 8 \`heapify\`s the entries by frequency, so the lightest symbol is at \`heap[0]\`: ${list()}. Line 9 sets \`uid = ${uid}\`, the next free number for merged nodes.`,
    code: { view: 'final', lines: [8, 9] },
    values: { 8: `heap = ${list()}`, 9: `uid = ${uid}` },
    metrics: metrics(),
    scene: { entities: state({}) },
  });

  while (heap.length > 1) {
    const before = heap.length;
    const a = heappop(heap, lt);
    steps.push({
      chapter: 'run',
      short: `Pop ${a.v}`,
      title: `Pop the lightest node: weight ${a.v}`,
      body: `Line 10: \`len(heap) > 1\` is true (${before} nodes), so another merge is needed. Line 11 pops the lightest: \`f1 = ${a.v}\` becomes the **left** child. The heap is now ${list()}.`,
      code: { view: 'final', lines: [10, 11] },
      values: { 10: `${before} > 1 → True`, 11: `f1, _, left = ${a.v}, ${a.uid}, ${name(a.id)}` },
      metrics: metrics(),
      scene: { entities: state({ f1: a, phase: 'pop1' }) },
    });
    const b = heappop(heap, lt);
    steps.push({
      chapter: 'run',
      short: `Pop ${b.v}`,
      title: `Pop the next lightest: weight ${b.v}`,
      body: `Line 12 pops again: \`f2 = ${b.v}\` becomes the **right** child. These are the two rarest nodes left.`,
      code: { view: 'final', lines: [12] },
      values: { 12: `f2, _, right = ${b.v}, ${b.uid}, ${name(b.id)}` },
      metrics: metrics(),
      scene: { entities: state({ f1: a, f2: b, phase: 'pop2' }) },
    });
    const id = `m${created.length}`;
    created.push(id);
    consumed.push(a.id, b.id);
    heappush(heap, { v: a.v + b.v, uid, id }, lt);
    merges += 1;
    const newUid = uid;
    uid += 1;
    steps.push({
      chapter: 'run',
      short: `Merge ${a.v + b.v}`,
      title: `Merge ${a.v} + ${b.v} into a new node of weight ${a.v + b.v}`,
      body: `Line 14 pushes \`(${a.v + b.v}, ${newUid}, (left, right))\`: a new parent whose weight is the sum, with ${name(a.id)} on the left and ${name(b.id)} on the right. The heap is ${list()}. Line 15 bumps \`uid\` to ${uid}.\n\nThe \`uid\` only breaks ties, so Python never has to compare two subtrees.`,
      code: { view: 'final', lines: [14, 15] },
      values: { 14: `push (${a.v + b.v}, ${newUid}, (left, right))`, 15: `uid = ${uid}` },
      changes: [`new tree node ${a.v + b.v}`, `uid = ${uid}`],
      metrics: metrics(),
      scene: { entities: state({ f1: a, f2: b, fresh: id, phase: 'push' }) },
    });
  }

  steps.push({
    chapter: 'run',
    short: 'Tree done',
    title: heap.length === 1 ? `One node left: the root, weight ${heap[0]?.v}` : 'No symbols: nothing to build',
    body: `Line 10: \`len(heap) > 1\` is false, so the tree is finished and the single node left in the heap is its root. Line 17 starts an empty \`codes\` dict.`,
    code: { view: 'final', lines: [10, 17] },
    values: { 10: `${heap.length} > 1 → False`, 17: 'codes = {}' },
    metrics: metrics(),
    scene: { entities: state({ showCodes: true, stored: [] }) },
  });

  const entered: string[] = [];
  const walk = (id: string, prefix: string, stack: readonly string[], callLines: readonly number[], callValues: Readonly<Record<number, string>>, intro: string): void => {
    const node = byId.get(id);
    entered.push(id);
    const isLeaf = node?.left === undefined || node.right === undefined;
    const view = { showCodes: true, walkAt: id, prefix, stack, entered: [...entered] } as const;
    if (isLeaf) {
      const code = prefix || '0';
      stored.push(id);
      steps.push({
        chapter: 'run',
        short: `Code ${id}`,
        title: `Leaf '${id}' gets the code '${code}'`,
        body: `${intro} Line 20: the node is a \`str\`, a leaf. Line 21 stores \`codes['${id}'] = '${code}'\`${prefix === '' ? ' (the empty prefix becomes "0")' : ''}, and line 22 returns to the parent.`,
        code: { view: 'final', lines: [...callLines, 20, 21, 22] },
        values: { ...callValues, 20: 'isinstance(node, str) → True', 21: `codes['${id}'] = '${code}'` },
        changes: [`codes['${id}'] = '${code}'`],
        metrics: metrics(),
        scene: { entities: state({ ...view, stored: [...stored] }) },
      });
      return;
    }
    steps.push({
      chapter: 'run',
      short: `Walk '${prefix}'`,
      title: `walk(pair of weight ${node?.v}, '${prefix}'): not a leaf`,
      body: `${intro} Line 20: the node is a pair, not a \`str\`, so lines 23–24 walk its left child with \`prefix + "0"\` and then its right child with \`prefix + "1"\`.`,
      code: { view: 'final', lines: [...callLines, 20] },
      values: { ...callValues, 20: 'isinstance(node, str) → False' },
      metrics: metrics(),
      scene: { entities: state({ ...view, stored: [...stored] }) },
    });
    const l = node?.left as string;
    const r = node?.right as string;
    walk(l, `${prefix}0`, [...stack, id], [23], { 23: `walk(left, '${prefix}0')` }, `Line 23 calls \`walk(${name(l)}, '${prefix}0')\`.`);
    walk(r, `${prefix}1`, [...stack, id], [24], { 24: `walk(right, '${prefix}1')` }, `Line 24 calls \`walk(${name(r)}, '${prefix}1')\`.`);
  };
  if (heap.length > 0) walk(plan.rootId, '', [], [26, 27], { 27: 'walk(root, "")' }, 'Line 27 calls `walk(root, "")` on the root with an empty prefix.');

  steps.push({
    chapter: 'run',
    short: 'Return',
    title: `Return ${stored.length} code${stored.length === 1 ? '' : 's'}`,
    body: `Line 28 returns \`codes\`: ${stored.map((id) => `${id} = ${plan.codes.get(id)}`).join(', ')}.\n\nNo code is the start of another, because every symbol is a leaf.`,
    code: { view: 'final', lines: [28] },
    values: { 28: `return ${stored.length} codes` },
    metrics: metrics(`${stored.length} codes`),
    scene: { entities: state({ showCodes: true, stored: [...stored], walkAt: undefined, entered: [], mark: Object.fromEntries(stored.map((id) => [id, 'found' as Tone])) }) },
  });
  return steps;
}

const FREQS = [5, 9, 12, 45] as const;
const RUN = traceHuffman(FREQS);
const PLAN = planHuffman(FREQS);
const at = (n: number): Step['scene'] => RUN[n]?.scene ?? { entities: [] };
const startMetrics = { merges: 0, codes: 0, result: '—' } as const;
const FINAL_METRICS = RUN.at(-1)?.metrics ?? startMetrics;
const ALL = PLAN.nodes.filter((n) => n.left !== undefined).map((n) => n.id);
const ALL_LEAVES = PLAN.nodes.filter((n) => n.left === undefined).map((n) => n.id);
/** Run step indexes: 0 tuples, 1 heapify, then 3 steps per merge (pop, pop, merge), then "tree done" and the walk. */
const R = { pop1: 2, pop2: 3, merge: 4, treeDone: 11, walkRoot: 12, leafD: 18 };

export default defineWalkthrough({
  id: 'learn/greedy/huffman-coding',
  title: 'Huffman Coding, merge the two rarest symbols',
  summary: 'From Morse code to the code: build a prefix-free tree with a min-heap, then read each symbol’s bits off the path from the root.',
  minutes: 10,
  code: {
    lang: 'python',
    source: `import heapq


def huffman_codes(freqs: dict[str, int]) -> dict[str, str]:
    heap: list[tuple[int, int, str | tuple]] = [
        (freq, idx, ch) for idx, (ch, freq) in enumerate(freqs.items())
    ]
    heapq.heapify(heap)
    uid = len(heap)
    while len(heap) > 1:
        f1, _, left = heapq.heappop(heap)
        f2, _, right = heapq.heappop(heap)
        # uid breaks frequency ties without comparing subtree tuples
        heapq.heappush(heap, (f1 + f2, uid, (left, right)))
        uid += 1

    codes: dict[str, str] = {}

    def walk(node: str | tuple, prefix: str) -> None:
        if isinstance(node, str):
            codes[node] = prefix or "0"
            return
        walk(node[0], prefix + "0")
        walk(node[1], prefix + "1")

    if heap:
        walk(heap[0][2], "")
    return codes`,
  },
  metrics: [
    { key: 'merges', label: 'Merges' },
    { key: 'codes', label: 'Codes stored' },
    { key: 'result', label: 'Returns' },
  ],
  legend: [
    { tone: 'active', label: 'node being popped / walked' },
    { tone: 'compare', label: 'nodes being merged / path' },
    { tone: 'done', label: 'already merged' },
    { tone: 'found', label: 'leaf with its code' },
  ],
  goals: [
    { text: 'See why frequent symbols get short codes', step: 2 },
    { text: 'Build the heap loop and the tree', step: 5 },
    { text: 'Follow every merge', step: 13 },
    { text: 'Follow the walk that reads the codes', step: 25 },
    { text: 'Know why merging the rarest two is optimal', step: 34 },
  ],
  steps: [
    {
      chapter: 'problem',
      short: 'The brief',
      title: 'Give each letter a bit string, shortest for the most common',
      body: 'A file contains four symbols with frequencies A: 5, B: 9, C: 12 and D: 45. We want a bit string per symbol that makes the whole file as short as possible, and where **no code is the start of another**, so a stream of bits can be decoded without separators.\n\nLine 4 takes the `freqs` and returns the `codes`.',
      code: { view: 'signature', lines: [4] },
      metrics: startMetrics,
      scene: { entities: scene({ plan: PLAN, heap: [], created: [], consumed: [], uid: 4, bare: true }) },
    },
    {
      chapter: 'idea',
      short: 'Short codes',
      title: 'Frequent symbols should get the shortest codes',
      body: 'Like Morse code, where the common `E` is one dot. With 4 symbols a fixed code needs 2 bits each: 71 symbols × 2 = **142 bits**. If the common D gets 1 bit, C 2 bits, and the rare A and B 3 bits each, the file takes `45 + 24 + 15 + 27 = ` **111 bits**.\n\nA tree gives that: every symbol is a **leaf**, so no code can be the start of another.',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: { entities: scene({ plan: PLAN, heap: [], created: ALL, consumed: [], uid: 4, bare: true, showCodes: true, stored: ALL_LEAVES, note: 'fixed 2 bits: 142 bits\nHuffman: 111 bits' }) },
    },
    {
      chapter: 'idea',
      short: 'Rarest merge',
      title: 'Build the tree bottom-up from the two rarest symbols',
      body: 'The rarest symbols should get the **longest** codes, so they should sit deepest. Take the two lightest nodes, join them under a new parent whose weight is their sum, and put that parent back to be merged again.\n\nA min-heap gives the two lightest in `O(log n)`. This is the same loop as Optimal Merge Patterns.',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: { entities: scene({ plan: PLAN, heap: [], created: ALL, consumed: [], uid: 4, bare: true, mark: { A: 'compare', B: 'compare', m0: 'compare' }, note: 'A (5) and B (9) merge first:\nthe deepest, longest codes' }) },
    },
    {
      chapter: 'idea',
      short: 'Read bits',
      title: 'Left is 0, right is 1: the path is the code',
      body: 'Once the tree is built, the code for a symbol is the path from the root to its leaf: each step left adds a `0`, each step right adds a `1`.\n\nD is one step right: `1`. C is left, left: `00`. A is left, right, left: `010`.',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: { entities: scene({ plan: PLAN, heap: [], created: ALL, consumed: [], uid: 4, bare: true, showCodes: true, stored: ['D', 'C'], mark: { D: 'found', C: 'found' }, note: 'D = 1\nC = 00' }) },
    },
    {
      chapter: 'build',
      short: 'Leaf entries',
      title: 'Lines 5–7: one heap entry per symbol',
      body: 'Each entry is `(freq, idx, ch)`: the frequency to order by, the symbol’s position as a tie-breaker, and the symbol itself. `freqs.items()` is walked with `enumerate` to get `idx`.',
      code: { view: 'reveal', reveal: [1, 4, 5, 6, 7], lines: [5, 6, 7] },
      metrics: startMetrics,
      changes: ['heap = [(freq, idx, ch), …]'],
      scene: at(0),
    },
    {
      chapter: 'build',
      short: 'Heapify',
      title: 'Lines 8–9: make it a min-heap, and count new nodes from the end',
      body: '`heapify` puts the lightest entry at `heap[0]`. `uid` starts after the last leaf index, so every merged node gets a number no leaf has.',
      code: { view: 'reveal', reveal: [1, 4, 5, 6, 7, 8, 9], lines: [8, 9] },
      metrics: startMetrics,
      changes: ['heapq.heapify(heap)', 'uid = len(heap)'],
      scene: at(1),
    },
    {
      chapter: 'build',
      short: 'Pop two',
      title: 'Lines 10–12: while two or more remain, pop the two lightest',
      body: 'The loop runs until a single node is left. `f1` and `left` come from the lightest entry, `f2` and `right` from the next; the `_` throws away the tie-break number.',
      code: { view: 'reveal', reveal: [1, 4, 5, 6, 7, 8, 9, 10, 11, 12], lines: [10, 11, 12] },
      metrics: startMetrics,
      changes: ['f1, _, left = heappop(heap)', 'f2, _, right = heappop(heap)'],
      scene: at(R.pop2),
    },
    {
      chapter: 'build',
      short: 'Merge',
      title: 'Lines 13–15: join them under a new parent',
      body: 'The new entry weighs `f1 + f2` and holds the pair `(left, right)` as its tree. `uid` breaks ties between equal weights, so Python never compares two subtrees. Then `uid` moves on.',
      code: { view: 'reveal', reveal: [1, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], lines: [14, 15] },
      metrics: { merges: 1, codes: 0, result: '—' },
      changes: ['heappush(heap, (f1 + f2, uid, (left, right)))', 'uid += 1'],
      scene: at(R.merge),
    },
    {
      chapter: 'build',
      short: 'Codes dict',
      title: 'Lines 17–20: a place for the codes, and a function that walks the tree',
      body: '`codes` will map each symbol to its bit string. `walk(node, prefix)` looks at one node: a `str` is a leaf (a symbol), anything else is a pair of subtrees.',
      code: { view: 'reveal', reveal: [1, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 17, 19, 20], lines: [17, 19, 20] },
      metrics: startMetrics,
      changes: ['codes = {}', 'def walk(node, prefix)'],
      scene: at(R.treeDone),
    },
    {
      chapter: 'build',
      short: 'Leaf: store',
      title: 'Lines 21–22: at a leaf, store the path as its code',
      body: 'The prefix is the path from the root. `prefix or "0"` covers a lone symbol, whose path is empty: it still needs one bit.',
      code: { view: 'reveal', reveal: [1, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 17, 19, 20, 21, 22], lines: [21, 22] },
      metrics: { merges: 3, codes: 1, result: '—' },
      changes: ["codes[node] = prefix or '0'"],
      scene: at(R.leafD),
    },
    {
      chapter: 'build',
      short: 'Recurse',
      title: 'Lines 23–24: otherwise walk left with a 0 and right with a 1',
      body: 'For a pair, `node[0]` is the left subtree and `node[1]` the right. Appending `"0"` or `"1"` to the prefix builds the path as the recursion goes down.',
      code: { view: 'reveal', reveal: [1, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 17, 19, 20, 21, 22, 23, 24], lines: [23, 24] },
      metrics: { merges: 3, codes: 0, result: '—' },
      changes: ["walk(node[0], prefix + '0')", "walk(node[1], prefix + '1')"],
      scene: at(R.walkRoot),
    },
    {
      chapter: 'build',
      short: 'Start walk',
      title: 'Lines 26–28: walk from the root and return the codes',
      body: '`heap[0][2]` is the tree of the one entry left. With an empty `heap` (no symbols) nothing is walked and `codes` stays empty.\n\nThat’s the whole function. Now let’s run it.',
      code: { view: 'final', lines: [26, 27, 28] },
      metrics: FINAL_METRICS,
      changes: ['walk(heap[0][2], "")', 'return codes'],
      scene: at(RUN.length - 1),
    },
    ...RUN,
    {
      chapter: 'why',
      short: 'Recap',
      title: 'n − 1 merges at O(log n) each: O(n log n)',
      body: 'Building the heap is `O(n)`. Then `n − 1` merges each do two pops and a push at `O(log n)`: **`O(n log n)`**. The tree has `2n − 1` nodes and `codes` holds `n` strings, so space is `O(n)`.\n\nSwitch to **🧪 Try your own** to build a tree for your own frequencies.',
      code: { view: 'final', lines: [10, 26] },
      metrics: FINAL_METRICS,
      scene: { entities: scene({ plan: PLAN, heap: [], created: ALL, consumed: [], uid: 4, bare: true, showCodes: true, stored: ALL_LEAVES, mark: { m2: 'found' }, note: 'n = 4 symbols → 3 merges' }) },
    },
    {
      chapter: 'why',
      short: 'Rarest first',
      title: 'Lines 11–12 always take the two rarest, so they get the longest codes',
      body: 'Each pop takes the lightest node left, so the rarest symbols are merged first and end up deepest. Their longer codes cost little because they appear rarely, and the frequent symbols keep short ones.\n\nThat is the key decision: any other pair merged first would push a heavier node one level deeper, so the file could only get longer. The greedy choice is optimal.',
      code: { view: 'final', lines: [11, 12] },
      values: { 11: 'f1 = 5, then 12, then 26', 12: 'f2 = 9, then 14, then 45' },
      metrics: FINAL_METRICS,
      scene: { entities: scene({ plan: PLAN, heap: [], created: ALL, consumed: [], uid: 4, bare: true, showCodes: true, stored: ALL_LEAVES, mark: { A: 'compare', B: 'compare' }, note: 'A and B: rarest, deepest, 3 bits\nD: most common, 1 bit' }) },
    },
  ],
  trace: {
    title: 'Run Huffman coding on your own frequencies',
    inputs: [{ name: 'freqs', label: 'Frequencies of symbols A, B, C… (up to 6)', kind: 'numbers', default: '5, 9, 12, 45' }],
    presets: [
      { label: 'Skewed', values: { freqs: '5, 9, 12, 45' } },
      { label: 'Equal', values: { freqs: '4, 4, 4, 4' } },
      { label: 'Two symbols', values: { freqs: '3, 8' } },
      { label: 'One symbol', values: { freqs: '7' } },
      { label: 'Ties', values: { freqs: '2, 2, 3, 3, 5' } },
      { label: 'Classic six', values: { freqs: '45, 13, 12, 16, 9, 5' } },
    ],
    maxItems: 6,
    run: (values) => {
      const freqs = values['freqs'];
      if (!Array.isArray(freqs) || freqs.length === 0) throw new Error('Enter some frequencies.');
      if (freqs.some((f) => f < 1)) throw new Error('Frequencies must be 1 or more.');
      return traceHuffman(freqs);
    },
  },
});
