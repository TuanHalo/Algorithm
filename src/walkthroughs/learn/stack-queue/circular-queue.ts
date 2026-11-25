import { arr, defineWalkthrough, note, ptr, vars } from '../../../lib/walkthrough/helpers';
import type { Entity, ScalarValue, Step, Tone, VarRow } from '../../../lib/walkthrough/types';

const VARS_Y = 150;
const NOTE_X = 220;

type Slot = number | null;

/**
 * `full` / `room`: line 9's verdict. `rear`: line 11 computed the write slot. `stored`: lines 12–14.
 * `empty` / `has`: line 17's verdict. `read`: lines 19–20. `moved`: line 22. `left`: lines 23–24.
 */
type Phase = 'create' | 'full' | 'room' | 'rear' | 'stored' | 'empty' | 'has' | 'read' | 'moved' | 'left';

interface RingState {
  readonly buf: readonly Slot[];
  readonly front: number;
  readonly size: number;
  readonly phase?: Phase;
  readonly rear?: number;
  /** Argument of the running `enqueue`. */
  readonly value?: number;
  /** `val` inside the running `dequeue`. */
  readonly val?: number;
  /** Slot that `dequeue` just read (and cleared), so it stays marked after `_front` moves on. */
  readonly readSlot?: number;
  readonly note?: string;
  readonly noteTone?: Tone;
  /** Hide the variables panel (before the code has them). */
  readonly bare?: boolean;
}

const cell = (v: Slot): ScalarValue => (v === null ? 'None' : v);

/** Scene for one moment: the fixed ring `_buf`, the `_front` and `rear` pins, and the variables. */
function scene(s: RingState): Entity[] {
  const { buf, front, phase, rear } = s;
  const tones: Record<number, Tone> = {};
  buf.forEach((v, k) => (tones[k] = v === null ? 'muted' : 'done'));
  if (phase === 'full') buf.forEach((_, k) => (tones[k] = 'miss'));
  if (phase === 'empty') tones[front] = 'miss';
  if ((phase === 'rear' || phase === 'stored') && rear !== undefined) tones[rear] = phase === 'stored' ? 'active' : 'compare';
  if (phase === 'has') tones[front] = 'compare';
  if ((phase === 'read' || phase === 'moved' || phase === 'left') && s.readSlot !== undefined) tones[s.readSlot] = 'found';

  const entities: Entity[] = [arr('buf', 0, 0, buf.map(cell), { label: '_buf', tones, codeVar: '_buf' })];
  const frontTone: Tone = phase === 'moved' ? 'active' : phase === 'has' ? 'compare' : 'done';
  entities.push(ptr('front', 'buf', front, '_front', { side: 'top', tone: frontTone, codeVar: '_front' }));
  if (rear !== undefined && (phase === 'rear' || phase === 'stored')) entities.push(ptr('rear', 'buf', rear, 'rear', { tone: phase === 'stored' ? 'active' : 'compare', codeVar: 'rear' }));

  if (!s.bare) {
    const rows: VarRow[] = [
      { name: '_front', value: front, tone: phase === 'moved' ? 'active' : 'default' },
      { name: '_size', value: s.size, tone: phase === 'full' || phase === 'empty' ? 'miss' : 'default' },
      { name: '_cap', value: buf.length, tone: phase === 'full' ? 'miss' : 'default' },
    ];
    if (s.value !== undefined) rows.push({ name: 'value', value: s.value });
    if (rear !== undefined && (phase === 'rear' || phase === 'stored')) rows.push({ name: 'rear', value: rear });
    if (s.val !== undefined) rows.push({ name: 'val', value: s.val, tone: 'found' });
    entities.push(vars('vals', 0, VARS_Y, rows, { label: 'variables', width: 170 }));
  }
  if (s.note) entities.push(note('note', NOTE_X, VARS_Y, s.note, { tone: s.noteTone ?? 'note' }));
  return entities;
}

type Op = { readonly kind: 'enqueue'; readonly value: number } | { readonly kind: 'dequeue' };

