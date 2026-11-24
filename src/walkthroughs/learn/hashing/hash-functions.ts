import { arr, defineWalkthrough, link, map, note, ptr, vars } from '../../../lib/walkthrough/helpers';
import { tableBesideArray } from '../../../lib/walkthrough/layout';
import type { Entity, MapEntry, ScalarValue, Step, Tone, VarRow } from '../../../lib/walkthrough/types';

const VARS_Y = 150;
const NOTE_Y = 380;
const THRESHOLD = 0.75;

type Phase = 'start' | 'call' | 'digit' | 'ret' | 'load';

interface HashState {
  readonly keys: readonly number[];
  readonly capacity: number;
  /** Keys stored in each slot. */
  readonly table: readonly (readonly number[])[];
  /** Index in `keys` being hashed. */
  readonly at?: number;
  /** Keys before `at` have been placed. */
  readonly placed: number;
  readonly phase: Phase;
  readonly digit?: number;
  readonly total?: number;
  /** Slot the key was just placed in. */
  readonly slot?: number;
  readonly collision?: boolean;
  readonly itemCount?: number;
  readonly loadFactor?: number;
  readonly resize?: boolean;
  readonly note?: string;
  readonly noteTone?: Tone;
  /** Hide the table and variables (before the code has them). */
  readonly bare?: boolean;
}

const fmt = (v: number): string => String(Math.round(v * 100) / 100);
const dash = (v: ScalarValue | undefined): ScalarValue => v ?? '—';
const mute = (v: ScalarValue | undefined): Tone => (v === undefined ? 'muted' : 'default');

/** Scene: the keys, the table (slot → keys) and the variables. */
function scene(s: HashState): Entity[] {
  const { keys, capacity, at, phase } = s;
  const tones: Record<number, Tone> = {};
  for (let i = 0; i < s.placed; i += 1) tones[i] = 'done';
  if (at !== undefined) tones[at] = 'active';
  const entities: Entity[] = [arr('keys', 0, 0, keys, { label: 'keys', tones })];
  if (at !== undefined) entities.push(ptr('key', 'keys', at, 'key', { side: 'top', tone: 'active', codeVar: 'key' }));

  const entries: MapEntry[] = s.table.map((b, k) => ({
    key: k,
    value: b.length === 0 ? '—' : b.join(', '),
    tone: k === s.slot ? (s.collision ? 'miss' : 'active') : b.length > 0 ? 'done' : 'default',
  }));
  entities.push(map('table', tableBesideArray(keys.length, capacity), 0, `table  (${capacity} slots)`, entries, { width: 170 }));

  if (!s.bare) {
    const rows: VarRow[] =
      phase === 'load'
        ? [
            { name: 'item_count', value: dash(s.itemCount) },
            { name: 'capacity', value: capacity },
            { name: 'load_factor', value: dash(s.loadFactor === undefined ? undefined : fmt(s.loadFactor)), tone: s.resize ? 'miss' : 'default' },
            { name: 'threshold', value: THRESHOLD },
          ]
        : [
            { name: 'key', value: dash(at === undefined ? undefined : keys[at]), tone: mute(at) },
            { name: 'digit', value: dash(s.digit), tone: mute(s.digit) },
            { name: 'total', value: dash(s.total), tone: phase === 'ret' ? (s.collision ? 'miss' : 'found') : mute(s.total) },
            { name: 'capacity', value: capacity },
          ];
    entities.push(vars('vals', 0, VARS_Y, rows, { label: 'variables', width: 180 }));
  }
  if (s.note) entities.push(note('note', 0, NOTE_Y, s.note, { tone: s.noteTone ?? 'note' }));
  return entities;
}

const empty = (capacity: number): number[][] => Array.from({ length: capacity }, () => []);
const copy = (t: readonly (readonly number[])[]): number[][] => t.map((b) => [...b]);

