import { arr, defineWalkthrough, link, note, ptr, vars } from '../../../lib/walkthrough/helpers';
import type { Entity, LinkEntity, Step, Tone } from '../../../lib/walkthrough/types';

/**
 * Drawn like the Singly Linked List reference (`.migration-contract.md` §5.1),
 * with two arrows per node: `next-<id>` leaves the right face and enters the
 * left one; `prev-<id>` arcs between the back (top) faces, so the pair
 * doesn't draw on top of each other. The sentinels `head` and `tail` are muted
 * blocks in the first and last slot. A node no arrow chain reaches is lifted
 * up out of the row: a new node until it is wired in, a removed one (muted,
 * its own arrows dashed) after `unlink`.
 */
const NODE_PITCH = 100;
const CUT_X = -60;
const CUT_Y = -100;
const VARS_Y = 150;
const NOTE_X = 250;

/** A real node id, or a sentinel. */
type Ref = number | 'h' | 't';

interface Item {
  readonly v: number;
  readonly id: number;
}

interface DllState {
  /** Every node made so far. */
  readonly items: readonly Item[];
  /** Total slots for real nodes (the tail sentinel sits after them). */
  readonly slots: number;
  readonly next: Readonly<Record<string, Ref>>;
  readonly prev: Readonly<Record<string, Ref>>;
  /** The node the code is working on, and its tone. */
  readonly node?: number;
  readonly nodeTone?: Tone;
  /** Arrows in focus, e.g. `next-h`, `prev-2`. */
  readonly hot?: readonly string[];
  readonly hotTone?: Tone;
  readonly note?: string;
  readonly noteTone?: Tone;
  readonly hideVars?: boolean;
}

const key = (r: Ref): string => String(r);
const entityOf = (r: Ref): string => (r === 'h' ? 'node-h' : r === 't' ? 'node-t' : `node-${r}`);

/** Real node ids reachable from the sentinels through next (from head) or prev (from tail). */
function reachable(s: Pick<DllState, 'next' | 'prev'>): Set<number> {
  const out = new Set<number>();
  for (const [start, dir] of [['h', s.next], ['t', s.prev]] as const) {
    let r: Ref | undefined = dir[start];
    while (typeof r === 'number' && !out.has(r)) {
      out.add(r);
      r = dir[key(r)];
    }
    // A node met again from the other side is fine; stop at a sentinel.
  }
  return out;
}

