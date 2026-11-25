import { arr, defineWalkthrough, link, note, ptr, vars } from '../../../lib/walkthrough/helpers';
import type { Entity, Step, Tone } from '../../../lib/walkthrough/types';

/**
 * Drawn like the Singly Linked List reference (`.migration-contract.md` §5.1):
 * one-cell node blocks in fixed slots, one `next-<id>` arrow per node, and a
 * muted `None` block after the last slot. `slow` and `fast` are pointers on
 * the node they hold; `fast` sits on `None` once it jumps off an even list.
 */
const NODE_PITCH = 100;
const VARS_Y = 150;
const NOTE_X = 230;

/** `slow` / `fast` hold a node slot, or `n` for the `None` block. */
interface RunnerState {
  readonly values: readonly number[];
  readonly slow?: number;
  readonly fast?: number;
  /** Which runner just moved (its node is `active`). */
  readonly moved?: 'slow' | 'fast';
  /** Arrows in focus: the node ids whose `next` arrow is highlighted, and their tone. */
  readonly hot?: readonly number[];
  readonly hotTone?: Tone;
  readonly answer?: number;
  readonly note?: string;
  readonly noteTone?: Tone;
  readonly hideVars?: boolean;
}

/** Scene for one moment: the nodes, their arrows, the two runners, and the variables. */
function scene(s: RunnerState): Entity[] {
  const n = s.values.length;
  const nodeId = (k: number): string => (k >= n ? 'none' : `node-${k}`);
  const tones: Record<number, Tone> = {};
  if (s.slow !== undefined && s.slow < n) tones[s.slow] = 'compare';
  if (s.fast !== undefined && s.fast < n) tones[s.fast] = 'compare';
  if (s.moved === 'slow' && s.slow !== undefined && s.slow < n) tones[s.slow] = 'active';
  if (s.moved === 'fast' && s.fast !== undefined && s.fast < n) tones[s.fast] = 'active';
  if (s.answer !== undefined) tones[s.answer] = 'found';

  const entities: Entity[] = s.values.map((v, k) =>
    arr(nodeId(k), k * NODE_PITCH, 0, [v], { tones: { 0: tones[k] ?? 'default' }, showIndex: false, itemKeys: [k] }),
  );
  entities.push(arr('none', n * NODE_PITCH, 0, ['None'], { tones: { 0: 'muted' }, showIndex: false }));
  s.values.forEach((_, k) => {
    const hot = s.hot?.includes(k) ?? false;
    entities.push(link(`next-${k}`, { entity: nodeId(k), side: 'right' }, { entity: nodeId(k + 1), side: 'left' }, { tone: hot ? (s.hotTone ?? 'compare') : 'default' }));
  });
  if (s.slow !== undefined) entities.push(ptr('slow', nodeId(s.slow), 0, 'slow', { tone: 'compare', codeVar: 'slow' }));
  if (s.fast !== undefined) entities.push(ptr('fast', nodeId(s.fast), 0, 'fast', { tone: 'active', codeVar: 'fast' }));

  if (!s.hideVars) {
    const name = (k: number | undefined): string => (k === undefined ? '—' : k >= n ? 'None' : `node ${s.values[k]}`);
    const fastNext = s.fast === undefined ? '—' : s.fast >= n ? '—' : name(s.fast + 1);
    entities.push(
      vars(
        'vals',
        0,
        VARS_Y,
        [
          { name: 'slow', value: name(s.slow), tone: s.slow === undefined ? 'muted' : 'default' },
          { name: 'fast', value: name(s.fast), tone: s.fast === undefined ? 'muted' : 'default' },
          { name: 'fast.next', value: fastNext, tone: s.fast === undefined || s.fast >= n ? 'muted' : 'default' },
        ],
        { label: 'variables', width: 190 },
      ),
    );
  }
  if (s.note) entities.push(note('note', s.hideVars ? 0 : NOTE_X, VARS_Y, s.note, { tone: s.noteTone ?? 'note' }));
  return entities;
}