/** Hashes every key into a table, then asks `needs_resize`, one step per decision (chapter "run", final code). */
function traceHash(keys: readonly number[], capacity: number): Step[] {
  const steps: Step[] = [];
  const table = empty(capacity);
  let hashed = 0;
  let collisions = 0;
  let count = 0;
  let verdict = '—';
  const metrics = (): Record<string, string | number> => ({ hashed, collisions, result: verdict });

  steps.push({
    chapter: 'run',
    short: 'Start',
    title: `Hash ${keys.length} keys into ${capacity} slots`,
    body: `Each key goes through \`hash_digits\` (lines 1–6) to get a slot. After every insert, \`needs_resize\` (lines 9–11) checks how full the table is.`,
    code: { view: 'final', lines: [1, 9] },
    metrics: metrics(),
    scene: { entities: scene({ keys, capacity, table: copy(table), placed: 0, phase: 'start' }) },
  });

  keys.forEach((key, at) => {
    const digits = [...String(Math.abs(key))].map(Number);
    steps.push({
      chapter: 'run',
      short: `hash ${key}`,
      title: `hash_digits(${key}, ${capacity}): start at 0`,
      body: `Line 1 receives \`key = ${key}\`. Line 2 sets \`total = 0\`, then line 3 will walk its digits: ${digits.join(', ')}.`,
      code: { view: 'final', lines: [1, 2, 3] },
      values: { 1: `key = ${key}`, 2: 'total = 0' },
      metrics: metrics(),
      scene: { entities: scene({ keys, capacity, table: copy(table), at, placed: at, phase: 'call', total: 0 }) },
    });
    let total = 0;
    digits.forEach((digit, j) => {
      const raw = total * 31 + digit;
      total = raw % capacity;
      steps.push({
        chapter: 'run',
        short: `digit ${digit}`,
        title: `Mix in digit ${digit}: total becomes ${total}`,
        body: `Line 3: next digit is \`${digit}\`. Line 5: \`${j === 0 ? 0 : 'total'} × 31 + ${digit}\` is ${raw}, and \`${raw} % ${capacity}\` leaves **${total}**.`,
        code: { view: 'final', lines: [3, 5] },
        values: { 3: `digit = ${digit}`, 5: `total = (${raw}) % ${capacity} = ${total}` },
        metrics: metrics(),
        changes: [`total = ${total}`],
        scene: { entities: scene({ keys, capacity, table: copy(table), at, placed: at, phase: 'digit', digit, total }) },
      });
    });
    const clash = (table[total]?.length ?? 0) > 0;
    table[total]?.push(key);
    hashed += 1;
    count += 1;
    if (clash) collisions += 1;
    steps.push({
      chapter: 'run',
      short: `slot ${total}`,
      title: clash ? `${key} → slot ${total}: a collision` : `${key} → slot ${total}`,
      body: clash
        ? `Line 6 returns \`${total}\`. Slot ${total} already holds ${(table[total] ?? []).slice(0, -1).join(', ')}, so two keys now share it: a **collision**.`
        : `Line 6 returns \`${total}\`. Slot ${total} was empty, so ${key} sits there alone.`,
      code: { view: 'final', lines: [6] },
      values: { 6: `return ${total}` },
      metrics: metrics(),
      changes: [`slot ${total} = [${(table[total] ?? []).join(', ')}]`],
      scene: { entities: scene({ keys, capacity, table: copy(table), at, placed: at, phase: 'ret', total, slot: total, collision: clash }) },
    });
    const load = count / capacity;
    const resize = load > THRESHOLD;
    verdict = resize ? 'resize' : 'ok';
    steps.push({
      chapter: 'run',
      short: `load ${fmt(load)}`,
      title: resize ? `${count}/${capacity} = ${fmt(load)}: time to grow` : `${count}/${capacity} = ${fmt(load)}: still roomy`,
      body: `Line 10: \`${count} / ${capacity}\` is the load factor, **${fmt(load)}**. Line 11 compares it with \`${THRESHOLD}\`: ${resize ? 'it is bigger, so the table should grow' : 'it is not bigger, so no resize yet'}.`,
      code: { view: 'final', lines: [9, 10, 11] },
      values: { 10: `load_factor = ${count} / ${capacity} = ${fmt(load)}`, 11: `${fmt(load)} > ${THRESHOLD} → ${resize ? 'True' : 'False'}` },
      metrics: metrics(),
      scene: {
        entities: scene({ keys, capacity, table: copy(table), at, placed: at + 1, phase: 'load', slot: total, itemCount: count, loadFactor: load, resize }),
      },
    });
  });
  return steps;
}

const KEYS = [12, 25, 33, 41] as const;
const CAP = 4;
const RUN = traceHash(KEYS, CAP);
const FINAL_METRICS = RUN.at(-1)?.metrics ?? { hashed: 0, collisions: 0, result: '—' };
const START = { hashed: 0, collisions: 0, result: '—' } as const;
/** Scene of run step n, so build steps show the moment they describe. */
const at = (n: number): Step['scene'] => RUN[n]?.scene ?? { entities: [] };
const lastState = (): HashState => ({
  keys: KEYS,
  capacity: CAP,
  table: [[33], [12, 41], [], [25]],
  placed: KEYS.length,
  phase: 'load',
  itemCount: 4,
  loadFactor: 1,
  resize: true,
});
const BUILD_END = 8;