/** Scene for one moment: sentinels, nodes, both arrows per node, pointers and the variables. */
function scene(s: DllState): Entity[] {
  const live = reachable(s);
  const slotOf = (r: Ref): number => (r === 'h' ? 0 : r === 't' ? s.slots + 1 : r + 1);
  const entities: Entity[] = [arr('node-h', 0, 0, [0], { tones: { 0: 'muted' }, showIndex: false })];
  for (const it of s.items) {
    const cut = !live.has(it.id);
    const x = (it.id + 1) * NODE_PITCH;
    const tone: Tone = it.id === s.node ? (s.nodeTone ?? 'active') : cut ? 'muted' : 'default';
    entities.push(arr(`node-${it.id}`, x + (cut ? CUT_X : 0), cut ? CUT_Y : 0, [it.v], { tones: { 0: tone }, showIndex: false, itemKeys: [it.id] }));
  }
  entities.push(arr('node-t', (s.slots + 1) * NODE_PITCH, 0, [0], { tones: { 0: 'muted' }, showIndex: false }));

  const links: LinkEntity[] = [];
  const arrow = (kind: 'next' | 'prev', from: Ref, to: Ref | undefined): void => {
    if (to === undefined) return;
    const id = `${kind}-${key(from)}`;
    const cut = typeof from === 'number' && !live.has(from);
    const hot = s.hot?.includes(id) ?? false;
    const forward = slotOf(to) > slotOf(from);
    const sides =
      kind === 'next'
        ? forward
          ? ({ from: 'right', to: 'left' } as const)
          : ({ from: 'left', to: 'right' } as const)
        : ({ from: 'top', to: 'top' } as const);
    links.push(
      link(id, { entity: entityOf(from), side: cut ? undefined : sides.from }, { entity: entityOf(to), side: cut ? undefined : sides.to }, {
        tone: hot ? (s.hotTone ?? 'active') : cut ? 'muted' : 'default',
        // A node not wired in yet still has real arrows (solid while in focus); a removed one's are dashed.
        dashed: cut && !hot,
      }),
    );
  };
  arrow('next', 'h', s.next['h']);
  for (const it of s.items) {
    arrow('next', it.id, s.next[key(it.id)]);
    arrow('prev', it.id, s.prev[key(it.id)]);
  }
  arrow('prev', 't', s.prev['t']);
  entities.push(...links);

  entities.push(ptr('head', 'node-h', 0, 'head', { tone: 'default', codeVar: 'head' }));
  entities.push(ptr('tail', 'node-t', 0, 'tail', { tone: 'default', codeVar: 'tail' }));
  if (s.node !== undefined) entities.push(ptr('node', `node-${s.node}`, 0, 'node', { tone: s.nodeTone ?? 'active', codeVar: 'node' }));

  if (!s.hideVars) {
    const name = (r: Ref | undefined): string => (r === undefined ? '—' : r === 'h' ? 'head' : r === 't' ? 'tail' : `node ${s.items[r]?.v ?? '?'}`);
    const has = s.node !== undefined;
    entities.push(
      vars(
        'vals',
        0,
        VARS_Y,
        [
          { name: 'node', value: has ? name(s.node) : '—', tone: has ? 'default' : 'muted' },
          { name: 'node.prev', value: has ? name(s.prev[key(s.node ?? 0)]) : '—', tone: has ? 'default' : 'muted' },
          { name: 'node.next', value: has ? name(s.next[key(s.node ?? 0)]) : '—', tone: has ? 'default' : 'muted' },
        ],
        { label: 'variables', width: 200 },
      ),
    );
  }
  if (s.note) entities.push(note('note', s.hideVars ? 0 : NOTE_X, VARS_Y, s.note, { tone: s.noteTone ?? 'note' }));
  return entities;
}

/** The list from head to tail, e.g. "[10, 30]". */
function listText(items: readonly Item[], next: Readonly<Record<string, Ref>>): string {
  const out: number[] = [];
  for (let r = next['h']; typeof r === 'number' && out.length <= items.length; r = next[key(r)]) out.push(items[r]?.v ?? 0);
  return `[${out.join(', ')}]`;
}

