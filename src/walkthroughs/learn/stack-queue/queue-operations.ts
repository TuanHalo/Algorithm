import { arr, defineWalkthrough, link, note, ptr, vars } from '../../../lib/walkthrough/helpers';
import { PITCH } from '../../../lib/walkthrough/layout';
import type { Entity, ScalarValue, Step, Tone, VarRow } from '../../../lib/walkthrough/types';

const VARS_Y = 150;
const NOTE_X = 220;

/** One value in the queue. `slot` is its arrival number: it keeps that spot on the floor until it leaves. */
interface Item {
  readonly slot: number;
  readonly value: number;
}

/**
 * What the scene shows about the front: `enqueue` just joined the back, `check` line 13 / 18
 * found items, `empty` the same check found none, `read` front's answer, `served` after line 15.
 */
type Phase = 'create' | 'enqueue' | 'check' | 'empty' | 'read' | 'served';

interface QueueState {
  readonly items: readonly Item[];
  /** How many values have left so far: the floor slot where the front now stands. */
  readonly served: number;
  readonly phase?: Phase;
  /** Argument of the running `enqueue`. */
  readonly value?: number;
  /** What the running call returned (`None` included). */
  readonly returns?: ScalarValue;
  readonly note?: string;
  readonly noteTone?: Tone;
}

/**
 * Scene for one moment: `_items` front → back (left → right), `front` / `back` pins, and the variables.
 * The array starts at the front's floor slot, so a dequeue removes one block and the rest stay put.
 */
function scene(s: QueueState): Entity[] {
  const { items, phase } = s;
  const x = s.served * PITCH;
  const back = items.length - 1;
  const entities: Entity[] = [];
  if (items.length === 0) {
    entities.push(arr('items', x, 0, ['—'], { label: '_items', tones: { 0: phase === 'empty' ? 'miss' : 'muted' }, showIndex: false, itemKeys: ['empty'], codeVar: '_items' }));
  } else {
    const tones: Record<number, Tone> = {};
    items.forEach((_, k) => (tones[k] = 'done'));
    if (phase === 'enqueue') tones[back] = 'active';
    if (phase === 'check') tones[0] = 'compare';
    if (phase === 'read') tones[0] = 'found';
    entities.push(arr('items', x, 0, items.map((it) => it.value), { label: '_items', tones, itemKeys: items.map((it) => it.slot), codeVar: '_items' }));
    const frontTone: Tone = phase === 'check' ? 'compare' : phase === 'read' ? 'found' : 'done';
    entities.push(ptr('front', 'items', 0, 'front', { side: 'top', tone: frontTone }));
    entities.push(ptr('back', 'items', back, 'back', { side: 'bottom', tone: phase === 'enqueue' ? 'active' : 'done' }));
  }
  const rows: VarRow[] = [
    { name: 'value', value: s.value ?? '—', tone: s.value === undefined ? 'muted' : 'default' },
    { name: 'len(_items)', value: items.length, tone: phase === 'empty' ? 'miss' : 'default' },
    { name: 'returns', value: s.returns ?? '—', tone: s.returns === undefined ? 'muted' : s.returns === 'None' ? 'miss' : 'found' },
  ];
  entities.push(vars('vals', 0, VARS_Y, rows, { label: 'variables', width: 180 }));
  if (s.note) entities.push(note('note', NOTE_X, VARS_Y, s.note, { tone: s.noteTone ?? 'note' }));
  return entities;
}

type Op = { readonly kind: 'enqueue'; readonly value: number } | { readonly kind: 'dequeue' } | { readonly kind: 'front' };

/** Trace input: a number above 0 enqueues it, 0 dequeues, −1 reads the front. */
function parseOps(codes: readonly number[]): Op[] {
  return codes.map((c) => {
    if (!Number.isInteger(c) || c < -1) throw new Error('Use a whole number above 0 to enqueue it, 0 to dequeue, or -1 to read the front.');
    if (c === 0) return { kind: 'dequeue' };
    if (c === -1) return { kind: 'front' };
    return { kind: 'enqueue', value: c };
  });
}

