import { arr, defineWalkthrough, link, note, ptr, vars } from '../../../lib/walkthrough/helpers';
import type { Entity, Step, Tone } from '../../../lib/walkthrough/types';

/**
 * Drawn like the Singly Linked List reference (`.migration-contract.md` §5.1):
 * one-cell node blocks in fixed slots, one `next-<id>` arrow per node, a
 * muted `None` block at each end. `prev` starts on the left `None` (`none-l`),
 * so a flipped arrow points back along the row and the first node's flipped
 * arrow lands on the left `None`. A node no live variable can reach is lifted
 * up out of the row (`CUT_X`, `CUT_Y`), muted, with its arrow dashed.
 */
const NODE_PITCH = 100;
const CUT_Y = -100;
/** A cut node also shifts this far along x: up and a little right on screen, clear of the pins on its left neighbour. */
const CUT_X = -60;
const VARS_Y = 150;
const NOTE_X = 230;

interface Item {
  readonly v: number;
  readonly id: number;
}

/** A node id, or one of the two `None` blocks: `L` left of the row, `R` right of it. */
type Ref = number | 'L' | 'R';

interface RevState {
  readonly items: readonly Item[];
  /** `next[id]`: where that node's arrow points. */
  readonly next: readonly Ref[];
  readonly head?: Ref;
  readonly prev?: Ref;
  readonly curr?: Ref;
  readonly nextNode?: Ref;
  /** A node whose arrow is in focus, and the arrow's tone. */
  readonly hot?: number;
  readonly hotTone?: Tone;
  /** Extra per-node tones on top of the ones the pointers give. */
  readonly tones?: Readonly<Record<number, Tone>>;
  readonly note?: string;
  readonly noteTone?: Tone;
  readonly hideVars?: boolean;
}

const entityOf = (r: Ref): string => (r === 'L' ? 'none-l' : r === 'R' ? 'none' : `node-${r}`);
const slotOf = (r: Ref, n: number): number => (r === 'L' ? 0 : r === 'R' ? n + 1 : r + 1);

/** Node ids reachable by following arrows from a start. */
function walk(next: readonly Ref[], from: Ref | undefined): number[] {
  const out: number[] = [];
  for (let r = from; typeof r === 'number' && !out.includes(r); r = next[r]) out.push(r);
  return out;
}

const nameOf = (items: readonly Item[], r: Ref | undefined): string => {
  if (r === undefined) return '—';
  if (r === 'L' || r === 'R') return 'None';
  return `node ${items[r]?.v ?? '?'}`;
};

/** Scene for one moment: the nodes, their arrows, the three pointers, and the variables. */
function scene(s: RevState): Entity[] {
  const n = s.items.length;
  const live = new Set([s.head, s.prev, s.curr, s.nextNode].flatMap((r) => walk(s.next, r)));
  const reversed = new Set(walk(s.next, s.prev));
  const tones: Record<number, Tone> = {};
  for (const id of reversed) tones[id] = 'done';
  if (typeof s.nextNode === 'number' && s.nextNode !== s.curr) tones[s.nextNode] = 'compare';
  if (typeof s.curr === 'number') tones[s.curr] = 'active';
  Object.assign(tones, s.tones ?? {});

  const entities: Entity[] = [arr('none-l', 0, 0, ['None'], { tones: { 0: 'muted' }, showIndex: false })];
  for (const it of s.items) {
    const cut = !live.has(it.id);
    const x = (it.id + 1) * NODE_PITCH;
    entities.push(
      arr(`node-${it.id}`, x + (cut ? CUT_X : 0), cut ? CUT_Y : 0, [it.v], {
        tones: { 0: cut ? 'muted' : (tones[it.id] ?? 'default') },
        showIndex: false,
        itemKeys: [it.id],
      }),
    );
  }
  entities.push(arr('none', (n + 1) * NODE_PITCH, 0, ['None'], { tones: { 0: 'muted' }, showIndex: false }));

  for (const it of s.items) {
    const to = s.next[it.id] ?? 'R';
    const cut = !live.has(it.id);
    const from = it.id + 1;
    const toSlot = slotOf(to, n);
    // Forward arrows leave the right face, flipped ones leave the left face.
    const sides = cut ? undefined : toSlot > from ? ({ from: 'right', to: 'left' } as const) : ({ from: 'left', to: 'right' } as const);
    const tone: Tone = s.hot === it.id ? (s.hotTone ?? 'compare') : cut ? 'muted' : 'default';
    entities.push(link(`next-${it.id}`, { entity: `node-${it.id}`, side: sides?.from }, { entity: entityOf(to), side: sides?.to }, { tone, dashed: cut }));
  }

  if (s.head !== undefined) entities.push(ptr('head', entityOf(s.head), 0, 'head', { tone: 'default', codeVar: 'head' }));
  if (s.prev !== undefined) entities.push(ptr('prev', entityOf(s.prev), 0, 'prev', { tone: 'done', codeVar: 'prev' }));
  if (s.curr !== undefined) entities.push(ptr('curr', entityOf(s.curr), 0, 'curr', { tone: 'active', codeVar: 'curr' }));
  if (s.nextNode !== undefined) entities.push(ptr('next-node', entityOf(s.nextNode), 0, 'next_node', { side: 'top', tone: 'compare', codeVar: 'next_node' }));

  if (!s.hideVars) {
    const row = (name: string, r: Ref | undefined): { name: string; value: string; tone: Tone } => ({ name, value: nameOf(s.items, r), tone: r === undefined ? 'muted' : 'default' });
    entities.push(vars('vals', 0, VARS_Y, [row('prev', s.prev), row('curr', s.curr), row('next_node', s.nextNode)], { label: 'variables', width: 190 }));
  }
  if (s.note) entities.push(note('note', s.hideVars ? 0 : NOTE_X, VARS_Y, s.note, { tone: s.noteTone ?? 'note' }));
  return entities;
}

