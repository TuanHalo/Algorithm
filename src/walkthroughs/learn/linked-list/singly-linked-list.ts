import { arr, defineWalkthrough, link, note, ptr, vars } from '../../../lib/walkthrough/helpers';
import type { Entity, LinkEntity, Step, Tone } from '../../../lib/walkthrough/types';

/**
 * How a linked list is drawn (the topic's reference, `.migration-contract.md` §5.1):
 * every node is a one-cell block `node-<id>` keyed by its identity, standing in
 * its own slot (`id × NODE_PITCH`) because nodes never move in memory. Every
 * `next` field is a `link` arrow `next-<id>` to the node it points at, or to the
 * `None` block after the last slot. A node that is no longer reachable from
 * `head` is lifted straight up out of the row (floor x and y both shift by
 * `CUT_Y`, which is straight up on screen), muted, with its arrow dashed.
 */
const NODE_PITCH = 100;
const CUT_Y = -100;
const VARS_Y = 150;
const NOTE_X = 230;

/** A node: its value and a stable id (its slot), so it keeps its block. */
interface Item {
  readonly v: number;
  readonly id: number;
}

interface ListState {
  readonly items: readonly Item[];
  /** `next[id]` is the id of the node that node points at, or null for `None`. */
  readonly next: readonly (number | null)[];
  /** Id of the head node, or null when the list is empty. */
  readonly head: number | null;
  readonly curr?: number;
  readonly val?: number;
  /** Tone per node id (cut nodes are always muted). */
  readonly tones?: Readonly<Record<number, Tone>>;
  /** A node whose `next` arrow is in focus, and the arrow's tone. */
  readonly hot?: number;
  readonly hotTone?: Tone;
  readonly note?: string;
  readonly noteTone?: Tone;
  readonly hideVars?: boolean;
}

/** Ids reachable from head, in order. */
function chainOf(s: Pick<ListState, 'next' | 'head'>): number[] {
  const out: number[] = [];
  for (let id = s.head; id !== null && id !== undefined && !out.includes(id); id = s.next[id] ?? null) out.push(id);
  return out;
}

const valueOf = (s: ListState, id: number | null | undefined): string => {
  if (id === undefined) return '—';
  if (id === null) return 'None';
  return `node ${s.items[id]?.v ?? '?'}`;
};

/** Scene for one moment: the nodes, their `next` arrows, the pointers, and the variables. */
function scene(s: ListState): Entity[] {
  const n = s.items.length;
  const reachable = new Set(chainOf(s));
  const nodeId = (id: number | null): string => (id === null ? 'none' : `node-${id}`);
  const entities: Entity[] = [];

  for (const it of s.items) {
    const cut = !reachable.has(it.id);
    entities.push(
      arr(nodeId(it.id), it.id * NODE_PITCH + (cut ? CUT_Y : 0), cut ? CUT_Y : 0, [it.v], {
        tones: { 0: cut ? 'muted' : (s.tones?.[it.id] ?? 'default') },
        showIndex: false,
        itemKeys: [it.id],
      }),
    );
  }
  entities.push(arr('none', n * NODE_PITCH, 0, ['None'], { tones: { 0: 'muted' }, showIndex: false }));

  const links: LinkEntity[] = [];
  for (const it of s.items) {
    const to = s.next[it.id] ?? null;
    const cut = !reachable.has(it.id);
    const toSlot = to === null ? n : to;
    // Arrows between nodes in the row leave the right face and enter the left one.
    const sides = !cut && toSlot > it.id ? { from: 'right', to: 'left' } as const : undefined;
    const tone: Tone = s.hot === it.id ? (s.hotTone ?? 'compare') : cut ? 'muted' : 'default';
    links.push(
      link(`next-${it.id}`, { entity: nodeId(it.id), side: sides?.from }, { entity: nodeId(to), side: sides?.to }, {
        tone,
        dashed: cut,
      }),
    );
  }
  entities.push(...links);

  if (s.head !== null) entities.push(ptr('head', nodeId(s.head), 0, 'head', { tone: 'default', codeVar: 'head' }));
  else entities.push(ptr('head', 'none', 0, 'head', { tone: 'default', codeVar: 'head' }));
  if (s.curr !== undefined) entities.push(ptr('curr', nodeId(s.curr), 0, 'curr', { tone: 'active', codeVar: 'curr' }));

  if (!s.hideVars) {
    const currNext = s.curr === undefined ? undefined : (s.next[s.curr] ?? null);
    entities.push(
      vars(
        'vals',
        0,
        VARS_Y,
        [
          { name: 'val', value: s.val ?? '—', tone: s.val === undefined ? 'muted' : 'default' },
          { name: 'curr', value: valueOf(s, s.curr), tone: s.curr === undefined ? 'muted' : 'default' },
          { name: 'curr.next', value: valueOf(s, currNext), tone: s.curr === undefined ? 'muted' : 'default' },
        ],
        { label: 'variables', width: 190 },
      ),
    );
  }
  if (s.note) entities.push(note('note', s.hideVars ? 0 : NOTE_X, VARS_Y, s.note, { tone: s.noteTone ?? 'note' }));
  return entities;
}

