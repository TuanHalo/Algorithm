import { arr, defineWalkthrough, link, map, note, ptr, vars } from '../../../lib/walkthrough/helpers';
import type { Anchor, Entity, Step, Tone } from '../../../lib/walkthrough/types';

/**
 * Drawn like the Singly Linked List reference (`.migration-contract.md` §5.1):
 * one-cell node blocks in fixed slots and one `next-<id>` arrow per node.
 * The tail's arrow back into the list arcs over the row from top face to top
 * face (a tail that points at itself hoops over its front corner). With a
 * cycle there is no `None`, so its block is only drawn when `pos` is −1.
 */
const NODE_PITCH = 100;
const VARS_Y = 150;
const NOTE_X = 230;

interface CycleState {
  readonly values: readonly number[];
  /** Index the tail points back to, or −1 for no cycle. */
  readonly pos: number;
  /** Node ids; null means the runner is on `None`. */
  readonly slow?: number | null;
  readonly fast?: number | null;
  readonly finder?: number;
  /** Which runner just moved (its node is `active`). */
  readonly moved?: 'slow' | 'fast' | 'finder';
  /** Phase 2: fast is no longer used. */
  readonly phase2?: boolean;
  readonly hot?: readonly number[];
  readonly hotTone?: Tone;
  /** A node to mark as found (meeting point or cycle entry). */
  readonly found?: number;
  readonly note?: string;
  readonly noteTone?: Tone;
  readonly hideVars?: boolean;
}

const nextOf = (values: readonly number[], pos: number, id: number): number | null => (id + 1 < values.length ? id + 1 : pos >= 0 ? pos : null);

/** Scene for one moment: the nodes, their arrows (with the back edge), the runners, and the variables. */
function scene(s: CycleState): Entity[] {
  const n = s.values.length;
  const nodeId = (k: number | null): string => (k === null ? 'none' : `node-${k}`);
  const tones: Record<number, Tone> = {};
  if (typeof s.slow === 'number') tones[s.slow] = 'compare';
  if (typeof s.fast === 'number' && !s.phase2) tones[s.fast] = 'compare';
  if (s.finder !== undefined) tones[s.finder] = 'compare';
  const mover = s.moved === 'slow' ? s.slow : s.moved === 'fast' ? s.fast : s.moved === 'finder' ? s.finder : undefined;
  if (typeof mover === 'number') tones[mover] = 'active';
  if (s.found !== undefined) tones[s.found] = 'found';

  const entities: Entity[] = s.values.map((v, k) => arr(nodeId(k), k * NODE_PITCH, 0, [v], { tones: { 0: tones[k] ?? 'default' }, showIndex: false, itemKeys: [k] }));
  if (s.pos < 0) entities.push(arr('none', n * NODE_PITCH, 0, ['None'], { tones: { 0: 'muted' }, showIndex: false }));
  s.values.forEach((_, k) => {
    const to = nextOf(s.values, s.pos, k);
    const hot = s.hot?.includes(k) ?? false;
    // Forward arrows go right face → left face, a back edge arcs top → top, and a
    // self-loop hoops over the block's front corner (right face → bottom face).
    let from: Anchor = { entity: nodeId(k), side: 'right' };
    let target: Anchor = { entity: nodeId(to), side: to === k ? 'bottom' : 'left' };
    if (to !== null && to < k) {
      from = { entity: nodeId(k), side: 'top' };
      target = { entity: nodeId(to), side: 'top' };
    }
    // A self-loop is a tiny hoop over its own block, so it says what it is.
    const label = to === k ? 'itself' : undefined;
    entities.push(link(`next-${k}`, from, target, { tone: hot ? (s.hotTone ?? 'compare') : 'default', label }));
  });

  if (s.slow !== undefined) entities.push(ptr('slow', nodeId(s.slow), 0, 'slow', { tone: 'compare', codeVar: 'slow' }));
  if (s.fast !== undefined) entities.push(ptr('fast', nodeId(s.fast), 0, 'fast', { tone: s.phase2 ? 'muted' : 'active', codeVar: 'fast' }));
  if (s.finder !== undefined) entities.push(ptr('finder', nodeId(s.finder), 0, 'finder', { side: 'top', tone: 'active', codeVar: 'finder' }));

  if (!s.hideVars) {
    const name = (k: number | null | undefined): string => (k === undefined ? '—' : k === null ? 'None' : `node ${s.values[k]}`);
    entities.push(
      vars(
        'vals',
        0,
        VARS_Y,
        [
          { name: 'slow', value: name(s.slow), tone: s.slow === undefined ? 'muted' : 'default' },
          { name: 'fast', value: name(s.fast), tone: s.fast === undefined || s.phase2 ? 'muted' : 'default' },
          { name: 'finder', value: name(s.finder), tone: s.finder === undefined ? 'muted' : 'default' },
        ],
        { label: 'variables', width: 190 },
      ),
    );
  }
  if (s.note) entities.push(note('note', s.hideVars ? 0 : NOTE_X, VARS_Y, s.note, { tone: s.noteTone ?? 'note' }));
  return entities;
}