const show = (items: readonly Item[]): string => `[${items.map((it) => it.value).join(', ')}]`;

/** Creates a Queue and runs every operation, one step per decision (chapter "run", final code). */
function traceQueue(ops: readonly Op[]): Step[] {
  const steps: Step[] = [];
  let items: Item[] = [];
  let arrived = 0;
  let served = 0;
  let last: ScalarValue = '—';
  const metrics = (): Record<string, ScalarValue> => ({ enqueues: arrived, dequeues: served, result: last });

  steps.push({
    chapter: 'run',
    short: 'Create',
    title: 'Queue(): an empty deque',
    body: 'Lines 5–7 start `_items` as an empty `deque`. Values will join on the right (the back) and leave from the left (the front).',
    code: { view: 'final', lines: [5, 7] },
    values: { 7: '_items = deque([])' },
    metrics: metrics(),
    scene: { entities: scene({ items, served, phase: 'create' }) },
  });

  for (const op of ops) {
    if (op.kind === 'enqueue') {
      items = [...items, { slot: arrived, value: op.value }];
      arrived += 1;
      steps.push({
        chapter: 'run',
        short: `enqueue(${op.value})`.slice(0, 14),
        title: `enqueue(${op.value}): ${op.value} joins the back`,
        body: `Line 10 appends ${op.value} on the right. ${items.length === 1 ? 'It is the only value, so it is also the front.' : `It waits behind the ${items.length - 1} value${items.length === 2 ? '' : 's'} already in line.`} The queue is now ${show(items)}.`,
        code: { view: 'final', lines: [9, 10] },
        values: { 9: `value = ${op.value}`, 10: `_items = deque(${show(items)})` },
        metrics: metrics(),
        scene: { entities: scene({ items, served, phase: 'enqueue', value: op.value }) },
      });
      continue;
    }

    const name = op.kind;
    const guard = name === 'dequeue' ? 13 : 18;
    const def = name === 'dequeue' ? 12 : 17;
    const empty = items.length === 0;
    steps.push({
      chapter: 'run',
      short: `${name}()?`,
      title: empty ? `${name}(): the queue is empty` : `${name}(): is anyone waiting?`,
      body: empty
        ? `Line ${guard}: \`not _items\` is true, the deque is empty. Without this check, \`${name === 'dequeue' ? '_items.popleft()' : '_items[0]'}\` would raise an \`IndexError\`.`
        : `Line ${guard}: \`not _items\` is false: ${items.length} value${items.length === 1 ? ' is' : 's are'} waiting, and the oldest is \`_items[0] = ${items[0]?.value}\`.`,
      code: { view: 'final', lines: [def, guard] },
      values: { [guard]: `not deque(${show(items)}) → ${empty ? 'True' : 'False'}` },
      metrics: metrics(),
      scene: { entities: scene({ items, served, phase: empty ? 'empty' : 'check' }) },
    });

    if (empty) {
      last = 'None';
      steps.push({
        chapter: 'run',
        short: 'None',
        title: `${name}() returns None`,
        body: `Line ${guard + 1} returns \`None\`, so the caller learns nobody was waiting and the program keeps running.`,
        code: { view: 'final', lines: [guard + 1] },
        values: { [guard + 1]: 'return None' },
        metrics: metrics(),
        scene: { entities: scene({ items, served, phase: 'empty', returns: 'None' }) },
      });
      continue;
    }

    const frontValue = items[0]?.value ?? 0;
    last = frontValue;
    if (name === 'front') {
      steps.push({
        chapter: 'run',
        short: `front → ${frontValue}`,
        title: `front() returns ${frontValue} and leaves it in line`,
        body: `Line 20 reads \`_items[0] = ${frontValue}\`, the oldest value. It doesn’t remove it: the queue is still ${show(items)}.`,
        code: { view: 'final', lines: [20] },
        values: { 20: `return ${frontValue}` },
        metrics: metrics(),
        scene: { entities: scene({ items, served, phase: 'read', returns: frontValue }) },
      });
      continue;
    }
    served += 1;
    items = items.slice(1);
    steps.push({
      chapter: 'run',
      short: `serve ${frontValue}`,
      title: `dequeue() serves ${frontValue}, the oldest value`,
      body: `Line 15: \`_items.popleft()\` removes the leftmost value, ${frontValue}, and returns it. ${items.length === 0 ? 'The queue is empty again.' : `The others don’t move; ${items[0]?.value} is the new front.`}`,
      code: { view: 'final', lines: [15] },
      values: { 15: `popleft() → ${frontValue}, _items = deque(${show(items)})` },
      metrics: metrics(),
      scene: { entities: scene({ items, served, phase: 'served', returns: frontValue }) },
    });
  }
  return steps;
}