const listText = (s: Pick<ListState, 'items' | 'next' | 'head'>): string => {
  const chain = chainOf(s);
  return chain.length === 0 ? '[]' : `[${chain.map((id) => s.items[id]?.v).join(', ')}]`;
};

/** Runs delete on any list and records one step per decision (chapter "run", final code). */
function traceDelete(values: readonly number[], val: number): Step[] {
  const items: Item[] = values.map((v, id) => ({ v, id }));
  const n = items.length;
  const next: (number | null)[] = items.map((it) => (it.id + 1 < n ? it.id + 1 : null));
  let head: number | null = n > 0 ? 0 : null;
  const steps: Step[] = [];
  let checks = 0;
  let hops = 0;
  const metrics = (result = '—'): Record<string, string | number> => ({ checks, hops, result });
  const v = (id: number | null): number | undefined => (id === null ? undefined : items[id]?.v);
  const base = (): Omit<ListState, 'tones'> => ({ items, next: [...next], head, val });

  steps.push({
    chapter: 'run',
    short: 'Start',
    title: `Delete ${val} from ${listText({ items, next, head })}`,
    body: `Line 8: \`head\` is a node, not \`None\`, so the list isn’t empty and we go on.`,
    code: { view: 'final', lines: [8] },
    values: { 8: 'head is None → False' },
    metrics: metrics(),
    scene: { entities: scene({ ...base() }) },
  });

  const h = head ?? 0;
  const hv = v(h) ?? 0;
  checks += 1;
  if (hv === val) {
    steps.push({
      chapter: 'run',
      short: 'Head?',
      title: `The head holds ${val}`,
      body: `Line 10: \`${hv} == ${val}\` is true, so the node to delete is the head itself. No node sits before it, so there is no arrow to rewire.`,
      code: { view: 'final', lines: [10] },
      values: { 10: `${hv} == ${val} → True` },
      metrics: metrics(),
      scene: { entities: scene({ ...base(), tones: { [h]: 'found' } }) },
    });
    head = next[h] ?? null;
    const result = listText({ items, next, head });
    steps.push({
      chapter: 'run',
      short: 'Return',
      title: head === null ? 'Return None: the list is now empty' : `Return node ${v(head)}, the new head`,
      body:
        head === null
          ? `Line 11 returns \`head.next\`, which is \`None\`. The only node is gone, and the caller’s list is empty: **${result}**.`
          : `Line 11 returns \`head.next\`, node ${v(head)}. The caller stores it as its new head, and the old head drops out of the chain: **${result}**.`,
      code: { view: 'final', lines: [11] },
      values: { 11: `return ${head === null ? 'None' : `node ${v(head)}`}` },
      metrics: metrics(result),
      scene: { entities: scene({ ...base(), tones: head === null ? {} : { [head]: 'found' } }) },
    });
    return steps;
  }
  steps.push({
    chapter: 'run',
    short: 'Head?',
    title: `The head holds ${hv}, not ${val}`,
    body: `Line 10: \`${hv} == ${val}\` is false, so the head stays. Whatever we delete has a node before it.`,
    code: { view: 'final', lines: [10] },
    values: { 10: `${hv} == ${val} → False` },
    metrics: metrics(),
    scene: { entities: scene({ ...base(), tones: { [h]: 'compare' } }) },
  });

  let curr = h;
  const passed: number[] = [];
  const doneTones = (): Record<number, Tone> => Object.fromEntries(passed.map((id) => [id, 'done' as Tone]));
  steps.push({
    chapter: 'run',
    short: 'curr = head',
    title: `curr starts at the head, node ${hv}`,
    body: 'Line 12 puts `curr` on the head. From here on, `curr` is always the node **before** the one we test.',
    code: { view: 'final', lines: [12] },
    values: { 12: `curr = node ${hv}` },
    metrics: metrics(),
    scene: { entities: scene({ ...base(), curr, tones: { [curr]: 'active' } }) },
  });

  for (;;) {
    const nx = next[curr] ?? null;
    if (nx === null) {
      steps.push({
        chapter: 'run',
        short: 'End',
        title: `curr.next is None: ${val} isn’t in the list`,
        body: `Line 13: \`curr.next is not None\` is false, because node ${v(curr)} is the tail. The loop stops without finding ${val}.`,
        code: { view: 'final', lines: [13] },
        values: { 13: 'curr.next is None → stop' },
        metrics: metrics(),
        scene: { entities: scene({ ...base(), curr, tones: { ...doneTones(), [curr]: 'active' }, hot: curr, hotTone: 'miss' }) },
      });
      break;
    }
    const nv = v(nx) ?? 0;
    checks += 1;
    if (nv !== val) {
      steps.push({
        chapter: 'run',
        short: `${nv}?`,
        title: `curr.next holds ${nv}, not ${val}: keep walking`,
        body: `Line 13 looks one node ahead: \`curr.next.val != ${val}\` is \`${nv} != ${val}\`, true. The match, if any, is further on.`,
        code: { view: 'final', lines: [13] },
        values: { 13: `${nv} != ${val} → True` },
        metrics: metrics(),
        scene: { entities: scene({ ...base(), curr, tones: { ...doneTones(), [curr]: 'active', [nx]: 'compare' }, hot: curr }) },
      });
      passed.push(curr);
      curr = nx;
      hops += 1;
      steps.push({
        chapter: 'run',
        short: 'Hop',
        title: `curr hops to node ${nv}`,
        body: `Line 14: \`curr = curr.next\`. One hop along an arrow; nothing in the list changes.`,
        code: { view: 'final', lines: [14] },
        values: { 14: `curr = node ${nv}` },
        metrics: metrics(),
        scene: { entities: scene({ ...base(), curr, tones: { ...doneTones(), [curr]: 'active' } }) },
      });
      continue;
    }
    steps.push({
      chapter: 'run',
      short: `${nv}!`,
      title: `curr.next holds ${val}: stop here`,
      body: `Line 13: \`${nv} != ${val}\` is false, so the loop stops. \`curr\` sits on node ${v(curr)}, the node **before** the match, whose arrow we can change.`,
      code: { view: 'final', lines: [13] },
      values: { 13: `${nv} != ${val} → False` },
      metrics: metrics(),
      scene: { entities: scene({ ...base(), curr, tones: { ...doneTones(), [curr]: 'active', [nx]: 'found' }, hot: curr }) },
    });
    break;
  }

  const match = next[curr] ?? null;
  if (match === null) {
    steps.push({
      chapter: 'run',
      short: 'Found?',
      title: 'Nothing to bypass',
      body: `Line 15: \`curr.next is not None\` is false, so line 16 is skipped and the list stays as it was.`,
      code: { view: 'final', lines: [15] },
      values: { 15: 'curr.next is not None → False' },
      metrics: metrics(),
      scene: { entities: scene({ ...base(), curr, tones: { ...doneTones(), [curr]: 'active' } }) },
    });
  } else {
    const after = next[match] ?? null;
    steps.push({
      chapter: 'run',
      short: 'Found?',
      title: `Node ${val} is there: bypass it`,
      body: `Line 15: \`curr.next is not None\` is true, so the loop stopped on a match, not at the end of the list.`,
      code: { view: 'final', lines: [15] },
      values: { 15: 'curr.next is not None → True' },
      metrics: metrics(),
      scene: { entities: scene({ ...base(), curr, tones: { ...doneTones(), [curr]: 'active', [match]: 'found' } }) },
    });
    next[curr] = after;
    steps.push({
      chapter: 'run',
      short: 'Bypass',
      title: `Re-point node ${v(curr)} past node ${val}`,
      body: `Line 16: \`curr.next = curr.next.next\`, so node ${v(curr)} now points at ${after === null ? '`None`' : `node ${v(after)}`}. Node ${val} is no longer reachable from \`head\`, and Python frees it. Nothing shifted.`,
      code: { view: 'final', lines: [16] },
      values: { 16: `curr.next = ${after === null ? 'None' : `node ${v(after)}`}` },
      metrics: metrics(),
      scene: { entities: scene({ ...base(), curr, tones: { ...doneTones(), [curr]: 'active' }, hot: curr, hotTone: 'active' }) },
    });
  }

  const result = listText({ items, next, head });
  steps.push({
    chapter: 'run',
    short: 'Return',
    title: `Return the head: ${result}`,
    body: `Line 17 returns \`head\`, which didn’t change. The list is now **${result}**.`,
    code: { view: 'final', lines: [17] },
    values: { 17: `return node ${v(head)}` },
    metrics: metrics(result),
    scene: { entities: scene({ ...base(), tones: Object.fromEntries(chainOf({ next, head }).map((id) => [id, 'done' as Tone])) }) },
  });
  return steps;
}