export default defineWalkthrough({
  id: 'learn/hashing/hash-functions',
  title: 'Hash Functions & Load Factor, a key becomes a slot',
  summary: 'From the problem to the idea to the code: turn a key into a slot number, see why position matters when mixing digits, and know when a table is too full.',
  minutes: 8,
  code: {
    lang: 'python',
    source: `def hash_digits(key: int, capacity: int) -> int:
    total = 0
    for digit in str(abs(key)):
        # Mixing with 31 keeps "12" and "21" apart
        total = (total * 31 + int(digit)) % capacity
    return total


def needs_resize(item_count: int, capacity: int, threshold: float = 0.75) -> bool:
    load_factor = item_count / capacity
    return load_factor > threshold`,
  },
  snapshots: {
    naive: `def hash_digits(key: int, capacity: int) -> int:
    # Order is ignored: 12, 21 and 30 all give 3
    return sum(int(d) for d in str(abs(key))) % capacity`,
  },
  metrics: [
    { key: 'hashed', label: 'Keys hashed' },
    { key: 'collisions', label: 'Collisions' },
    { key: 'result', label: 'Resize?' },
  ],
  legend: [
    { tone: 'active', label: 'current key / slot' },
    { tone: 'done', label: 'already placed' },
    { tone: 'miss', label: 'collision / too full' },
    { tone: 'found', label: 'slot found' },
  ],
  goals: [
    { text: 'See why a plain digit sum is a weak hash', step: 2 },
    { text: 'Mix digits so their order matters', step: 3 },
    { text: 'Know when a table is too full', step: 4 },
    { text: 'Follow every digit, slot and load check', step: BUILD_END + 1 },
    { text: 'Know why line 5 multiplies before it adds', step: BUILD_END + RUN.length + 2 },
  ],
  steps: [
    {
      chapter: 'problem',
      short: 'The brief',
      title: 'Turn any key into a slot number',
      body: 'A table has `capacity` slots, numbered `0` to `capacity − 1`. Given a key like `12`, line 1 must return **the same slot every time**, so we can walk straight to it.\n\nHere the table has 4 slots and we have 4 keys to place.',
      code: { view: 'signature', lines: [1] },
      metrics: START,
      scene: { entities: scene({ keys: KEYS, capacity: CAP, table: empty(CAP), placed: 0, phase: 'start', bare: true, note: 'hash_digits(12, 4) → a slot from 0 to 3' }) },
    },
    {
      chapter: 'idea',
      short: 'Digit sum',
      title: 'The obvious way: add up the digits',
      body: '`12 → 1 + 2 = 3`. It is deterministic and fast, but it **ignores order**: `12`, `21` and `30` all give 3.\n\nKeys that look different keep landing in the same slot.',
      code: { view: 'snapshot', id: 'naive', lines: [2] },
      metrics: START,
      scene: {
        entities: [
          arr('naive', 0, 0, [12, 21, 30], { label: 'keys', tones: { 0: 'miss', 1: 'miss', 2: 'miss' } }),
          map('slots', 380, 0, 'digit sum  (slot → keys)', [{ key: 3, value: '12, 21, 30', tone: 'miss' }], { width: 170 }),
          link('l1', { entity: 'naive', index: 0, side: 'bottom' }, { entity: 'slots', key: 3 }, { tone: 'miss', dashed: true, label: '12 → 3' }),
          note('note', 0, VARS_Y, 'digit sum ignores order\nmany keys, one slot', { tone: 'miss' }),
        ],
      },
    },
    {
      chapter: 'idea',
      short: 'Mix by 31',
      title: 'Make every digit’s position count',
      body: 'Keep a running `total`. For each digit, **multiply the total by 31, then add the digit**. The multiply pushes earlier digits up, so order changes the result.\n\nThen `% capacity` wraps it into `0` to `capacity − 1`. Doing it after every digit keeps the numbers small.',
      code: { view: 'signature' },
      metrics: START,
      scene: {
        entities: [
          arr('pair', 0, 0, [12, 21], { label: 'keys' }),
          vars('vals', 0, VARS_Y, [{ name: '12', value: '(1×31 + 2) = 33' }, { name: '21', value: '(2×31 + 1) = 63' }], { label: 'same digits, different totals', width: 230 }),
          note('note', 0, NOTE_Y - 100, 'total = (total × 31 + digit) % capacity'),
        ],
      },
    },
    {
      chapter: 'idea',
      short: 'Load factor',
      title: 'Slots run out: measure how full we are',
      body: 'With 4 keys in 4 slots, collisions are almost certain. The **load factor** is `items / capacity`. Past about `0.75` collisions pile up, so the table should grow.\n\nA second small function, `needs_resize`, answers that question.',
      code: { view: 'signature' },
      metrics: START,
      scene: { entities: scene({ ...lastState(), at: undefined, note: 'load factor = items ÷ slots\n4 ÷ 4 = 1.0 → too crowded', noteTone: 'miss' }) },
    },
    {
      chapter: 'build',
      short: 'Total',
      title: 'Lines 1, 2 and 6: a running total',
      body: 'The function starts with `total = 0` and will hand back whatever the loop builds up. Line 1 takes the key and the number of slots.',
      code: { view: 'reveal', reveal: [1, 2, 6], lines: [2] },
      metrics: START,
      changes: ['total = 0', 'return total'],
      scene: at(1),
    },
    {
      chapter: 'build',
      short: 'Mix digits',
      title: 'Lines 3–5: mix in one digit at a time',
      body: 'Line 3 walks the digits of `abs(key)`, so a minus sign never reaches `int(digit)`. Line 5 is the formula from the idea: multiply, add, wrap with `% capacity`.\n\nThe comment on line 4 says why the 31 is there.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5, 6], lines: [3, 5] },
      metrics: START,
      changes: ['for digit in str(abs(key))', 'total = (total * 31 + int(digit)) % capacity'],
      scene: at(3),
    },
    {
      chapter: 'build',
      short: 'Load factor',
      title: 'Lines 9–10: items divided by slots',
      body: 'A second function, `needs_resize`, gets the number of stored items and the capacity. Line 10 turns them into a `load_factor`.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5, 6, 9, 10], lines: [10] },
      metrics: START,
      changes: ['load_factor = item_count / capacity'],
      scene: at(5),
    },
    {
      chapter: 'build',
      short: 'Threshold',
      title: 'Line 11: grow when it is past the threshold',
      body: 'The default `threshold` is `0.75`. When the load factor is **bigger** than that, line 11 returns `True`: time to build a larger table and re-hash the keys.\n\nThat is the whole lesson in code. Now let’s run it.',
      code: { view: 'final', lines: [11] },
      metrics: START,
      changes: ['return load_factor > threshold'],
      scene: at(5),
    },
    ...RUN,
    {
      chapter: 'why',
      short: 'Recap',
      title: 'A hash costs one pass over the key',
      body: 'Hashing a key with `k` digits takes **`O(k)`** time and `O(1)` extra space (a fixed-size integer needs about one step). The table of `m` slots takes `O(m)` space.\n\nThe load factor decides when to grow: resizing re-hashes all `n` keys once, **`O(n + m)`**, but happens rarely.',
      code: { view: 'final', lines: [3, 5, 10] },
      metrics: FINAL_METRICS,
      scene: { entities: scene({ ...lastState(), at: undefined, note: 'hash_digits   O(k)  per key\nneeds_resize  O(1)\nresize        O(n + m), rare', noteTone: 'found' }) },
    },
    {
      chapter: 'why',
      short: 'Order counts',
      title: 'Why line 5 multiplies before it adds',
      body: 'Without the `× 31`, the total is just the digit sum and `12` ties with `21`. Multiplying first moves each earlier digit one place up, like decimal place value, so `12` and `21` end up far apart.\n\nThat is the key decision: a hash should make **position** matter, or similar keys pile into the same slot.',
      code: { view: 'final', lines: [4, 5] },
      values: { 5: '12 → 33, 21 → 63 (not both 3)' },
      metrics: FINAL_METRICS,
      scene: {
        entities: [
          arr('pair', 0, 0, [12, 21], { label: 'keys', tones: { 0: 'found', 1: 'found' } }),
          vars('vals', 0, VARS_Y, [{ name: '12', value: '(1×31 + 2) = 33' }, { name: '21', value: '(2×31 + 1) = 63' }], { label: 'with × 31', width: 230 }),
          note('note', 0, NOTE_Y - 100, 'digit sum: 3 and 3, a tie\n× 31 first: 33 and 63, apart', { tone: 'found' }),
        ],
      },
    },
  ],
  trace: {
    title: 'Hash your own keys into a table',
    inputs: [
      { name: 'keys', label: 'Keys (up to 4 digits each)', kind: 'numbers', default: '12, 25, 33, 41' },
      { name: 'capacity', label: 'Slots (2–6)', kind: 'number', default: '4' },
    ],
    presets: [
      { label: 'Lesson example', values: { keys: '12, 25, 33, 41', capacity: '4' } },
      { label: 'All collide', values: { keys: '3, 5, 7', capacity: '2' } },
      { label: 'Anagrams', values: { keys: '12, 21', capacity: '4' } },
      { label: 'Negative and 0', values: { keys: '-17, 0, 8', capacity: '6' } },
      { label: 'Roomy table', values: { keys: '5, 14, 23', capacity: '6' } },
    ],
    maxItems: 5,
    run: (values) => {
      const keys = values['keys'];
      const capacity = values['capacity'];
      if (!Array.isArray(keys) || keys.length === 0 || typeof capacity !== 'number') throw new Error('Enter some keys and a number of slots.');
      if (capacity < 2 || capacity > 6) throw new Error('Use 2 to 6 slots so the table fits the stage.');
      if (keys.some((k) => Math.abs(k) > 9999)) throw new Error('Keys can have at most 4 digits.');
      return traceHash(keys, capacity);
    },
  },
});