const listFrom = (items: readonly Item[], next: readonly Ref[], from: Ref): string => `[${walk(next, from).map((id) => items[id]?.v).join(', ')}]`;

/** Runs reverse_list on any list and records one step per decision (chapter "run", final code). */
function traceReverse(values: readonly number[]): Step[] {
  const items: Item[] = values.map((v, id) => ({ v, id }));
  const n = items.length;
  const next: Ref[] = items.map((it) => (it.id + 1 < n ? it.id + 1 : 'R'));
  const head: Ref = 0;
  const steps: Step[] = [];
  let flips = 0;
  const metrics = (result = '—'): Record<string, string | number> => ({ flips, result });
  const name = (r: Ref | undefined): string => nameOf(items, r);
  const val = (r: Ref): string => (typeof r === 'number' ? String(items[r]?.v) : 'None');

  let prev: Ref = 'L';
  let curr: Ref = head;
  let nextNode: Ref | undefined;
  const at = (extra: Partial<RevState> = {}): Step['scene'] => ({ entities: scene({ items, next: [...next], head, prev, curr, nextNode, ...extra }) });

  steps.push({
    chapter: 'run',
    short: 'Start',
    title: `Reverse ${listFrom(items, next, head)}`,
    body: `Line 8: \`prev = None\`, nothing is reversed yet. Line 9: \`curr = head\`, node ${val(head)}, the first node to flip.`,
    code: { view: 'final', lines: [8, 9] },
    values: { 8: 'prev = None', 9: `curr = ${name(curr)}` },
    metrics: metrics(),
    scene: at(),
  });

  let first = true;
  while (typeof curr === 'number') {
    const c: number = curr;
    const saved: Ref = next[c] ?? 'R';
    if (first) {
      steps.push({
        chapter: 'run',
        short: 'Loop?',
        title: `curr is node ${val(c)}: there is a node to flip`,
        body: 'Line 11: `curr is not None` is true, so the loop body runs.',
        code: { view: 'final', lines: [11] },
        values: { 11: 'curr is not None → True' },
        metrics: metrics(),
        scene: at(),
      });
      nextNode = saved;
      steps.push({
        chapter: 'run',
        short: 'Save',
        title: `Save the rest: next_node = ${name(saved)}`,
        body: `Line 13 remembers where \`curr.next\` points, ${name(saved)}. The next line overwrites that arrow, and this is the only way back to the rest of the list.`,
        code: { view: 'final', lines: [13] },
        values: { 13: `next_node = ${name(saved)}` },
        metrics: metrics(),
        scene: at({ hot: c }),
      });
    } else {
      nextNode = saved;
      steps.push({
        chapter: 'run',
        short: `Save ${val(saved)}`,
        title: `curr is node ${val(c)}: save next_node = ${name(saved)}`,
        body: `Line 11: \`curr\` isn’t \`None\`, so the loop goes on. Line 13 saves \`curr.next\`, ${name(saved)}, before it gets overwritten.`,
        code: { view: 'final', lines: [11, 13] },
        values: { 11: 'curr is not None → True', 13: `next_node = ${name(saved)}` },
        metrics: metrics(),
        scene: at({ hot: c }),
      });
    }

    next[c] = prev;
    flips += 1;
    steps.push({
      chapter: 'run',
      short: 'Flip',
      title: `Flip node ${val(c)}’s arrow back to ${name(prev)}`,
      body: `Line 14: \`curr.next = prev\`. Node ${val(c)} now points ${prev === 'L' ? 'at `None`: it will be the new tail' : `back at node ${val(prev)}`}. The rest of the list is still safe in \`next_node\`.`,
      code: { view: 'final', lines: [14] },
      values: { 14: `curr.next = ${name(prev)}` },
      metrics: metrics(),
      scene: at({ hot: c, hotTone: 'active' }),
    });

    prev = c;
    steps.push({
      chapter: 'run',
      short: 'prev →',
      title: `prev moves to node ${val(c)}`,
      body: `Line 15: \`prev = curr\`. The reversed part now starts at node ${val(c)}: ${listFrom(items, next, prev)}.`,
      code: { view: 'final', lines: [15] },
      values: { 15: `prev = ${name(prev)}` },
      metrics: metrics(),
      scene: at(),
    });

    curr = saved;
    steps.push({
      chapter: 'run',
      short: 'curr →',
      title: typeof curr === 'number' ? `curr moves to node ${val(curr)}` : 'curr moves past the end',
      body:
        typeof curr === 'number'
          ? `Line 16: \`curr = next_node\`, node ${val(curr)}, the first node not yet flipped.`
          : 'Line 16: `curr = next_node`, which is `None`: every node has been flipped.',
      code: { view: 'final', lines: [16] },
      values: { 16: `curr = ${name(curr)}` },
      metrics: metrics(),
      scene: at(),
    });
    first = false;
  }

  steps.push({
    chapter: 'run',
    short: 'Loop?',
    title: 'curr is None: every arrow is flipped',
    body: 'Line 11: `curr is not None` is false, so the loop ends.',
    code: { view: 'final', lines: [11] },
    values: { 11: 'curr is not None → False' },
    metrics: metrics(),
    scene: at(),
  });
  const result = listFrom(items, next, prev);
  steps.push({
    chapter: 'run',
    short: 'Return',
    title: `Return node ${val(prev)}: ${result}`,
    body: `Line 19 returns \`prev\`, the old tail and the new head. The caller stores it as its head: **${result}**.`,
    code: { view: 'final', lines: [19] },
    values: { 19: `return ${name(prev)}` },
    metrics: metrics(result),
    scene: at({ tones: typeof prev === 'number' ? { [prev]: 'found' } : {} }),
  });
  return steps;
}