/** Runs detect_cycle on any list and records one step per decision (chapter "run", final code). */
function traceCycle(values: readonly number[], pos: number): Step[] {
  const n = values.length;
  const steps: Step[] = [];
  let turns = 0;
  let walks = 0;
  const metrics = (result = '—'): Record<string, string | number> => ({ turns, walks, result });
  const nx = (k: number | null): number | null => (k === null ? null : nextOf(values, pos, k));
  const name = (k: number | null): string => (k === null ? 'None' : `node ${values[k]}`);
  const base = { values, pos } as const;
  let slow: number | null = 0;
  let fast: number | null = 0;

  steps.push({
    chapter: 'run',
    short: 'Start',
    title: `Both runners start at node ${values[0]}`,
    body: `Line 8: \`slow = fast = head\`, node ${values[0]}. Phase 1 looks for a meeting inside a loop.`,
    code: { view: 'final', lines: [8] },
    values: { 8: `slow = fast = ${name(0)}` },
    metrics: metrics(),
    scene: { entities: scene({ ...base, slow, fast }) },
  });

  let met = false;
  for (;;) {
    if (fast === null) {
      steps.push({
        chapter: 'run',
        short: 'Stop',
        title: 'fast fell off the end: no cycle',
        body: 'Line 10: `fast is not None` is false. A list with a loop has no end, so reaching `None` proves there is no cycle.',
        code: { view: 'final', lines: [10] },
        values: { 10: 'fast is None → stop' },
        metrics: metrics(),
        scene: { entities: scene({ ...base, slow, fast }) },
      });
      break;
    }
    const f1 = nx(fast);
    if (f1 === null) {
      steps.push({
        chapter: 'run',
        short: 'Stop',
        title: `fast is on the tail: no cycle`,
        body: `Line 10: \`fast.next\` is \`None\`, so the loop stops. Node ${values[fast]} is a real end, so there is no cycle.`,
        code: { view: 'final', lines: [10] },
        values: { 10: 'fast.next is None → stop' },
        metrics: metrics(),
        scene: { entities: scene({ ...base, slow, fast, hot: [fast], hotTone: 'miss' }) },
      });
      break;
    }
    steps.push({
      chapter: 'run',
      short: 'Loop?',
      title: `fast can jump from node ${values[fast]}`,
      body: `Line 10: \`fast\` and \`fast.next\` (${name(f1)}) are both nodes, so the turn goes ahead.`,
      code: { view: 'final', lines: [10] },
      values: { 10: `${name(fast)} and ${name(f1)} → True` },
      metrics: metrics(),
      scene: { entities: scene({ ...base, slow, fast, hot: [fast] }) },
    });
    turns += 1;
    const slowFrom: number = slow ?? 0;
    slow = nx(slow);
    steps.push({
      chapter: 'run',
      short: 'slow +1',
      title: `slow steps to ${name(slow)}`,
      body: `Line 11 only reassures the type checker. Line 12: \`slow = slow.next\`, one node.`,
      code: { view: 'final', lines: [11, 12] },
      values: { 12: `slow = ${name(slow)}` },
      metrics: metrics(),
      scene: { entities: scene({ ...base, slow, fast, moved: 'slow', hot: [slowFrom], hotTone: 'active' }) },
    });
    const fastFrom: number = fast;
    fast = nx(f1);
    steps.push({
      chapter: 'run',
      short: 'fast +2',
      title: `fast jumps to ${name(fast)}`,
      body: `Line 13: \`fast = fast.next.next\`, two arrows${f1 < fastFrom || (fast !== null && fast < f1) ? ', around the loop' : ''}.`,
      code: { view: 'final', lines: [13] },
      values: { 13: `fast = ${name(fast)}` },
      metrics: metrics(),
      scene: { entities: scene({ ...base, slow, fast, moved: 'fast', hot: [fastFrom, f1], hotTone: 'active' }) },
    });
    if (slow !== null && slow === fast) {
      steps.push({
        chapter: 'run',
        short: 'Meet!',
        title: `They meet at node ${values[slow]}: there is a cycle`,
        body: `Line 14: \`slow == fast\` is true after ${turns} turn${turns === 1 ? '' : 's'}. Only a loop lets the faster runner come round and land on the slower one.`,
        code: { view: 'final', lines: [14] },
        values: { 14: 'slow == fast → True' },
        metrics: metrics(),
        scene: { entities: scene({ ...base, slow, fast, found: slow }) },
      });
      met = true;
      break;
    }
    steps.push({
      chapter: 'run',
      short: 'Meet?',
      title: `${name(slow)} and ${name(fast)}: not yet`,
      body: `Line 14: \`slow == fast\` is false, so phase 1 goes on.`,
      code: { view: 'final', lines: [14] },
      values: { 14: `${name(slow)} == ${name(fast)} → False` },
      metrics: metrics(),
      scene: { entities: scene({ ...base, slow, fast }) },
    });
  }

  if (!met) {
    steps.push({
      chapter: 'run',
      short: 'Return',
      title: 'Return None: no cycle',
      body: 'Line 23 returns `None`. Phase 2 never ran.',
      code: { view: 'final', lines: [23] },
      values: { 23: 'return None' },
      metrics: metrics('None'),
      scene: { entities: scene({ ...base, slow, fast }) },
    });
    return steps;
  }

  const meet = slow ?? 0;
  let s2: number = meet;
  let finder = 0;
  steps.push({
    chapter: 'run',
    short: 'finder',
    title: `finder starts at the head, slow stays at node ${values[meet]}`,
    body: `Line 16: \`finder = head\`, node ${values[0]}. Both now walk one node at a time; the comment on line 15 says why they meet at the entry.`,
    code: { view: 'final', lines: [15, 16] },
    values: { 16: `finder = ${name(0)}` },
    metrics: metrics(),
    scene: { entities: scene({ ...base, slow: s2, fast, finder, phase2: true }) },
  });
  for (;;) {
    if (finder === s2) {
      steps.push({
        chapter: 'run',
        short: 'Same?',
        title: `finder == slow at node ${values[finder]}`,
        body: `Line 17: \`finder != slow\` is false: both are on node ${values[finder]}, so the loop stops.`,
        code: { view: 'final', lines: [17] },
        values: { 17: 'finder != slow → False' },
        metrics: metrics(),
        scene: { entities: scene({ ...base, slow: s2, fast, finder, phase2: true, found: finder }) },
      });
      break;
    }
    steps.push({
      chapter: 'run',
      short: 'Same?',
      title: `finder at node ${values[finder]}, slow at node ${values[s2]}`,
      body: `Line 17: \`finder != slow\` is true, so both take another step.`,
      code: { view: 'final', lines: [17] },
      values: { 17: `${name(finder)} != ${name(s2)} → True` },
      metrics: metrics(),
      scene: { entities: scene({ ...base, slow: s2, fast, finder, phase2: true }) },
    });
    walks += 1;
    const ff: number = finder;
    finder = nx(finder) ?? 0;
    steps.push({
      chapter: 'run',
      short: 'finder +1',
      title: `finder steps to node ${values[finder]}`,
      body: 'Line 18 is for the type checker. Line 19: `finder = finder.next`.',
      code: { view: 'final', lines: [18, 19] },
      values: { 19: `finder = ${name(finder)}` },
      metrics: metrics(),
      scene: { entities: scene({ ...base, slow: s2, fast, finder, phase2: true, moved: 'finder', hot: [ff], hotTone: 'active' }) },
    });
    const sf: number = s2;
    s2 = nx(s2) ?? 0;
    steps.push({
      chapter: 'run',
      short: 'slow +1',
      title: `slow steps to node ${values[s2]}`,
      body: 'Line 20: `slow = slow.next`, the same speed as `finder` now.',
      code: { view: 'final', lines: [20] },
      values: { 20: `slow = ${name(s2)}` },
      metrics: metrics(),
      scene: { entities: scene({ ...base, slow: s2, fast, finder, phase2: true, moved: 'slow', hot: [sf], hotTone: 'active' }) },
    });
  }
  const result = `node ${values[finder]}`;
  steps.push({
    chapter: 'run',
    short: 'Return',
    title: `Return node ${values[finder]}, where the cycle starts`,
    body: `Line 21 returns \`finder\`: the tail’s arrow points back to node ${values[finder]}, so that is the entry.`,
    code: { view: 'final', lines: [21] },
    values: { 21: `return ${result}` },
    metrics: metrics(result),
    scene: { entities: scene({ ...base, slow: s2, fast, finder, phase2: true, found: finder }) },
  });
  return steps;
}