/** Pushes every value to the back, then unlinks one node; one step per decision (chapter "run", final code). */
function traceDll(values: readonly number[], unlinkAt: number): Step[] {
  const slots = values.length;
  const items: Item[] = [];
  const next: Record<string, Ref> = {};
  const prev: Record<string, Ref> = {};
  const steps: Step[] = [];
  let rewires = 0;
  const metrics = (result: string | number = '—'): Record<string, string | number> => ({ size: items.length, rewires, result });
  const at = (extra: Partial<DllState> = {}): Step['scene'] => ({ entities: scene({ items: [...items], slots, next: { ...next }, prev: { ...prev }, ...extra }) });
  const name = (r: Ref): string => (r === 'h' ? 'head' : r === 't' ? 'tail' : `node ${items[r]?.v}`);

  next['h'] = 't';
  prev['t'] = 'h';
  steps.push({
    chapter: 'run',
    short: 'Sentinels',
    title: 'An empty list is two sentinels',
    body: 'Lines 13–14 make the dummy nodes `head` and `tail`; line 15 points them at each other. The list is empty, yet every real node will always have a node on both sides.',
    code: { view: 'final', lines: [13, 14, 15] },
    values: { 15: 'head.next = tail, tail.prev = head' },
    metrics: metrics(),
    scene: at({ hot: ['next-h', 'prev-t'] }),
  });

  for (const v of values) {
    const id = items.length;
    const left = prev['t'] ?? 'h';
    items.push({ v, id });
    next[key(id)] = 't';
    prev[key(id)] = left;
    steps.push({
      chapter: 'run',
      short: `push ${v}`,
      title: `push_back(${v}): a new node between ${name(left)} and tail`,
      body: `Line 30 calls \`_insert_between(${v}, tail.prev, tail)\`, with \`tail.prev\` = ${name(left)}. Line 18 makes the node already pointing both ways, but its neighbours don’t know it yet.`,
      code: { view: 'final', lines: [30, 18] },
      values: { 30: `_insert_between(${v}, ${name(left)}, tail)`, 18: `node = DNode(${v}, prev=${name(left)}, next=tail)` },
      metrics: metrics(),
      scene: at({ node: id, hot: [`next-${id}`, `prev-${id}`], hotTone: 'compare' }),
    });
    next[key(left)] = id;
    prev['t'] = id;
    rewires += 2;
    steps.push({
      chapter: 'run',
      short: 'Wire in',
      title: `${name(left)} and tail now point at node ${v}`,
      body: `Line 19: \`left.next = right.prev = node\`. Two arrows change, and node ${v} is in the list: ${listText(items, next)}. Line 20 returns it to the caller.`,
      code: { view: 'final', lines: [19, 20] },
      values: { 19: `${name(left)}.next = tail.prev = node ${v}`, 20: `return node ${v}` },
      metrics: metrics(),
      scene: at({ node: id, hot: [`next-${key(left)}`, 'prev-t'] }),
    });
  }

  const target = items[unlinkAt];
  if (!target) return steps;
  const t = target.id;
  const p = prev[key(t)] ?? 'h';
  const nx = next[key(t)] ?? 't';
  next[key(p)] = nx;
  rewires += 1;
  steps.push({
    chapter: 'run',
    short: 'Skip fwd',
    title: `unlink(node ${target.v}): ${name(p)} skips forward to ${name(nx)}`,
    body: `We kept the node \`push_back\` returned, so no search is needed. Line 23 checks both neighbours exist (sentinels guarantee it). Line 24: \`node.prev.next = node.next\`, so walking forward skips node ${target.v}.`,
    code: { view: 'final', lines: [23, 24] },
    values: { 23: 'prev and next exist → True', 24: `${name(p)}.next = ${name(nx)}` },
    metrics: metrics(),
    scene: at({ node: t, nodeTone: 'compare', hot: [`next-${key(p)}`] }),
  });
  prev[key(nx)] = p;
  rewires += 1;
  steps.push({
    chapter: 'run',
    short: 'Skip back',
    title: `${name(nx)} skips back to ${name(p)}`,
    body: `Line 25: \`node.next.prev = node.prev\`. Now neither direction reaches node ${target.v}: it is out of the list, though its own arrows still point at its old neighbours.`,
    code: { view: 'final', lines: [25] },
    values: { 25: `${name(nx)}.prev = ${name(p)}` },
    metrics: metrics(),
    scene: at({ node: t, nodeTone: 'muted', hot: [`prev-${key(nx)}`] }),
  });
  const result = listText(items, next);
  steps.push({
    chapter: 'run',
    short: 'Return',
    title: `Return ${target.v}: the list is ${result}`,
    body: `Line 26 returns the removed value, ${target.v}. Two arrows changed, whatever the list’s length: **\`O(1)\`**.`,
    code: { view: 'final', lines: [26] },
    values: { 26: `return ${target.v}` },
    metrics: { size: items.length - 1, rewires, result: target.v },
    scene: at({ node: t, nodeTone: 'muted' }),
  });
  return steps;
}

const VALUES = [10, 20, 30] as const;
const RUN = traceDll(VALUES, 1);
const startMetrics = { size: 0, rewires: 0, result: '—' } as const;
const FINAL_METRICS = RUN.at(-1)?.metrics ?? startMetrics;
/** Scene of run step n (0-based), so build steps show the moment they describe. */
const at = (n: number): Step['scene'] => RUN[n]?.scene ?? { entities: [] };
const find = (short: string): number => RUN.findIndex((s) => s.short === short);
const RUN_START = 13;
const ITEMS: readonly Item[] = VALUES.map((v, id) => ({ v, id }));
const FULL_NEXT: Readonly<Record<string, Ref>> = { h: 0, '0': 1, '1': 2, '2': 't' };
const FULL_PREV: Readonly<Record<string, Ref>> = { '0': 'h', '1': 0, '2': 1, t: 2 };