const VALUES = [10, 20, 30, 40] as const;
const RUN = traceReverse(VALUES);
const startMetrics = { flips: 0, result: '—' } as const;
const FINAL_METRICS = RUN.at(-1)?.metrics ?? startMetrics;
const ITEMS: readonly Item[] = VALUES.map((v, id) => ({ v, id }));
const FORWARD: readonly Ref[] = [1, 2, 3, 'R'];
/** Scene of run step n (0-based), so build steps show the moment they describe. */
const at = (n: number): Step['scene'] => RUN[n]?.scene ?? { entities: [] };
const find = (short: string): number => RUN.findIndex((s) => s.short === short);
const RUN_START = 9;

export default defineWalkthrough({
  id: 'learn/linked-list/reverse-linked-list',
  title: 'Reverse a Linked List, one arrow at a time',
  summary: 'From the idea to the code: walk the list once and turn every next arrow around, with three pointers so the rest of the list is never lost.',
  minutes: 7,
  code: {
    lang: 'python',
    source: `class ListNode:
    def __init__(self, val: int, next: "ListNode | None" = None) -> None:
        self.val = val
        self.next = next


def reverse_list(head: ListNode | None) -> ListNode | None:
    prev: ListNode | None = None
    curr = head

    while curr is not None:
        # Save the rest of the list before overwriting curr.next
        next_node = curr.next
        curr.next = prev
        prev = curr
        curr = next_node

    # When curr hits None, prev sits on the original tail (new head)
    return prev`,
  },
  snapshots: {
    copy: `def reverse_list(head: ListNode | None) -> ListNode | None:
    values = []
    curr = head
    while curr is not None:
        values.append(curr.val)  # One extra slot per node
        curr = curr.next
    curr = head
    while curr is not None:
        curr.val = values.pop()  # Write them back, last first
        curr = curr.next
    return head`,
  },
  metrics: [
    { key: 'flips', label: 'Arrows flipped' },
    { key: 'result', label: 'Returns' },
  ],
  legend: [
    { tone: 'active', label: 'curr / arrow just flipped' },
    { tone: 'compare', label: 'next_node (saved rest)' },
    { tone: 'done', label: 'reversed part (from prev)' },
    { tone: 'found', label: 'new head' },
    { tone: 'miss', label: 'arrow flipped too early' },
    { tone: 'muted', label: 'None / unreachable' },
  ],
  goals: [
    { text: 'See why copying the values costs O(n) memory', step: 2 },
    { text: 'Keep three pointers: prev, curr, next_node', step: 3 },
    { text: 'Watch each arrow flip', step: RUN_START + find('Flip') },
    { text: 'Know why next_node is saved first', step: RUN_START + RUN.length + 1 },
  ],
  steps: [
    {
      chapter: 'problem',
      short: 'The brief',
      title: 'Reverse 10 → 20 → 30 → 40',
      body: 'Like a row of dominoes all pointing right: walk down the row and turn each one to point left. Lines 1–2 are the same `ListNode` as in the Singly Linked List lesson.\n\nWe get `head`, reverse the list **in place**, and return the new head: here node 40, giving `[40, 30, 20, 10]`.',
      code: { view: 'signature', lines: [1, 2] },
      metrics: startMetrics,
      scene: { entities: scene({ items: ITEMS, next: FORWARD, head: 0, hideVars: true, note: 'reverse_list(head)\n[10, 20, 30, 40] → [40, 30, 20, 10]' }) },
    },
    {
      chapter: 'idea',
      short: 'Copy out',
      title: 'The obvious way: copy the values out',
      body: 'Lines 4–5 copy every value into a Python list, and line 9 writes them back last-first. It works, but `values` holds one slot per node: **`O(n)` extra memory**.\n\nThe arrows can do the work instead.',
      code: { view: 'snapshot', id: 'copy', lines: [5, 9] },
      metrics: startMetrics,
      scene: {
        entities: [
          ...scene({ items: ITEMS, next: FORWARD, head: 0, hideVars: true }),
          arr('values', 0, VARS_Y, VALUES, { label: 'values', tones: { 0: 'miss', 1: 'miss', 2: 'miss', 3: 'miss' }, codeVar: 'values' }),
          note('note', 260, VARS_Y, 'one extra slot per node\n→ O(n) memory', { tone: 'miss' }),
        ],
      },
    },
    {
      chapter: 'idea',
      short: 'Flip arrows',
      title: 'Flip each arrow as you walk',
      body: 'Walk once and make every node point at the node **before** it. `prev` holds that node (`None` at first), `curr` is the node being flipped.\n\nFlipping `curr.next` cuts off the rest of the list, so `next_node` keeps hold of it first.',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: { entities: scene({ items: ITEMS, next: FORWARD, head: 0, prev: 'L', curr: 0, nextNode: 1, hot: 0, note: 'prev: node before curr\ncurr: node being flipped\nnext_node: the rest' }) },
    },
    {
      chapter: 'build',
      short: 'Node',
      title: 'Lines 3–4: each node has one arrow',
      body: 'Line 4 is the arrow we turn around: `next`. Nothing else about a node changes, and no node moves.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4], lines: [3, 4] },
      metrics: startMetrics,
      changes: ['self.val = val', 'self.next = next'],
      scene: { entities: scene({ items: ITEMS, next: FORWARD, head: 0, hideVars: true, note: 'head → 10 → 20 → 30 → 40 → None' }) },
    },
    {
      chapter: 'build',
      short: 'Start',
      title: 'Lines 7–9: nothing reversed yet',
      body: 'Line 8 starts `prev` at `None`: the first node becomes the tail, so its arrow must end up pointing at `None`. Line 9 starts `curr` at the head.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 7, 8, 9], lines: [7, 8, 9] },
      metrics: startMetrics,
      changes: ['prev = None', 'curr = head'],
      scene: at(0),
    },
    {
      chapter: 'build',
      short: 'Save',
      title: 'Lines 11–13: save the rest before touching the arrow',
      body: 'Line 11 runs until `curr` walks off the end; an empty list (`head = None`) skips it and returns `None`. Line 13 saves `curr.next` in `next_node`, so the rest of the list stays reachable.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 7, 8, 9, 11, 12, 13], lines: [11, 12, 13] },
      metrics: startMetrics,
      changes: ['while curr is not None', 'next_node = curr.next'],
      scene: at(find('Save')),
    },
    {
      chapter: 'build',
      short: 'Flip',
      title: 'Lines 14–16: flip, then slide both pointers',
      body: 'Line 14 turns the arrow back to `prev`. Lines 15–16 slide the window one node right: `prev` takes `curr`’s place, and `curr` takes the saved `next_node`.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 7, 8, 9, 11, 12, 13, 14, 15, 16], lines: [14, 15, 16] },
      metrics: startMetrics,
      changes: ['curr.next = prev', 'prev = curr', 'curr = next_node'],
      scene: at(find('Flip')),
    },
    {
      chapter: 'build',
      short: 'Return',
      title: 'Lines 18–19: prev is the new head',
      body: 'When `curr` is `None`, every arrow is flipped and `prev` sits on the old tail. Line 19 returns it.\n\nThat’s the whole function. Now let’s run it.',
      code: { view: 'final', lines: [18, 19] },
      metrics: startMetrics,
      changes: ['return prev'],
      scene: at(RUN.length - 1),
    },
    ...RUN,
    {
      chapter: 'why',
      short: 'Recap',
      title: 'One pass, three pointers',
      body: 'Each node is visited once and gets exactly one flip: **`O(n)` time**. `prev`, `curr` and `next_node` are the only extra memory, however long the list: **`O(1)` space**.\n\nSwitch to **🧪 Try your own** to reverse your own list.',
      code: { view: 'final', lines: [13, 14, 15, 16] },
      metrics: FINAL_METRICS,
      scene: { entities: scene({ items: ITEMS, next: ['L', 0, 1, 2], prev: 3, hideVars: true, tones: { 3: 'found' }, note: 'n flips, one per node → O(n)\n3 pointers, no copy → O(1)', noteTone: 'found' }) },
    },
    {
      chapter: 'why',
      short: 'Save first',
      title: 'Why next_node is saved before the flip',
      body: 'Swap lines 13 and 14 and the flip runs first: `curr.next = prev` overwrites the only arrow to node 20. Nodes 20, 30 and 40 are lost.\n\nThat is the key decision: save `curr.next`, then overwrite it.',
      code: { view: 'final', lines: [13, 14] },
      values: { 13: 'first: keep hold of the rest', 14: 'then: overwrite the arrow' },
      metrics: FINAL_METRICS,
      scene: { entities: scene({ items: ITEMS, next: ['L', 2, 3, 'R'], prev: 'L', curr: 0, hot: 0, hotTone: 'miss', hideVars: true, note: 'flip first: 10 → None\nnodes 20, 30, 40 are lost', noteTone: 'miss' }) },
    },
  ],
  trace: {
    title: 'Reverse your own list',
    inputs: [{ name: 'values', label: 'Node values, head first', kind: 'numbers', default: '10, 20, 30, 40' }],
    presets: [
      { label: 'Two nodes', values: { values: '4, 9' } },
      { label: 'One node', values: { values: '42' } },
      { label: 'Five nodes', values: { values: '10, 20, 30, 40, 50' } },
      { label: 'Repeats', values: { values: '3, 3, -1' } },
    ],
    maxItems: 6,
    run: (values) => {
      const list = values['values'];
      if (!Array.isArray(list) || list.length === 0) throw new Error('Enter at least one node value.');
      return traceReverse(list);
    },
  },
});