const VALUES = [3, 2, 0, -4, 7] as const;
const POS = 1;
const RUN = traceCycle(VALUES, POS);
const startMetrics = { turns: 0, walks: 0, result: '—' } as const;
const FINAL_METRICS = RUN.at(-1)?.metrics ?? startMetrics;
/** Scene of run step n (0-based), so build steps show the moment they describe. */
const at = (n: number): Step['scene'] => RUN[n]?.scene ?? { entities: [] };
const find = (short: string): number => RUN.findIndex((s) => s.short === short);
const RUN_START = 12;
const base = { values: VALUES, pos: POS } as const;

export default defineWalkthrough({
  id: 'learn/linked-list/cycle-detection',
  title: 'Floyd’s Cycle Detection, a tortoise and a hare',
  summary: 'From the idea to the code: two runners at different speeds prove a list loops when they meet, and a second walk from the head finds where the loop starts, with no extra memory.',
  minutes: 9,
  code: {
    lang: 'python',
    source: `class ListNode:
    def __init__(self, val: int, next: "ListNode | None" = None) -> None:
        self.val = val
        self.next = next


def detect_cycle(head: ListNode | None) -> ListNode | None:
    slow = fast = head

    while fast is not None and fast.next is not None:
        assert slow is not None
        slow = slow.next
        fast = fast.next.next
        if slow == fast:
            # Distance from head to entry equals distance from meeting point to entry
            finder = head
            while finder != slow:
                assert finder is not None and slow is not None
                finder = finder.next
                slow = slow.next
            return finder

    return None`,
  },
  snapshots: {
    seen: `def detect_cycle(head: ListNode | None) -> ListNode | None:
    seen = set()
    curr = head
    while curr is not None:
        if curr in seen:  # The first node seen twice is the entry
            return curr
        seen.add(curr)  # One entry per node: O(n) memory
        curr = curr.next
    return None`,
  },
  metrics: [
    { key: 'turns', label: 'Phase 1 turns' },
    { key: 'walks', label: 'Phase 2 steps' },
    { key: 'result', label: 'Returns' },
  ],
  legend: [
    { tone: 'active', label: 'runner that just moved' },
    { tone: 'compare', label: 'runner’s node / arrow checked' },
    { tone: 'found', label: 'meeting point / cycle entry' },
    { tone: 'miss', label: 'end of the list' },
    { tone: 'muted', label: 'None / fast in phase 2' },
  ],
  goals: [
    { text: 'See why a visited set costs O(n) memory', step: 2 },
    { text: 'Know why the hare must catch the tortoise', step: 3 },
    { text: 'Derive why a walk from the head finds the entry', step: 4 },
    { text: 'Watch the runners meet, then find the entry', step: RUN_START + find('Meet!') },
    { text: 'Know why the check comes after the moves', step: RUN_START + RUN.length + 1 },
  ],
  steps: [
    {
      chapter: 'problem',
      short: 'The brief',
      title: 'Does 3 → 2 → 0 → −4 → 7 loop, and where?',
      body: 'Like a tortoise and a hare on a track with a loop: the hare can never get ahead for good, it laps the tortoise. Lines 1–2 are the same `ListNode` as before.\n\nGiven `head`, return the node where the loop starts (here node 2, since node 7 points back to it), or `None` if there is no loop. Use only `O(1)` extra memory.',
      code: { view: 'signature', lines: [1, 2] },
      metrics: startMetrics,
      scene: { entities: scene({ ...base, hideVars: true, found: 1, note: 'tail 7 → back to node 2\ndetect_cycle(head) → node 2' }) },
    },
    {
      chapter: 'idea',
      short: 'Seen set',
      title: 'The obvious way: remember every node',
      body: 'Line 5 asks whether we’ve been on this node before; line 7 remembers it. The first repeat is the entry.\n\nIt works, but `seen` grows to `n` nodes: **`O(n)` memory**.',
      code: { view: 'snapshot', id: 'seen', lines: [5, 7] },
      metrics: startMetrics,
      scene: {
        entities: [
          ...scene({ ...base, hideVars: true, found: 1 }),
          map('seen', 0, VARS_Y, 'seen', [3, 2, 0, -4, 7].map((v) => ({ key: `node ${v}`, value: 'seen' })), { codeVar: 'seen', width: 160 }),
          note('note', 230, VARS_Y, 'node 2 comes round again\nbut seen holds all n nodes\n→ O(n) memory', { tone: 'miss' }),
        ],
      },
    },
    {
      chapter: 'idea',
      short: 'Two speeds',
      title: 'Phase 1: a fast runner laps a slow one',
      body: 'Move `slow` one node and `fast` two per turn. With no loop, `fast` hits `None`. With a loop, once both are inside it `fast` gains **exactly one node per turn**, so the gap shrinks 3, 2, 1, 0: it can’t jump over `slow`, it lands on it.',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: { entities: scene({ ...base, slow: 4, fast: 4, found: 4, hideVars: true, note: 'in the loop, fast gains 1 per turn\ngap 3 → 2 → 1 → 0: they meet\nno loop: fast reaches None' }) },
    },
    {
      chapter: 'idea',
      short: 'Why entry',
      title: 'Phase 2: why a walk from the head finds the entry',
      body: 'Say the entry is `a` nodes from the head, they meet `b` nodes past it, and the loop is `L` long. `slow` walked `a + b`; `fast` walked twice that, and the extra `a + b` is whole laps: `a + b = k × L`.\n\nSo `a = k × L − b`: from the meeting point, `a` more steps go round to the entry. A `finder` from the head gets there in the same `a` steps.',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: { entities: scene({ ...base, slow: 4, finder: 0, found: 1, hideVars: true, note: 'a = 1, b = 3, L = 4: a + b = 1 × L\nslow: 1 step from 7 → node 2\nfinder: 1 step from 3 → node 2' }) },
    },
    {
      chapter: 'build',
      short: 'Node',
      title: 'Lines 3–4: one arrow per node',
      body: 'A loop is just a `next` arrow that points back to an earlier node. Nothing in the node says so; we have to find out by walking.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4], lines: [3, 4] },
      metrics: startMetrics,
      changes: ['self.val = val', 'self.next = next'],
      scene: { entities: scene({ ...base, hideVars: true, note: '3 → 2 → 0 → −4 → 7 → back to 2' }) },
    },
    {
      chapter: 'build',
      short: 'Start',
      title: 'Lines 7–8: both runners on the head',
      body: 'Line 8 starts `slow` and `fast` together. An empty list (`head = None`) skips the loop below and returns `None`.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 7, 8], lines: [7, 8] },
      metrics: startMetrics,
      changes: ['slow = fast = head'],
      scene: at(0),
    },
    {
      chapter: 'build',
      short: 'Guard',
      title: 'Lines 10–12: a turn starts with slow’s step',
      body: 'Line 10 makes sure a two-node jump is possible; if not, the list has an end and there is no cycle. Line 12 moves `slow` one node (line 11 is for the type checker).',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 7, 8, 10, 11, 12], lines: [10, 11, 12] },
      metrics: startMetrics,
      changes: ['while fast is not None and fast.next is not None', 'slow = slow.next'],
      scene: at(find('slow +1')),
    },
    {
      chapter: 'build',
      short: 'Meet?',
      title: 'Lines 13–14: fast jumps, then check for a meeting',
      body: 'Line 13 moves `fast` two nodes. Line 14 compares the nodes themselves (`==` on nodes is identity here), not their values.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 7, 8, 10, 11, 12, 13, 14], lines: [13, 14] },
      metrics: startMetrics,
      changes: ['fast = fast.next.next', 'if slow == fast'],
      scene: at(find('Meet!')),
    },
    {
      chapter: 'build',
      short: 'Finder',
      title: 'Lines 15–17: send a finder from the head',
      body: 'Line 15 records the distance argument. Line 16 starts `finder` at the head, and line 17 walks until it and `slow` are on the same node.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 7, 8, 10, 11, 12, 13, 14, 15, 16, 17], lines: [15, 16, 17] },
      metrics: startMetrics,
      changes: ['finder = head', 'while finder != slow'],
      scene: at(find('finder')),
    },
    {
      chapter: 'build',
      short: 'Same speed',
      title: 'Lines 18–20: both walk one node at a time',
      body: 'Line 19 moves `finder`, line 20 moves `slow`: the same speed now, so they reach the entry together.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 7, 8, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20], lines: [18, 19, 20] },
      metrics: startMetrics,
      changes: ['finder = finder.next', 'slow = slow.next'],
      scene: at(find('finder +1')),
    },
    {
      chapter: 'build',
      short: 'Return',
      title: 'Lines 21 and 23: the entry, or None',
      body: 'Line 21 returns the entry. Line 23 runs only when the loop on line 10 ended, meaning `fast` found the end of the list.\n\nThat’s the whole function. Now let’s run it.',
      code: { view: 'final', lines: [21, 23] },
      metrics: startMetrics,
      changes: ['return finder', 'return None'],
      scene: at(RUN.length - 1),
    },
    ...RUN,
    {
      chapter: 'why',
      short: 'Recap',
      title: 'Two linear phases, three pointers',
      body: 'Phase 1 ends within one lap of the loop once `slow` enters it, and phase 2 walks `a` more steps: **`O(n)` time**. `slow`, `fast` and `finder` are all the extra memory: **`O(1)` space**, against the `O(n)` `seen` set.\n\nSwitch to **🧪 Try your own**: set the cycle position to −1 for a list with no loop.',
      code: { view: 'final', lines: [10, 17] },
      metrics: FINAL_METRICS,
      scene: { entities: scene({ ...base, hideVars: true, found: 1, note: 'phase 1: at most n turns\nphase 2: a steps → O(n) time\n3 pointers → O(1) space', noteTone: 'found' }) },
    },
    {
      chapter: 'why',
      short: 'Check after',
      title: 'Why line 14 comes after the moves',
      body: 'Both runners start on the head, so `slow == fast` is true before anyone moves. Check first and every list, loop or not, looks like a cycle.\n\nThat is the key decision: move both runners, then compare.',
      code: { view: 'final', lines: [12, 13, 14] },
      values: { 12: 'first: move slow', 13: 'and fast', 14: 'then: compare' },
      metrics: FINAL_METRICS,
      scene: { entities: scene({ values: [1, 2, 3], pos: -1, slow: 0, fast: 0, found: 0, hideVars: true, note: 'check before moving:\nslow == fast on the head\n→ [1, 2, 3] “has a cycle”', noteTone: 'miss' }) },
    },
  ],
  trace: {
    title: 'Look for a cycle in your own list',
    inputs: [
      { name: 'values', label: 'Node values, head first', kind: 'numbers', default: '3, 2, 0, -4, 7' },
      { name: 'pos', label: 'Tail points back to index (−1 = no cycle)', kind: 'number', default: '1' },
    ],
    presets: [
      { label: 'Cycle at the head', values: { values: '10, 20, 30, 40', pos: '0' } },
      { label: 'Tail points to itself', values: { values: '5, 9, 12', pos: '2' } },
      { label: 'No cycle', values: { values: '1, 2, 3, 4, 5', pos: '-1' } },
      { label: 'One node, no cycle', values: { values: '8', pos: '-1' } },
    ],
    maxItems: 7,
    run: (values) => {
      const list = values['values'];
      const pos = values['pos'];
      if (!Array.isArray(list) || list.length === 0) throw new Error('Enter at least one node value.');
      if (typeof pos !== 'number' || pos < -1 || pos >= list.length) throw new Error(`The cycle position must be −1 (no cycle) or an index from 0 to ${list.length - 1}.`);
      return traceCycle(list, pos);
    },
  },
});