const VALUES = [4, 7, 2, 9] as const;
const VAL = 2;
const RUN = traceDelete(VALUES, VAL);
const startMetrics = { checks: 0, hops: 0, result: '—' } as const;
const FINAL_METRICS = RUN.at(-1)?.metrics ?? startMetrics;
const ITEMS: readonly Item[] = VALUES.map((v, id) => ({ v, id }));
const NEXT: readonly (number | null)[] = [1, 2, 3, null];
const AFTER: readonly (number | null)[] = [1, 3, 3, null];
/** Scene of run step n (0-based), so build steps show the moment they describe. */
const at = (n: number): Step['scene'] => RUN[n]?.scene ?? { entities: [] };
const find = (short: string): number => RUN.findIndex((s) => s.short === short);

export default defineWalkthrough({
  id: 'learn/linked-list/singly-linked-list',
  title: 'Singly Linked List, nodes joined by arrows',
  summary: 'From the idea to the code: a chain of nodes where each one knows only the next, and how deleting a value is one re-pointed arrow instead of a shift.',
  minutes: 6,
  code: {
    lang: 'python',
    source: `class ListNode:
    def __init__(self, val: int, next: "ListNode | None" = None) -> None:
        self.val = val
        self.next = next  # The only way to reach the rest of the list


def delete(head: ListNode | None, val: int) -> ListNode | None:
    if head is None:
        return None
    if head.val == val:
        return head.next  # No node before the head: its successor becomes the head
    curr = head
    while curr.next is not None and curr.next.val != val:
        curr = curr.next  # Stop one node early: that node's arrow must change
    if curr.next is not None:
        curr.next = curr.next.next  # Bypass the matched node
    return head`,
  },
  snapshots: {
    array: `def delete(nums: list[int], val: int) -> None:
    i = nums.index(val)
    for k in range(i, len(nums) - 1):
        nums[k] = nums[k + 1]  # Every later value moves one slot left
    nums.pop()`,
  },
  metrics: [
    { key: 'checks', label: 'Values checked' },
    { key: 'hops', label: 'Hops' },
    { key: 'result', label: 'List after' },
  ],
  legend: [
    { tone: 'active', label: 'curr / arrow just changed' },
    { tone: 'compare', label: 'node being checked' },
    { tone: 'found', label: 'holds val' },
    { tone: 'done', label: 'walked past' },
    { tone: 'miss', label: 'end of the list' },
    { tone: 'muted', label: 'unreachable / None' },
  ],
  goals: [
    { text: 'See why a list deletes without shifting', step: 2 },
    { text: 'Stop one node before the match', step: 4 },
    { text: 'Follow every hop and the bypass', step: 10 + find('Bypass') },
    { text: 'Know why delete returns the head', step: 10 + RUN.length + 1 },
  ],
  steps: [
    {
      chapter: 'problem',
      short: 'The brief',
      title: 'Delete 2 from the list 4 → 7 → 2 → 9',
      body: 'Like a treasure hunt: each clue holds a prize and tells you where the next clue is. Lines 1–2 define that clue, a `ListNode` with a value and a `next` node.\n\nWe get the first node, `head`, and a value `val`. Remove the first node holding `val` and return the head of what’s left: here `[4, 7, 9]`.',
      code: { view: 'signature', lines: [1, 2] },
      metrics: startMetrics,
      scene: { entities: scene({ items: ITEMS, next: NEXT, head: 0, val: VAL, hideVars: true, note: 'delete(head, 2)\n[4, 7, 2, 9] → [4, 7, 9]' }) },
    },
    {
      chapter: 'idea',
      short: 'Array way',
      title: 'In an array, every later value shifts',
      body: 'An array keeps its values side by side. Line 4 closes the gap by moving every value after the 2 one slot left: up to `n` moves for one delete.\n\nA linked list doesn’t store its values side by side, so nothing needs to move.',
      code: { view: 'snapshot', id: 'array', lines: [3, 4] },
      metrics: startMetrics,
      scene: {
        entities: [
          arr('nums', 0, 0, VALUES, { label: 'nums', tones: { 2: 'miss', 3: 'compare' }, codeVar: 'nums' }),
          link('shift-3', { entity: 'nums', index: 3, side: 'top' }, { entity: 'nums', index: 2, side: 'top' }, { tone: 'miss', dashed: true }),
          note('note', 0, VARS_Y, 'delete 2 → 9 moves one slot left\nup to n moves per delete → O(n)', { tone: 'miss' }),
        ],
      },
    },
    {
      chapter: 'idea',
      short: 'Re-point',
      title: 'In a list, one arrow changes',
      body: 'Each node sits wherever it was made, and its `next` arrow says which node comes after it. To drop node 2, make node 7’s arrow skip over it to node 9.\n\nOne arrow changes, and no node moves.',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: { entities: scene({ items: ITEMS, next: AFTER, head: 0, hot: 1, hotTone: 'active', hideVars: true, tones: { 1: 'active' }, note: 'node 7: next → node 9\nnode 2 is no longer reachable\nno value moved' }) },
    },
    {
      chapter: 'idea',
      short: 'One early',
      title: 'Stop one node before the match',
      body: 'Walk to node 2 itself and you’re stuck: the arrow to change belongs to node 7, and a singly linked node can’t look back.\n\nSo `curr` stops on the node **before** the match, and peeks ahead with `curr.next.val`.',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: { entities: scene({ items: ITEMS, next: NEXT, head: 0, curr: 1, val: VAL, tones: { 1: 'active', 2: 'found' }, hot: 1, note: 'curr peeks at node 2\nnode 7’s arrow must change' }) },
    },
    {
      chapter: 'build',
      short: 'Node',
      title: 'Lines 3–4: a node is a value and an arrow',
      body: 'Line 3 stores the value. Line 4 stores `next`, the node that comes after this one, or `None` for the last node.\n\nThe list itself is just its first node: follow `next` from `head` to reach the rest.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4], lines: [3, 4] },
      metrics: startMetrics,
      changes: ['self.val = val', 'self.next = next'],
      scene: { entities: scene({ items: ITEMS, next: NEXT, head: 0, hideVars: true, note: 'head → 4 → 7 → 2 → 9 → None' }) },
    },
    {
      chapter: 'build',
      short: 'Empty',
      title: 'Lines 7–9: an empty list has nothing to delete',
      body: 'Line 7 takes the head and the value, and returns the head of the list afterwards. An empty list is `head = None`, so lines 8–9 return `None` straight away.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 7, 8, 9], lines: [7, 8, 9] },
      metrics: startMetrics,
      changes: ['if head is None: return None'],
      scene: at(0),
    },
    {
      chapter: 'build',
      short: 'Head case',
      title: 'Lines 10–11: deleting the head',
      body: 'No node sits before the head, so there is no arrow to re-point. Line 11 returns `head.next` instead: the second node becomes the head.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 7, 8, 9, 10, 11], lines: [10, 11] },
      metrics: startMetrics,
      changes: ['if head.val == val: return head.next'],
      scene: at(1),
    },
    {
      chapter: 'build',
      short: 'Walk',
      title: 'Lines 12–14: walk until the next node holds val',
      body: 'Line 12 starts `curr` at the head. Line 13 keeps going while there **is** a next node and it doesn’t hold `val`. Line 14 hops one arrow forward.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 7, 8, 9, 10, 11, 12, 13, 14], lines: [12, 13, 14] },
      metrics: startMetrics,
      changes: ['curr = head', 'while curr.next is not None and curr.next.val != val', 'curr = curr.next'],
      scene: at(find('2!')),
    },
    {
      chapter: 'build',
      short: 'Bypass',
      title: 'Lines 15–17: bypass the match, return the head',
      body: 'If the walk stopped on a match (line 15), line 16 points `curr` past it. Line 17 returns `head`, which only changes in the head case.\n\nThat’s the whole function. Now let’s run it.',
      code: { view: 'final', lines: [15, 16, 17] },
      metrics: startMetrics,
      changes: ['if curr.next is not None', 'curr.next = curr.next.next', 'return head'],
      scene: at(find('Bypass')),
    },
    ...RUN,
    {
      chapter: 'why',
      short: 'Recap',
      title: 'Walk to it, then change one arrow',
      body: 'The walk checks each node at most once: **`O(n)` time** when the value is near the end or missing. The bypass itself is one assignment, and `curr` is the only extra memory: **`O(1)` space**.\n\nSwitch to **🧪 Try your own** to delete from your own list.',
      code: { view: 'final', lines: [13, 16] },
      metrics: FINAL_METRICS,
      scene: { entities: scene({ items: ITEMS, next: AFTER, head: 0, hideVars: true, tones: { 0: 'done', 1: 'done', 3: 'done' }, note: 'walk: up to n − 1 hops → O(n)\nbypass: one arrow → O(1)\nextra memory: curr → O(1)', noteTone: 'found' }) },
    },
    {
      chapter: 'why',
      short: 'Return head',
      title: 'Why delete returns the head',
      body: 'Delete the head and the list starts somewhere new, but the caller’s `head` variable still points at the old node. Line 11 hands back the new head.\n\nThat is the key decision: call it as `head = delete(head, val)`, or the caller keeps walking a node that left the list.',
      code: { view: 'final', lines: [11, 17] },
      values: { 11: 'the head changed: hand back the new one', 17: 'the head stayed: hand it back anyway' },
      metrics: FINAL_METRICS,
      scene: { entities: scene({ items: ITEMS, next: NEXT, head: 1, hideVars: true, tones: { 1: 'found' }, note: 'delete(head, 4) returns node 7\nkeep the old head → still sees 4', noteTone: 'miss' }) },
    },
  ],
  trace: {
    title: 'Delete a value from your own list',
    inputs: [
      { name: 'values', label: 'Node values, head first', kind: 'numbers', default: '4, 7, 2, 9' },
      { name: 'val', label: 'Value to delete', kind: 'number', default: '2' },
    ],
    presets: [
      { label: 'Delete the head', values: { values: '4, 7, 2, 9', val: '4' } },
      { label: 'Delete the tail', values: { values: '4, 7, 2, 9', val: '9' } },
      { label: 'Not in the list', values: { values: '4, 7, 2, 9', val: '5' } },
      { label: 'Only node', values: { values: '6', val: '6' } },
      { label: 'Duplicates', values: { values: '3, 5, 5, 1', val: '5' } },
    ],
    maxItems: 7,
    run: (values) => {
      const list = values['values'];
      const val = values['val'];
      if (!Array.isArray(list) || list.length === 0) throw new Error('Enter at least one node value.');
      if (typeof val !== 'number') throw new Error('Enter the value to delete.');
      return traceDelete(list, val);
    },
  },
});