/** Runs find_middle on any list and records one step per decision (chapter "run", final code). */
function traceMiddle(values: readonly number[]): Step[] {
  const n = values.length;
  const steps: Step[] = [];
  let turns = 0;
  let hops = 0;
  const metrics = (result = '—'): Record<string, string | number> => ({ turns, hops, result });
  const name = (k: number): string => (k >= n ? 'None' : `node ${values[k]}`);
  let slow = 0;
  let fast = 0;

  steps.push({
    chapter: 'run',
    short: 'Start',
    title: `Both runners start at the head of [${values.join(', ')}]`,
    body: `Lines 8–9 put \`slow\` and \`fast\` on the head, node ${values[0]}.`,
    code: { view: 'final', lines: [8, 9] },
    values: { 8: `slow = ${name(0)}`, 9: `fast = ${name(0)}` },
    metrics: metrics(),
    scene: { entities: scene({ values, slow, fast }) },
  });

  for (;;) {
    if (fast >= n) {
      steps.push({
        chapter: 'run',
        short: 'Stop',
        title: 'fast is None: it jumped off the end',
        body: `Line 12: \`fast is not None\` is false, so the loop stops. The list has an even length (${n}), and \`fast\` jumped past the last node.`,
        code: { view: 'final', lines: [12] },
        values: { 12: 'fast is None → stop' },
        metrics: metrics(),
        scene: { entities: scene({ values, slow, fast }) },
      });
      break;
    }
    if (fast + 1 >= n) {
      steps.push({
        chapter: 'run',
        short: 'Stop',
        title: `fast is on the last node: stop`,
        body: `Line 12: \`fast\` is node ${values[fast]}, but \`fast.next\` is \`None\`, so the loop stops. A two-node jump would fall off the list.`,
        code: { view: 'final', lines: [12] },
        values: { 12: 'fast.next is None → stop' },
        metrics: metrics(),
        scene: { entities: scene({ values, slow, fast, hot: [fast], hotTone: 'miss' }) },
      });
      break;
    }
    steps.push({
      chapter: 'run',
      short: 'Loop?',
      title: `fast can jump two nodes from node ${values[fast]}`,
      body: `Line 12: \`fast\` is node ${values[fast]} and \`fast.next\` is node ${values[fast + 1]}, both real nodes, so the loop body runs.`,
      code: { view: 'final', lines: [12] },
      values: { 12: `${name(fast)} and ${name(fast + 1)} → True` },
      metrics: metrics(),
      scene: { entities: scene({ values, slow, fast, hot: [fast] }) },
    });
    turns += 1;
    slow += 1;
    hops += 1;
    steps.push({
      chapter: 'run',
      short: 'slow +1',
      title: `slow steps to node ${values[slow]}`,
      body: `Line 13 only tells the type checker \`slow\` isn’t \`None\` here. Line 14: \`slow = slow.next\`, one node.`,
      code: { view: 'final', lines: [13, 14] },
      values: { 13: 'slow is a node → ok', 14: `slow = ${name(slow)}` },
      metrics: metrics(),
      scene: { entities: scene({ values, slow, fast, moved: 'slow', hot: [slow - 1], hotTone: 'active' }) },
    });
    const from = fast;
    fast += 2;
    hops += 2;
    steps.push({
      chapter: 'run',
      short: 'fast +2',
      title: `fast jumps to ${name(fast)}`,
      body: `Line 15: \`fast = fast.next.next\`, two arrows at once. After ${turns} turn${turns === 1 ? '' : 's'}, \`slow\` is ${turns} node${turns === 1 ? '' : 's'} in and \`fast\` is ${2 * turns}.`,
      code: { view: 'final', lines: [15] },
      values: { 15: `fast = ${name(fast)}` },
      metrics: metrics(),
      scene: { entities: scene({ values, slow, fast, moved: 'fast', hot: [from, from + 1], hotTone: 'active' }) },
    });
  }

  const result = `node ${values[slow]}`;
  steps.push({
    chapter: 'run',
    short: 'Return',
    title: `Return ${result}, the middle`,
    body:
      n % 2 === 0
        ? `Line 18 returns \`slow\`, node ${values[slow]}. With ${n} nodes there are two middles, and \`slow\` lands on the **second** one.`
        : `Line 18 returns \`slow\`, node ${values[slow]}: ${slow} node${slow === 1 ? '' : 's'} on each side of it.`,
    code: { view: 'final', lines: [18] },
    values: { 18: `return ${result}` },
    metrics: metrics(result),
    scene: { entities: scene({ values, slow, fast, answer: slow }) },
  });
  return steps;
}

const VALUES = [10, 20, 30, 40, 50] as const;
const EVEN = [10, 20, 30, 40, 50, 60] as const;
const RUN = traceMiddle(VALUES);
const startMetrics = { turns: 0, hops: 0, result: '—' } as const;
const FINAL_METRICS = RUN.at(-1)?.metrics ?? startMetrics;
/** Scene of run step n (0-based), so build steps show the moment they describe. */
const at = (n: number): Step['scene'] => RUN[n]?.scene ?? { entities: [] };
const find = (short: string): number => RUN.findIndex((s) => s.short === short);
const RUN_START = 10;