export default defineWalkthrough({
  id: 'learn/linked-list/doubly-linked-list',
  title: 'Doubly Linked List, arrows both ways',
  summary: 'From the idea to the code: give every node a prev arrow as well as next, and put a dummy node at each end, so adding at the back and removing any node you hold take two arrow changes each.',
  minutes: 8,
  code: {
    lang: 'python',
    source: `class DNode:
    def __init__(
        self, val: int, prev: "DNode | None" = None, next: "DNode | None" = None
    ) -> None:
        self.val = val
        self.prev = prev
        self.next = next


class DoublyLinkedList:
    def __init__(self) -> None:
        # Sentinels eliminate empty-list and head/tail null checks
        self.head = DNode(0)
        self.tail = DNode(0)
        self.head.next, self.tail.prev = self.tail, self.head

    def _insert_between(self, val: int, left: DNode, right: DNode) -> DNode:
        node = DNode(val, prev=left, next=right)
        left.next = right.prev = node
        return node

    def unlink(self, node: DNode) -> int:
        assert node.prev is not None and node.next is not None
        node.prev.next = node.next
        node.next.prev = node.prev
        return node.val

    def push_back(self, val: int) -> DNode:
        assert self.tail.prev is not None
        return self._insert_between(val, self.tail.prev, self.tail)`,
  },
  snapshots: {
    branches: `def unlink(self, node: DNode) -> int:
    if node.prev is None:  # Removing the first node
        self.first = node.next
    else:
        node.prev.next = node.next
    if node.next is None:  # Removing the last node
        self.last = node.prev
    else:
        node.next.prev = node.prev
    return node.val`,
  },
  metrics: [
    { key: 'size', label: 'Real nodes' },
    { key: 'rewires', label: 'Arrows changed' },
    { key: 'result', label: 'unlink returns' },
  ],
  legend: [
    { tone: 'active', label: 'node / arrow just changed' },
    { tone: 'compare', label: 'arrow being set / node leaving' },
    { tone: 'miss', label: 'special case' },
    { tone: 'muted', label: 'sentinel / unlinked' },
  ],
  goals: [
    { text: 'See why None checks pile up without sentinels', step: 2 },
    { text: 'Use two dummy nodes so neighbours always exist', step: 3 },
    { text: 'Watch push_back and unlink change two arrows each', step: RUN_START + find('Skip fwd') },
    { text: 'Know why the sentinels make every case the same', step: RUN_START + RUN.length + 1 },
  ],
  steps: [
    {
      chapter: 'problem',
      short: 'The brief',
      title: 'A list you can walk both ways and cut anywhere',
      body: 'Like train cars coupled front and back: stand beside any car and you can uncouple it. Lines 1–2 start a node class, `DNode`.\n\nBuild a list where adding at the back and removing a node you already hold are both **`O(1)`**: here push 10, 20, 30, then remove the node holding 20.',
      code: { view: 'signature', lines: [1, 2] },
      metrics: startMetrics,
      scene: { entities: scene({ items: ITEMS, slots: 3, next: FULL_NEXT, prev: FULL_PREV, hideVars: true, note: 'push_back 10, 20, 30\nunlink(node 20) → [10, 30]' }) },
    },
    {
      chapter: 'idea',
      short: 'Branches',
      title: 'Without dummies, every end is a special case',
      body: 'With a `prev` arrow, removing a node needs no search: re-point its two neighbours. But the first node has no `prev` and the last has no `next`, so lines 2 and 6 branch on `None`.\n\nFour paths for one removal, and each is a chance for a bug.',
      code: { view: 'snapshot', id: 'branches', lines: [2, 6] },
      metrics: startMetrics,
      scene: { entities: scene({ items: ITEMS, slots: 3, next: FULL_NEXT, prev: FULL_PREV, node: 0, nodeTone: 'miss', hideVars: true, note: 'first node: prev is None\nlast node: next is None\n→ 2 checks, 4 paths', noteTone: 'miss' }) },
    },
    {
      chapter: 'idea',
      short: 'Sentinels',
      title: 'Put a dummy node at each end',
      body: 'Two dummy nodes, `head` and `tail`, that never hold data. Every real node now sits between two nodes, so `node.prev` and `node.next` are never `None`.\n\nRemoving is always the same two arrows; adding at the back is always “between `tail.prev` and `tail`”.',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: { entities: scene({ items: ITEMS, slots: 3, next: FULL_NEXT, prev: FULL_PREV, hideVars: true, note: 'head ⇄ 10 ⇄ 20 ⇄ 30 ⇄ tail\nno node has a None neighbour' }) },
    },
    {
      chapter: 'build',
      short: 'Value',
      title: 'Lines 3–5: a node keeps its value',
      body: 'Line 3 takes the value and both neighbours, `None` by default. Line 5 stores the value.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5], lines: [3, 4, 5] },
      metrics: startMetrics,
      changes: ['self.val = val'],
      scene: at(1),
    },
    {
      chapter: 'build',
      short: 'Two arrows',
      title: 'Lines 6–7: one arrow each way',
      body: 'Line 6 is the arrow back, line 7 the arrow forward. That second arrow is what lets a node leave without a search.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5, 6, 7], lines: [6, 7] },
      metrics: startMetrics,
      changes: ['self.prev = prev', 'self.next = next'],
      scene: at(2),
    },
    {
      chapter: 'build',
      short: 'List class',
      title: 'Lines 10–12: the list itself',
      body: 'Line 11 builds an empty list. The comment on line 12 says why it starts with two nodes instead of none.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5, 6, 7, 10, 11, 12], lines: [10, 11, 12] },
      metrics: startMetrics,
      changes: ['class DoublyLinkedList'],
      scene: at(0),
    },
    {
      chapter: 'build',
      short: 'Sentinels',
      title: 'Lines 13–15: two dummies pointing at each other',
      body: 'Lines 13–14 make `head` and `tail`. Line 15 links them both ways, so the empty list already has the shape every later step relies on.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5, 6, 7, 10, 11, 12, 13, 14, 15], lines: [13, 14, 15] },
      metrics: startMetrics,
      changes: ['self.head = DNode(0)', 'self.tail = DNode(0)', 'head.next, tail.prev = tail, head'],
      scene: at(0),
    },
    {
      chapter: 'build',
      short: 'New node',
      title: 'Lines 17–18: a node that already knows its neighbours',
      body: 'Line 17 inserts between two nodes, `left` and `right`. Line 18 creates the node pointing back at `left` and forward at `right`.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5, 6, 7, 10, 11, 12, 13, 14, 15, 17, 18], lines: [17, 18] },
      metrics: startMetrics,
      changes: ['node = DNode(val, prev=left, next=right)'],
      scene: at(find('push 20')),
    },
    {
      chapter: 'build',
      short: 'Wire in',
      title: 'Lines 19–20: the neighbours point at it',
      body: 'Line 19 sets `left.next` and `right.prev` to the new node in one chained assignment. Line 20 returns the node, so the caller can remove it later without a search.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5, 6, 7, 10, 11, 12, 13, 14, 15, 17, 18, 19, 20], lines: [19, 20] },
      metrics: startMetrics,
      changes: ['left.next = right.prev = node', 'return node'],
      scene: at(find('push 20') + 1),
    },
    {
      chapter: 'build',
      short: 'Skip fwd',
      title: 'Lines 22–24: the node before skips it',
      body: 'Line 23 states what the sentinels guarantee: both neighbours exist. Line 24 points the node before straight at the node after.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5, 6, 7, 10, 11, 12, 13, 14, 15, 17, 18, 19, 20, 22, 23, 24], lines: [22, 23, 24] },
      metrics: startMetrics,
      changes: ['node.prev.next = node.next'],
      scene: at(find('Skip fwd')),
    },
    {
      chapter: 'build',
      short: 'Skip back',
      title: 'Lines 25–26: the node after skips it back',
      body: 'Line 25 does the same in the other direction. Line 26 returns the removed value.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5, 6, 7, 10, 11, 12, 13, 14, 15, 17, 18, 19, 20, 22, 23, 24, 25, 26], lines: [25, 26] },
      metrics: startMetrics,
      changes: ['node.next.prev = node.prev', 'return node.val'],
      scene: at(find('Skip back')),
    },
    {
      chapter: 'build',
      short: 'push_back',
      title: 'Lines 28–30: add at the back',
      body: 'The back of the list is always “between `tail.prev` and `tail`”, so line 30 is a single call. Line 29 is for the type checker.\n\nThat’s the whole class. Now let’s run it.',
      code: { view: 'final', lines: [28, 29, 30] },
      metrics: startMetrics,
      changes: ['return self._insert_between(val, self.tail.prev, self.tail)'],
      scene: at(find('push 10')),
    },
    ...RUN,
    {
      chapter: 'why',
      short: 'Recap',
      title: 'Two arrows per change, at any size',
      body: '`push_back` and `unlink` each change exactly two arrows, however long the list: **`O(1)` time** each. The price is memory: two arrows per node plus two dummy nodes, **`O(n)` space**.\n\nSwitch to **🧪 Try your own** to remove the first, last or only node.',
      code: { view: 'final', lines: [19, 24, 25] },
      metrics: FINAL_METRICS,
      scene: { entities: scene({ items: ITEMS, slots: 3, next: { h: 0, '0': 2, '1': 2, '2': 't' }, prev: { '0': 'h', '1': 0, '2': 0, t: 2 }, hideVars: true, note: 'push_back: 2 arrows → O(1)\nunlink: 2 arrows → O(1)\n2 arrows per node → O(n) space', noteTone: 'found' }) },
    },
    {
      chapter: 'why',
      short: 'Same case',
      title: 'Why the sentinels matter: no special cases',
      body: 'Remove the only real node: `node.prev` is `head` and `node.next` is `tail`, so lines 24–25 just link the dummies back together. No `None` check anywhere.\n\nThat is the key decision: two dummy nodes make the first, last and only node behave like any other.',
      code: { view: 'final', lines: [23, 24, 25] },
      values: { 23: 'always true: neighbours are never None', 24: 'head.next = tail', 25: 'tail.prev = head' },
      metrics: FINAL_METRICS,
      scene: { entities: scene({ items: [{ v: 7, id: 0 }], slots: 1, next: { h: 't', '0': 't' }, prev: { '0': 'h', t: 'h' }, hot: ['next-h', 'prev-t'], hideVars: true, note: 'only node removed:\nhead ⇄ tail again, no branch' }) },
    },
  ],
  trace: {
    title: 'Push your own values, then unlink one',
    inputs: [
      { name: 'values', label: 'Values to push_back', kind: 'numbers', default: '10, 20, 30' },
      { name: 'index', label: 'Unlink the node at index', kind: 'number', default: '1' },
    ],
    presets: [
      { label: 'Unlink the first', values: { values: '10, 20, 30', index: '0' } },
      { label: 'Unlink the last', values: { values: '10, 20, 30', index: '2' } },
      { label: 'Only node', values: { values: '7', index: '0' } },
      { label: 'Two nodes', values: { values: '5, 15', index: '1' } },
    ],
    maxItems: 6,
    run: (values) => {
      const list = values['values'];
      const index = values['index'];
      if (!Array.isArray(list) || list.length === 0) throw new Error('Enter at least one value to push.');
      if (typeof index !== 'number' || index < 0 || index >= list.length) throw new Error(`Pick an index from 0 to ${list.length - 1}.`);
      return traceDll(list, index);
    },
  },
});