/** Trace input: a number above 0 enqueues it, 0 dequeues. */
function parseOps(codes: readonly number[]): Op[] {
  return codes.map((c) => {
    if (!Number.isInteger(c) || c < 0) throw new Error('Use a whole number above 0 to enqueue it, or 0 to dequeue.');
    return c === 0 ? { kind: 'dequeue' } : { kind: 'enqueue', value: c };
  });
}

const show = (buf: readonly Slot[]): string => `[${buf.map(cell).join(', ')}]`;

/** Creates a CircularQueue and runs every operation, one step per decision (chapter "run", final code). */
function traceRing(capacity: number, ops: readonly Op[]): Step[] {
  const steps: Step[] = [];
  const buf: Slot[] = new Array<Slot>(capacity).fill(null);
  let front = 0;
  let size = 0;
  let accepted = 0;
  let served = 0;
  let last: ScalarValue = '—';
  const metrics = (): Record<string, ScalarValue> => ({ accepted, served, result: last });
  const snap = (extra: Omit<RingState, 'buf' | 'front' | 'size'>): RingState => ({ buf: [...buf], front, size, ...extra });

  steps.push({
    chapter: 'run',
    short: 'Create',
    title: `CircularQueue(${capacity}): ${capacity} empty slots`,
    body: `Line 3 reserves all ${capacity} slots up front. Lines 5–6: \`_front = 0\` and \`_size = 0\`: nothing is waiting yet.`,
    code: { view: 'final', lines: [2, 3, 4, 5, 6] },
    values: { 3: `_buf = ${show(buf)}`, 4: `_cap = ${capacity}`, 5: '_front = 0', 6: '_size = 0' },
    metrics: metrics(),
    scene: { entities: scene(snap({ phase: 'create' })) },
  });

  for (const op of ops) {
    if (op.kind === 'enqueue') {
      const { value } = op;
      const full = size === capacity;
      steps.push({
        chapter: 'run',
        short: `enqueue(${value})`.slice(0, 14),
        title: full ? `enqueue(${value}): the ring is full` : `enqueue(${value}): is there a free slot?`,
        body: full
          ? `Line 9: \`_size == _cap\` (${size} == ${capacity}) is true. Every slot holds a value nobody has read yet.`
          : `Line 9: \`${size} == ${capacity}\` is false, so ${capacity - size} slot${capacity - size === 1 ? ' is' : 's are'} free.`,
        code: { view: 'final', lines: [8, 9] },
        values: { 8: `value = ${value}`, 9: `${size} == ${capacity} → ${full ? 'True' : 'False'}` },
        metrics: metrics(),
        scene: { entities: scene(snap({ phase: full ? 'full' : 'room', value })) },
      });
      if (full) {
        last = 'False';
        steps.push({
          chapter: 'run',
          short: 'False',
          title: `enqueue(${value}) returns False`,
          body: `Line 10 refuses ${value} and returns \`False\`, so the oldest unread value (${buf[front]}) isn’t overwritten. The caller must dequeue first.`,
          code: { view: 'final', lines: [10] },
          values: { 10: 'return False' },
          metrics: metrics(),
          scene: { entities: scene(snap({ phase: 'full', value })) },
        });
        continue;
      }
      const sum = front + size;
      const rear = sum % capacity;
      steps.push({
        chapter: 'run',
        short: `rear = ${rear}`,
        title: sum >= capacity ? `rear = ${rear}: past the end, wrap to the start` : `rear = ${rear}: the slot after the last value`,
        body:
          sum >= capacity
            ? `Line 11: \`_front + _size = ${front} + ${size} = ${sum}\`, one past the last slot. \`${sum} % ${capacity} = ${rear}\` wraps it back to slot ${rear}, which is free.`
            : `Line 11: \`(${front} + ${size}) % ${capacity} = ${rear}\`. ${size === 0 ? 'The ring is empty, so the first value goes where `_front` points.' : `The ${size} waiting value${size === 1 ? ' fills' : 's fill'} slots from ${front}, so slot ${rear} comes next.`}`,
        code: { view: 'final', lines: [11] },
        values: { 11: `rear = (${front} + ${size}) % ${capacity} = ${rear}` },
        metrics: metrics(),
        scene: { entities: scene(snap({ phase: 'rear', value, rear })) },
      });
      buf[rear] = value;
      size += 1;
      accepted += 1;
      last = 'True';
      steps.push({
        chapter: 'run',
        short: `store ${value}`,
        title: `Store ${value} in slot ${rear}`,
        body: `Line 12: \`_buf[${rear}] = ${value}\`. Line 13 counts it, \`_size = ${size}\`, and line 14 returns \`True\`. Nothing else moved.`,
        code: { view: 'final', lines: [12, 13, 14] },
        values: { 12: `_buf = ${show(buf)}`, 13: `_size = ${size}`, 14: 'return True' },
        metrics: metrics(),
        scene: { entities: scene(snap({ phase: 'stored', value, rear })) },
      });
      continue;
    }

    const empty = size === 0;
    steps.push({
      chapter: 'run',
      short: 'dequeue()?',
      title: empty ? 'dequeue(): the ring is empty' : 'dequeue(): is anything waiting?',
      body: empty ? 'Line 17: `_size == 0` is true. The slot under `_front` holds nothing to read.' : `Line 17: \`${size} == 0\` is false. The oldest value sits under \`_front\`, in slot ${front}.`,
      code: { view: 'final', lines: [16, 17] },
      values: { 17: `${size} == 0 → ${empty ? 'True' : 'False'}` },
      metrics: metrics(),
      scene: { entities: scene(snap({ phase: empty ? 'empty' : 'has' })) },
    });
    if (empty) {
      last = 'None';
      steps.push({
        chapter: 'run',
        short: 'None',
        title: 'dequeue() returns None',
        body: 'Line 18 returns `None`, so the caller learns the queue was empty and the program keeps running.',
        code: { view: 'final', lines: [18] },
        values: { 18: 'return None' },
        metrics: metrics(),
        scene: { entities: scene(snap({ phase: 'empty' })) },
      });
      continue;
    }
    const readSlot = front;
    const val = buf[front] ?? 0;
    buf[front] = null;
    steps.push({
      chapter: 'run',
      short: `read ${val}`,
      title: `Take ${val} out of slot ${readSlot}`,
      body: `Line 19 reads \`val = _buf[${readSlot}] = ${val}\`. Line 20 clears the slot to \`None\`, so it can be reused.`,
      code: { view: 'final', lines: [19, 20] },
      values: { 19: `val = ${val}`, 20: `_buf = ${show(buf)}` },
      metrics: metrics(),
      scene: { entities: scene(snap({ phase: 'read', val, readSlot })) },
    });
    const next = front + 1;
    front = next % capacity;
    steps.push({
      chapter: 'run',
      short: `_front = ${front}`,
      title: next === capacity ? `_front wraps from ${next - 1} back to 0` : `_front moves to ${front}`,
      body:
        next === capacity
          ? `Line 22: \`${next - 1} + 1 = ${next}\` is past the last slot, and \`${next} % ${capacity} = 0\` sends \`_front\` back to slot 0.`
          : `Line 22: \`(${next - 1} + 1) % ${capacity} = ${front}\`. The next oldest value waits in slot ${front}.`,
      code: { view: 'final', lines: [22] },
      values: { 22: `_front = (${next - 1} + 1) % ${capacity} = ${front}` },
      metrics: metrics(),
      scene: { entities: scene(snap({ phase: 'moved', val, readSlot })) },
    });
    size -= 1;
    served += 1;
    last = val;
    steps.push({
      chapter: 'run',
      short: `return ${val}`,
      title: `dequeue() returns ${val}`,
      body: `Line 23 counts the value out, \`_size = ${size}\`, and line 24 returns **${val}**.`,
      code: { view: 'final', lines: [23, 24] },
      values: { 23: `_size = ${size}`, 24: `return ${val}` },
      metrics: metrics(),
      scene: { entities: scene(snap({ phase: 'left', val, readSlot })) },
    });
  }
  return steps;
}