const OPS: readonly Op[] = [
  { kind: 'enqueue', value: 10 },
  { kind: 'enqueue', value: 20 },
  { kind: 'front' },
  { kind: 'enqueue', value: 30 },
  { kind: 'dequeue' },
  { kind: 'dequeue' },
  { kind: 'dequeue' },
  { kind: 'dequeue' },
];
const RUN = traceQueue(OPS);
const startMetrics = { enqueues: 0, dequeues: 0, result: '—' } as const;
const FINAL_METRICS = RUN.at(-1)?.metrics ?? startMetrics;
const BUILD_END = 9;
const at = (n: number): Step['scene'] => RUN[n]?.scene ?? { entities: [] };
const find = (short: string): number => RUN.findIndex((s) => s.short === short);
const LINE: readonly Item[] = [
  { slot: 0, value: 10 },
  { slot: 1, value: 20 },
  { slot: 2, value: 30 },
];

export default defineWalkthrough({
  id: 'learn/stack-queue/queue-operations',
  title: 'Queue, first in first out',
  summary: 'From the idea to the code: a queue on collections.deque, joining at the back and serving from the front, with both ends O(1).',
  minutes: 5,
  code: {
    lang: 'python',
    source: `from collections import deque


class Queue:
    def __init__(self) -> None:
        # deque links blocks of slots, so popleft() never shifts items
        self._items: deque[int] = deque()

    def enqueue(self, value: int) -> None:
        self._items.append(value)  # Join at the back

    def dequeue(self) -> int | None:
        if not self._items:
            return None  # Empty: nobody to serve
        return self._items.popleft()  # Serve the oldest first

    def front(self) -> int | None:
        if not self._items:
            return None
        return self._items[0]`,
  },
  snapshots: {
    brute: `class Queue:
    def __init__(self) -> None:
        self._items: list[int] = []

    def enqueue(self, value: int) -> None:
        self._items.append(value)

    def dequeue(self) -> int:
        return self._items.pop(0)  # Every other item shifts left`,
  },
  metrics: [
    { key: 'enqueues', label: 'Enqueues' },
    { key: 'dequeues', label: 'Dequeues' },
    { key: 'result', label: 'Last return' },
  ],
  legend: [
    { tone: 'active', label: 'just joined' },
    { tone: 'compare', label: 'front being checked' },
    { tone: 'done', label: 'waiting in line' },
    { tone: 'found', label: 'returned' },
    { tone: 'miss', label: 'empty / costly move' },
    { tone: 'muted', label: 'nothing here' },
  ],
  goals: [
    { text: 'See why list.pop(0) is slow', step: 2 },
    { text: 'Serve from the front of a deque in O(1)', step: 3 },
    { text: 'Follow every enqueue, front and dequeue', step: BUILD_END + 1 },
    { text: 'Know why the queue is a deque, not a list', step: BUILD_END + RUN.length + 2 },
  ],
  steps: [
    {
      chapter: 'problem',
      short: 'The brief',
      title: 'A line where the first to arrive is served first',
      body: 'Like a drive-thru: cars join at the back, and the car that arrived first is served first (**FIFO**).\n\n`Queue` needs `enqueue(value)`, `dequeue()` and `front()`, each in **`O(1)`**, and `dequeue()` on an empty queue must not crash.',
      code: { view: 'signature', lines: [4] },
      metrics: startMetrics,
      scene: { entities: scene({ items: LINE, served: 0, note: 'enqueue joins the back\ndequeue serves the front\nfront reads it, leaves it there' }) },
    },
    {
      chapter: 'idea',
      short: 'pop(0)',
      title: 'The obvious way: a list and pop(0)',
      body: 'A list appends at the back cheaply, so line 6 is fine. But line 9’s `pop(0)` removes index 0, and **every** other item then shifts one slot left to close the gap.\n\nWith `n` waiting, each dequeue moves `n − 1` values: **`O(n)`**.',
      code: { view: 'snapshot', id: 'brute', lines: [6, 9] },
      metrics: startMetrics,
      scene: {
        entities: [
          arr('items', 0, 0, [10, 20, 30], { label: '_items', tones: { 0: 'found', 1: 'miss', 2: 'miss' }, itemKeys: [0, 1, 2], codeVar: '_items' }),
          ptr('front', 'items', 0, 'front', { side: 'top', tone: 'found' }),
          ...[1, 2].map((k) => link(`shift-${k}`, { entity: 'items', index: k, side: 'bottom' }, { entity: 'items', index: k - 1, side: 'bottom' }, { tone: 'miss', dashed: true })),
          note('note', NOTE_X, VARS_Y, 'pop(0) serves 10, then 20 and 30\neach shift one slot left\nn waiting → n − 1 moves: O(n)', { tone: 'miss' }),
        ],
      },
    },
    {
      chapter: 'idea',
      short: 'deque',
      title: 'A deque moves its front instead of its items',
      body: '`collections.deque` keeps values in linked blocks and remembers where the first one is. `popleft()` just steps that start forward; nothing shifts.\n\nSo `append` (back) and `popleft` (front) are both **`O(1)`**.',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: { entities: scene({ items: LINE.slice(1), served: 1, phase: 'check', note: 'popleft() served 10:\nthe start moved one slot right\n20 and 30 stayed where they were' }) },
    },
    {
      chapter: 'build',
      short: 'The deque',
      title: 'Lines 1 and 6–7: an empty deque',
      body: 'The queue is a `deque`, ordered front → back (left → right). The comment records why it isn’t a list.',
      code: { view: 'reveal', reveal: [1, 4, 5, 6, 7], lines: [1, 6, 7] },
      metrics: startMetrics,
      changes: ['from collections import deque', 'self._items = deque()'],
      scene: at(0),
    },
    {
      chapter: 'build',
      short: 'enqueue',
      title: 'Lines 9–10: enqueue appends at the back',
      body: '`append` adds the value on the right, behind everyone already waiting.',
      code: { view: 'reveal', reveal: [1, 4, 5, 6, 7, 9, 10], lines: [9, 10] },
      metrics: startMetrics,
      changes: ['self._items.append(value)'],
      scene: at(find('enqueue(30)')),
    },
    {
      chapter: 'build',
      short: 'Empty?',
      title: 'Lines 12–14: dequeue checks for an empty queue first',
      body: '`deque().popleft()` raises an `IndexError`. Line 13 catches the empty case first, and line 14 returns `None` so the caller can tell.',
      code: { view: 'reveal', reveal: [1, 4, 5, 6, 7, 9, 10, 12, 13, 14], lines: [13, 14] },
      metrics: startMetrics,
      changes: ['if not self._items: return None'],
      scene: at(RUN.length - 2),
    },
    {
      chapter: 'build',
      short: 'dequeue',
      title: 'Line 15: serve the leftmost value',
      body: '`popleft()` removes and returns the **oldest** value, the one at the front. The values behind it don’t move.',
      code: { view: 'reveal', reveal: [1, 4, 5, 6, 7, 9, 10, 12, 13, 14, 15], lines: [15] },
      metrics: startMetrics,
      changes: ['return self._items.popleft()'],
      scene: at(find('serve 10')),
    },
    {
      chapter: 'build',
      short: 'front guard',
      title: 'Lines 17–19: front needs the same guard',
      body: 'Reading `_items[0]` of an empty deque also raises an `IndexError`, so `front` starts with the same check.',
      code: { view: 'reveal', reveal: [1, 4, 5, 6, 7, 9, 10, 12, 13, 14, 15, 17, 18, 19], lines: [17, 18, 19] },
      metrics: startMetrics,
      changes: ['if not self._items: return None'],
      scene: at(find('front()?')),
    },
    {
      chapter: 'build',
      short: 'front',
      title: 'Line 20: read the front without serving it',
      body: 'Index `0` is the oldest value. `front` only reads it, so the line stays the same.\n\nThat’s the whole class. Now let’s run it.',
      code: { view: 'final', lines: [20] },
      metrics: startMetrics,
      changes: ['return self._items[0]'],
      scene: at(find('front → 10')),
    },
    ...RUN,
    {
      chapter: 'why',
      short: 'Recap',
      title: 'Both ends are O(1)',
      body: 'Enqueue touches the back and dequeue the front, and a deque changes either end without moving anything else: **`O(1)`** each. It holds one slot per waiting value: **`O(n)`** space.\n\nSwitch to **🧪 Try your own** to run your own line.',
      code: { view: 'final', lines: [10, 15, 20] },
      metrics: FINAL_METRICS,
      scene: { entities: scene({ items: [], served: 3, returns: 'None', note: 'served 10, 20, 30: arrival order\nnothing ever shifted\n→ O(1) per operation', noteTone: 'found' }) },
    },
    {
      chapter: 'why',
      short: 'Why deque',
      title: 'Why line 7 uses a deque instead of a list',
      body: 'A list keeps its items packed from index 0, so `pop(0)` moves every other item. A deque only moves its start. With 10,000 people waiting, `pop(0)` shifts 9,999 values per serve and `popleft()` shifts none.\n\nThat is the key decision: a queue removes from the front, so use a structure that is cheap to change at the front.',
      code: { view: 'final', lines: [6, 7, 15] },
      values: { 7: 'deque: popleft() never shifts' },
      metrics: FINAL_METRICS,
      scene: { entities: scene({ items: LINE, served: 0, phase: 'check', note: '10,000 waiting:\nlist.pop(0) → 9,999 shifts\npopleft()   → 0 shifts' }) },
    },
  ],
  trace: {
    title: 'Run your own line',
    inputs: [{ name: 'ops', label: 'Operations: a number > 0 enqueues it, 0 dequeues, -1 reads the front', kind: 'numbers', default: '10, 20, 30, -1, 0, 40, 0' }],
    presets: [
      { label: 'Drive-thru line', values: { ops: '10, 20, 30, -1, 0, 40, 0' } },
      { label: 'Serve everyone', values: { ops: '1, 2, 3, 0, 0, 0' } },
      { label: 'Dequeue when empty', values: { ops: '5, 0, 0, -1, 9' } },
      { label: 'Alternating flow', values: { ops: '8, 16, 0, 24, 0, 32' } },
    ],
    maxItems: 10,
    run: (values) => {
      const codes = values['ops'];
      if (!Array.isArray(codes) || codes.length === 0) throw new Error('Enter at least one operation.');
      return traceQueue(parseOps(codes));
    },
  },
});