export default defineWalkthrough({
  id: 'learn/linked-list/fast-slow-pointers',
  title: 'Fast & Slow Pointers, the middle in one pass',
  summary: 'From the idea to the code: send one pointer two nodes at a time and another one node at a time, and the slow one is at the middle when the fast one runs out.',
  minutes: 6,
  code: {
    lang: 'python',
    source: `class ListNode:
    def __init__(self, val: int, next: "ListNode | None" = None) -> None:
        self.val = val
        self.next = next


def find_middle(head: ListNode | None) -> ListNode | None:
    slow = head
    fast = head

    # Guard both fast and fast.next so fast.next.next never crashes on None
    while fast is not None and fast.next is not None:
        assert slow is not None
        slow = slow.next
        fast = fast.next.next

    # On even lengths, slow lands on the second middle node
    return slow`,
  },
  snapshots: {
    count: `def find_middle(head: ListNode | None) -> ListNode | None:
    n = 0
    curr = head
    while curr is not None:  # Pass 1: count the nodes
        n += 1
        curr = curr.next
    curr = head
    for _ in range(n // 2):  # Pass 2: walk to the middle
        curr = curr.next
    return curr`,
  },
  metrics: [
    { key: 'turns', label: 'Loop turns' },
    { key: 'hops', label: 'Arrows followed' },
    { key: 'result', label: 'Returns' },
  ],
  legend: [
    { tone: 'active', label: 'runner that just moved' },
    { tone: 'compare', label: 'runner’s node / arrow checked' },
    { tone: 'found', label: 'middle' },
    { tone: 'miss', label: 'no room for a jump' },
    { tone: 'muted', label: 'None' },
  ],
  goals: [
    { text: 'See why counting first takes two passes', step: 2 },
    { text: 'Know why the slow runner ends in the middle', step: 3 },
    { text: 'Follow every step and jump', step: RUN_START + find('fast +2') },
    { text: 'Know why fast is checked before fast.next', step: RUN_START + RUN.length + 1 },
  ],
  steps: [
    {
      chapter: 'problem',
      short: 'The brief',
      title: 'Find the middle of 10 → 20 → 30 → 40 → 50',
      body: 'Two runners on a track, one twice as fast: when the fast one crosses the finish, the slow one is halfway. Lines 1–2 are the same `ListNode` as before.\n\nWe get `head` and return the middle node: here node 30. With an even length there are two middles; return the **second**.',
      code: { view: 'signature', lines: [1, 2] },
      metrics: startMetrics,
      scene: { entities: scene({ values: VALUES, hideVars: true, answer: 2, note: 'find_middle(head) → node 30\n[10, 20, 30, 40, 50]' }) },
    },
    {
      chapter: 'idea',
      short: 'Count first',
      title: 'The obvious way: count, then walk half',
      body: 'Lines 4–6 walk the whole list just to count it, then line 8 walks `n // 2` nodes again. That’s about `1.5 n` hops in **two passes**.\n\nA list has no length field, so you can’t jump to the middle; but you can avoid the first pass.',
      code: { view: 'snapshot', id: 'count', lines: [4, 8] },
      metrics: startMetrics,
      scene: { entities: scene({ values: VALUES, hideVars: true, note: 'pass 1: 5 hops to count\npass 2: 2 more hops to node 30\ntwo passes over the list', noteTone: 'miss' }) },
    },
    {
      chapter: 'idea',
      short: 'Two speeds',
      title: 'Run two pointers: one node and two nodes per turn',
      body: 'After `k` turns `slow` has moved `k` nodes and `fast` has moved `2k`. So when `fast` reaches the end, `n` nodes in, `slow` is `n / 2` nodes in: the middle.\n\nOdd lengths stop with `fast` on the last node; even ones stop with `fast` past it, which puts `slow` on the second middle.',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: { entities: scene({ values: VALUES, slow: 2, fast: 4, hideVars: true, answer: 2, note: 'after k turns: slow = k, fast = 2k\nfast at the end (2k ≈ n)\n→ slow ≈ n / 2, the middle' }) },
    },
    {
      chapter: 'build',
      short: 'Node',
      title: 'Lines 3–4: a node and its one arrow',
      body: 'Each node only knows its `next`, so both runners can only move forward, one arrow at a time.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4], lines: [3, 4] },
      metrics: startMetrics,
      changes: ['self.val = val', 'self.next = next'],
      scene: { entities: scene({ values: VALUES, hideVars: true, note: 'head → 10 → 20 → 30 → 40 → 50 → None' }) },
    },
    {
      chapter: 'build',
      short: 'Start',
      title: 'Lines 7–9: both runners on the head',
      body: 'Line 7 takes the head. Lines 8–9 start `slow` and `fast` together, so their gap only grows from zero.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 7, 8, 9], lines: [7, 8, 9] },
      metrics: startMetrics,
      changes: ['slow = head', 'fast = head'],
      scene: at(0),
    },
    {
      chapter: 'build',
      short: 'Guard',
      title: 'Lines 11–12: is there room for a two-node jump?',
      body: 'A jump follows `fast.next` and then its `next`, so both `fast` and `fast.next` must be real nodes. An empty list (`head = None`) never enters the loop and returns `None`.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 7, 8, 9, 11, 12], lines: [11, 12] },
      metrics: startMetrics,
      changes: ['while fast is not None and fast.next is not None'],
      scene: at(1),
    },
    {
      chapter: 'build',
      short: 'Move',
      title: 'Lines 13–15: one step and one jump',
      body: 'Line 13 is only for the type checker. Line 14 moves `slow` one node; line 15 moves `fast` two, by following two arrows.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 7, 8, 9, 11, 12, 13, 14, 15], lines: [13, 14, 15] },
      metrics: startMetrics,
      changes: ['slow = slow.next', 'fast = fast.next.next'],
      scene: at(find('fast +2')),
    },
    {
      chapter: 'build',
      short: 'Return',
      title: 'Lines 17–18: slow is the middle',
      body: 'When the loop stops, line 18 returns `slow`. On an even list it is the second of the two middles.',
      code: { view: 'final', lines: [17, 18] },
      metrics: startMetrics,
      changes: ['return slow'],
      scene: at(RUN.length - 1),
    },
    {
      chapter: 'build',
      short: 'Even list',
      title: 'On an even list, fast jumps off the end',
      body: 'With 6 nodes, three jumps take `fast` from the head to `None`, and `slow` stops on node 40, the second middle. Line 12 checks `fast is not None` first for exactly this case.\n\nThat’s the whole function. Now let’s run it.',
      code: { view: 'final', lines: [12, 18] },
      metrics: startMetrics,
      scene: { entities: scene({ values: EVEN, slow: 3, fast: 6, answer: 3, hideVars: true, note: '6 nodes: fast ends on None\nslow on node 40, the 2nd middle' }) },
    },
    ...RUN,
    {
      chapter: 'why',
      short: 'Recap',
      title: 'One pass, two pointers',
      body: '`fast` reaches the end after about `n / 2` turns, and each turn follows 3 arrows: about `1.5 n` hops, but in **one pass** and **`O(n)` time**. The two pointers are the only extra memory: **`O(1)` space**.\n\nSwitch to **🧪 Try your own** to find the middle of your own list.',
      code: { view: 'final', lines: [12, 14, 15] },
      metrics: FINAL_METRICS,
      scene: { entities: scene({ values: VALUES, slow: 2, fast: 4, answer: 2, hideVars: true, note: 'about n / 2 turns → O(n)\nno count, no second pass\ntwo pointers → O(1) space', noteTone: 'found' }) },
    },
    {
      chapter: 'why',
      short: 'Guard order',
      title: 'Why fast is checked before fast.next',
      body: 'On an even list `fast` ends up as `None`, and `None.next` raises `AttributeError`. Python’s `and` stops at the first false part, so `fast is not None` must come first.\n\nThat is the key decision: guard `fast`, then `fast.next`, so `fast.next.next` is always safe.',
      code: { view: 'final', lines: [12, 15] },
      values: { 12: 'fast first: None stops here', 15: 'safe: both hops exist' },
      metrics: FINAL_METRICS,
      scene: { entities: scene({ values: EVEN, slow: 3, fast: 6, hideVars: true, hot: [5], hotTone: 'miss', note: 'fast = None\nfast.next → AttributeError', noteTone: 'miss' }) },
    },
  ],
  trace: {
    title: 'Find the middle of your own list',
    inputs: [{ name: 'values', label: 'Node values, head first', kind: 'numbers', default: '10, 20, 30, 40, 50' }],
    presets: [
      { label: 'Even (6 nodes)', values: { values: '10, 20, 30, 40, 50, 60' } },
      { label: 'One node', values: { values: '99' } },
      { label: 'Two nodes', values: { values: '7, 14' } },
      { label: 'Seven nodes', values: { values: '7, 14, 21, 28, 35, 42, 49' } },
    ],
    maxItems: 7,
    run: (values) => {
      const list = values['values'];
      if (!Array.isArray(list) || list.length === 0) throw new Error('Enter at least one node value.');
      return traceMiddle(list);
    },
  },
});