const OPS: readonly Op[] = [
  { kind: 'enqueue', value: 10 },
  { kind: 'enqueue', value: 20 },
  { kind: 'dequeue' },
  { kind: 'enqueue', value: 30 },
  { kind: 'enqueue', value: 40 },
  { kind: 'enqueue', value: 50 },
  { kind: 'dequeue' },
  { kind: 'dequeue' },
];
const RUN = traceRing(3, OPS);
const startMetrics = { accepted: 0, served: 0, result: '—' } as const;
const FINAL_METRICS = RUN.at(-1)?.metrics ?? startMetrics;
const BUILD_END = 12;
const at = (n: number): Step['scene'] => RUN[n]?.scene ?? { entities: [] };
const find = (short: string): number => RUN.findIndex((s) => s.short === short);
/** Last run step whose short label is `short` (the wrapped `rear = 0`, not the first one). */
const findLast = (short: string): number => RUN.findLastIndex((s) => s.short === short);
const END: RingState = { buf: [40, null, null], front: 0, size: 1 };

export default defineWalkthrough({
  id: 'learn/stack-queue/circular-queue',
  title: 'Circular Queue, a ring of fixed slots',
  summary: 'From the idea to the code: a queue in a fixed array whose front and rear wrap around with % capacity, so freed slots are reused and every operation is O(1).',
  minutes: 7,
  code: {
    lang: 'python',
    source: `class CircularQueue:
    def __init__(self, capacity: int) -> None:
        self._buf: list[int | None] = [None] * capacity
        self._cap = capacity
        self._front = 0
        self._size = 0  # Counted, so a full ring and an empty one differ

    def enqueue(self, value: int) -> bool:
        if self._size == self._cap:
            return False  # Full: never overwrite unread values
        rear = (self._front + self._size) % self._cap
        self._buf[rear] = value
        self._size += 1
        return True

    def dequeue(self) -> int | None:
        if self._size == 0:
            return None
        val = self._buf[self._front]
        self._buf[self._front] = None
        # Step past the last slot back to slot 0
        self._front = (self._front + 1) % self._cap
        self._size -= 1
        return val`,
  },
  snapshots: {
    brute: `def enqueue(self, value: int) -> bool:
    rear = self._front + self._size
    if rear == self._cap:
        return False  # Hits the end, though slots before front are free
    self._buf[rear] = value
    self._size += 1
    return True`,
  },
  metrics: [
    { key: 'accepted', label: 'Enqueued' },
    { key: 'served', label: 'Dequeued' },
    { key: 'result', label: 'Last return' },
  ],
  legend: [
    { tone: 'active', label: 'just written / just moved' },
    { tone: 'compare', label: 'slot being checked' },
    { tone: 'done', label: 'waiting value' },
    { tone: 'found', label: 'value taken out' },
    { tone: 'miss', label: 'full / empty' },
    { tone: 'muted', label: 'free slot (None)' },
  ],
  goals: [
    { text: 'See why a plain fixed array runs out of room', step: 2 },
    { text: 'Derive rear = (front + size) % cap', step: 3 },
    { text: 'Follow every enqueue, wrap and dequeue', step: BUILD_END + 1 },
    { text: 'Know why the ring counts its size', step: BUILD_END + RUN.length + 2 },
  ],
  steps: [
    {
      chapter: 'problem',
      short: 'The brief',
      title: 'A queue in a fixed number of slots',
      body: 'Like a sushi conveyor with 3 plates: when a guest takes the front plate, that spot comes round again for a new dish at the back.\n\n`CircularQueue(capacity)` gets **one fixed array**, never grows it, and must `enqueue` / `dequeue` in **`O(1)`**. Here slot 0 is free again, so `enqueue(40)` should go there.',
      code: { view: 'signature', lines: [1, 2] },
      metrics: startMetrics,
      scene: { entities: scene({ buf: [null, 20, 30], front: 1, size: 2, bare: true, note: 'enqueue(40)? slots 1–2 are taken\nbut slot 0 was freed earlier' }) },
    },
    {
      chapter: 'idea',
      short: 'Straight',
      title: 'The obvious way: the back only moves right',
      body: 'Line 2 puts the next value right after the last one, `front + size`. After a few dequeues, line 3 hits the end of the array while slot 0 sits empty, so line 4 refuses.\n\nShifting everything left would free the end again, but that costs **`O(n)`** per dequeue.',
      code: { view: 'snapshot', id: 'brute', lines: [2, 3, 4] },
      metrics: startMetrics,
      scene: { entities: scene({ buf: [null, 20, 30], front: 1, size: 2, phase: 'full', bare: true, note: 'front + size = 1 + 2 = 3 = cap\nno slot 3 → refused\nyet slot 0 is free', noteTone: 'miss' }) },
    },
    {
      chapter: 'idea',
      short: 'Wrap',
      title: 'Bend the row into a ring: (front + size) % cap',
      body: 'Treat the slot after the last one as slot 0. The waiting values start at `front` and take `size` slots, so the next free one is `front + size`; **`% cap`** folds any number past the end back to the start: `3 % 3 = 0`.\n\nThe same trick moves the front: `(front + 1) % cap`. Nothing ever shifts.',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: {
        entities: [
          ...scene({ buf: [null, 20, 30], front: 1, size: 2, phase: 'rear', rear: 0, bare: true }),
          note('note', NOTE_X, VARS_Y, 'rear = (front + size) % cap\n     = (1 + 2) % 3 = 0\nslot 0 is reused'),
        ],
      },
    },
    {
      chapter: 'build',
      short: 'Slots',
      title: 'Lines 3–5: fixed slots and a front index',
      body: 'Line 3 reserves every slot once, at the start; the array never grows. `_front` is the slot of the oldest value.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5], lines: [3, 4, 5] },
      metrics: startMetrics,
      changes: ['self._buf = [None] * capacity', 'self._cap = capacity', 'self._front = 0'],
      scene: at(0),
    },
    {
      chapter: 'build',
      short: 'Size',
      title: 'Line 6: count the waiting values',
      body: '`_size` says how many slots, starting at `_front`, hold values. The comment hints why we count instead of keeping a second index (the last step explains it).',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5, 6], lines: [6] },
      metrics: startMetrics,
      changes: ['self._size = 0'],
      scene: at(0),
    },
    {
      chapter: 'build',
      short: 'Full?',
      title: 'Lines 8–10: refuse when every slot is taken',
      body: 'A full ring has no free slot, and writing anyway would destroy the oldest unread value. Line 10 says no with `False`.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5, 6, 8, 9, 10], lines: [9, 10] },
      metrics: startMetrics,
      changes: ['if self._size == self._cap: return False'],
      scene: at(find('False')),
    },
    {
      chapter: 'build',
      short: 'rear',
      title: 'Line 11: the wrap formula from the idea',
      body: 'The free slot right after the waiting values, folded back into the array by `% self._cap`.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5, 6, 8, 9, 10, 11], lines: [11] },
      metrics: startMetrics,
      changes: ['rear = (self._front + self._size) % self._cap'],
      scene: at(findLast('rear = 0')),
    },
    {
      chapter: 'build',
      short: 'Store',
      title: 'Lines 12–14: write, count, report success',
      body: 'One write into the ring, one more waiting value, and `True` so the caller knows it was accepted.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13, 14], lines: [12, 13, 14] },
      metrics: startMetrics,
      changes: ['self._buf[rear] = value', 'self._size += 1', 'return True'],
      scene: at(find('store 40')),
    },
    {
      chapter: 'build',
      short: 'Empty?',
      title: 'Lines 16–18: nothing to dequeue from an empty ring',
      body: 'With `_size == 0`, the slot under `_front` holds no value. Line 18 returns `None` instead.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13, 14, 16, 17, 18], lines: [17, 18] },
      metrics: startMetrics,
      changes: ['if self._size == 0: return None'],
      scene: { entities: scene({ buf: [null, null, null], front: 0, size: 0, phase: 'empty' }) },
    },
    {
      chapter: 'build',
      short: 'Take',
      title: 'Lines 19–20: read the oldest value, free its slot',
      body: 'The oldest value is always under `_front`. Clearing the slot to `None` marks it free for a later enqueue.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13, 14, 16, 17, 18, 19, 20], lines: [19, 20] },
      metrics: startMetrics,
      changes: ['val = self._buf[self._front]', 'self._buf[self._front] = None'],
      scene: at(find('read 10')),
    },
    {
      chapter: 'build',
      short: 'Move',
      title: 'Lines 21–22: the front wraps the same way',
      body: '`_front + 1` steps to the next oldest value; past the last slot, `% self._cap` sends it back to 0.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13, 14, 16, 17, 18, 19, 20, 21, 22], lines: [21, 22] },
      metrics: startMetrics,
      changes: ['self._front = (self._front + 1) % self._cap'],
      scene: at(find('_front = 0')),
    },
    {
      chapter: 'build',
      short: 'Return',
      title: 'Lines 23–24: count it out, return it',
      body: 'One fewer waiting value, and the caller gets the one taken out.\n\nThat’s the whole class. Now let’s run it with 3 slots.',
      code: { view: 'final', lines: [23, 24] },
      metrics: startMetrics,
      changes: ['self._size -= 1', 'return val'],
      scene: at(find('return 10')),
    },
    ...RUN,
    {
      chapter: 'why',
      short: 'Recap',
      title: 'O(1) per operation in a fixed block',
      body: 'Each call does a check, one `%` and one write or read: **`O(1)`**, with no shifting and no resizing. Memory is the `k` slots reserved at the start: **`O(k)`**.\n\nSwitch to **🧪 Try your own** to pick the capacity and the operations.',
      code: { view: 'final', lines: [11, 22] },
      metrics: FINAL_METRICS,
      scene: { entities: scene({ ...END, note: '4 accepted, 1 refused, 3 served\nboth indexes wrapped once\nno value ever moved', noteTone: 'found' }) },
    },
    {
      chapter: 'why',
      short: 'Why _size',
      title: 'Why line 6 counts the values instead of keeping a rear index',
      body: 'With only `front` and `rear` indexes, an empty ring and a full ring look the same: both have `rear == front`. Counting `_size` tells them apart, so line 9 can refuse a full ring and line 17 can refuse an empty one.\n\nThat is the key decision: the count is what makes the wrap-around safe.',
      code: { view: 'final', lines: [6, 9, 17] },
      values: { 6: '0 = empty, _cap = full: never confused' },
      metrics: FINAL_METRICS,
      scene: { entities: scene({ buf: [40, 50, 60], front: 0, size: 3, phase: 'full', note: 'full: front 0, next rear 3 % 3 = 0\nempty: front 0, next rear 0\nsame indexes: only _size differs' }) },
    },
  ],
  trace: {
    title: 'Run your own ring',
    inputs: [
      { name: 'capacity', label: 'Capacity (3–8)', kind: 'number', default: '4' },
      { name: 'ops', label: 'Operations: a number > 0 enqueues it, 0 dequeues', kind: 'numbers', default: '10, 20, 30, 0, 0, 40, 50, 60' },
    ],
    presets: [
      { label: 'Wrap-around reuse', values: { capacity: '4', ops: '10, 20, 30, 0, 0, 40, 50, 60' } },
      { label: 'Full ring refuses', values: { capacity: '3', ops: '1, 2, 3, 4, 0, 4' } },
      { label: 'Dequeue when empty', values: { capacity: '4', ops: '7, 0, 0, 8' } },
    ],
    maxItems: 10,
    run: (values) => {
      const capacity = values['capacity'];
      const codes = values['ops'];
      if (typeof capacity !== 'number' || !Number.isInteger(capacity) || capacity < 3 || capacity > 8) throw new Error('Use a capacity from 3 to 8.');
      if (!Array.isArray(codes) || codes.length === 0) throw new Error('Enter at least one operation.');
      return traceRing(capacity, parseOps(codes));
    },
  },
});
