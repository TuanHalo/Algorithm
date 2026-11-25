import { arr, defineWalkthrough, link, map, note, ptr, vars } from '../../../lib/walkthrough/helpers';
import { tableBesideArray } from '../../../lib/walkthrough/layout';
import type { Entity, MapEntry, ScalarValue, Step, Tone, VarRow } from '../../../lib/walkthrough/types';

const VARS_Y = 150;
const NOTE_Y = 360;
const CAPACITY = 4;
const MAP_W = 260;

type Pair = readonly [number, number];

interface MapState {
  /** The keys that `put` is called with, in order. */
  readonly keys: readonly number[];
  readonly buckets: readonly (readonly Pair[])[];
  /** Index in `keys` of the running `put`. */
  readonly at?: number;
  /** Keys before this index are already stored. */
  readonly placed: number;
  readonly key?: number;
  readonly value?: number;
  readonly index?: number;
  /** Key of the chain entry being compared. */
  readonly k?: number;
  readonly slotTone?: Tone;
  readonly look?: { readonly label: string; readonly tone: Tone; readonly flow?: boolean };
  readonly note?: string;
  readonly noteTone?: Tone;
  /** Hide the table and variables (before the code has them). */
  readonly bare?: boolean;
}

const dash = (v: ScalarValue | undefined): ScalarValue => v ?? '—';
const mute = (v: ScalarValue | undefined): Tone => (v === undefined ? 'muted' : 'default');
const chain = (b: readonly Pair[]): string => (b.length === 0 ? '—' : b.map(([k, v]) => `${k}: ${v}`).join(' | '));

/** Scene: the keys to store, `buckets` (slot → chain) and the variables. */
function scene(s: MapState): Entity[] {
  const tones: Record<number, Tone> = {};
  for (let i = 0; i < s.placed; i += 1) tones[i] = 'done';
  if (s.at !== undefined) tones[s.at] = 'active';
  const entities: Entity[] = [arr('keys', 0, 0, s.keys, { label: 'keys to put', tones })];
  if (s.at !== undefined) entities.push(ptr('cursor', 'keys', s.at, 'key', { side: 'top', tone: 'active', codeVar: 'key' }));
  const entries: MapEntry[] = s.buckets.map((b, i) => ({
    key: i,
    value: chain(b),
    tone: i === s.index ? (s.slotTone ?? 'compare') : b.length > 0 ? 'done' : 'default',
  }));
  entities.push(map('buckets', tableBesideArray(s.keys.length, CAPACITY), 0, 'buckets  (slot → key: value)', entries, { width: MAP_W, codeVar: 'buckets' }));
  if (!s.bare) {
    const rows: VarRow[] = [
      { name: 'key', value: dash(s.key), tone: mute(s.key) },
      { name: 'value', value: dash(s.value), tone: mute(s.value) },
      { name: 'index', value: dash(s.index), tone: mute(s.index) },
      { name: 'k', value: dash(s.k), tone: mute(s.k) },
    ];
    entities.push(vars('vals', 0, VARS_Y, rows, { label: 'variables', width: 180 }));
  }
  if (s.look && s.index !== undefined) {
    entities.push(
      link('look', { entity: 'vals', key: 'index' }, { entity: 'buckets', key: s.index }, { tone: s.look.tone, label: s.look.label, flow: s.look.flow ?? false, dashed: s.look.tone === 'miss' }),
    );
  }
  if (s.note) entities.push(note('note', 0, NOTE_Y, s.note, { tone: s.noteTone ?? 'note' }));
  return entities;
}

const copy = (bs: readonly (readonly Pair[])[]): Pair[][] => bs.map((b) => [...b]);
const emptyBuckets = (): Pair[][] => Array.from({ length: CAPACITY }, () => []);
const slotOf = (key: number): number => Math.abs(key) % CAPACITY;

/** `put(key, 10 × position)` for every key, then `get(lookup)`, one step per decision (chapter "run", final code). */
function traceMap(keys: readonly number[], lookup: number): Step[] {
  const steps: Step[] = [];
  const buckets = emptyBuckets();
  let puts = 0;
  let compares = 0;
  let result: string | number = '—';
  const metrics = (): Record<string, string | number> => ({ puts, compares, result });
  const frame = (extra: Partial<MapState>): Entity[] => scene({ keys, buckets: copy(buckets), placed: 0, ...extra });

  steps.push({
    chapter: 'run',
    short: 'Create',
    title: `HashMap(): ${CAPACITY} empty buckets`,
    body: `Lines 2–3 build one empty list per bucket: \`buckets = [[], [], [], []]\`. Nothing is stored yet.`,
    code: { view: 'final', lines: [2, 3] },
    values: { 3: `buckets = ${CAPACITY} empty lists` },
    metrics: metrics(),
    scene: { entities: frame({}) },
  });

  keys.forEach((key, at) => {
    const value = 10 * (at + 1);
    const slot = slotOf(key);
    const base = { at, placed: at, key, value };
    steps.push({
      chapter: 'run',
      short: `put ${key}`,
      title: `put(${key}, ${value}): ${key} % ${CAPACITY} = ${slot}`,
      body: `Line 9 asks \`_index(${key})\`. Line 6: \`abs(${key}) % ${CAPACITY}\` is **${slot}**, so we only look inside bucket ${slot}.`,
      code: { view: 'final', lines: [6, 9] },
      values: { 6: `${Math.abs(key)} % ${CAPACITY} = ${slot}`, 9: `bucket = buckets[${slot}]` },
      metrics: metrics(),
      scene: { entities: frame({ ...base, index: slot }) },
    });
    const b = buckets[slot] ?? [];
    let updated = false;
    for (let idx = 0; idx < b.length && !updated; idx += 1) {
      const k = b[idx]?.[0] ?? 0;
      const same = k === key;
      compares += 1;
      steps.push({
        chapter: 'run',
        short: same ? 'Same key' : 'Other key',
        title: same ? `${k} == ${key}: the key is already here` : `${k} != ${key}: a different key`,
        body: same
          ? `Line 10: \`k = ${k}\`. Line 11: \`${k} == ${key}\` is true, so this key is already stored and its value must change.`
          : `Line 10: \`k = ${k}\`. Line 11: \`${k} == ${key}\` is false. Two keys share bucket ${slot} (a collision), so we keep walking the chain.`,
        code: { view: 'final', lines: [10, 11] },
        values: { 10: `k = ${k}`, 11: `${k} == ${key} → ${same ? 'True' : 'False'}` },
        metrics: metrics(),
        scene: { entities: frame({ ...base, index: slot, k, slotTone: same ? 'found' : 'miss' }) },
      });
      if (same) {
        updated = true;
        b[idx] = [key, value];
        puts += 1;
        steps.push({
          chapter: 'run',
          short: 'Update',
          title: `Overwrite ${key}'s value with ${value}`,
          body: `Line 12 replaces the pair in place: \`bucket[${idx}] = (${key}, ${value})\`. Line 13 returns, so the key is never stored twice.`,
          code: { view: 'final', lines: [12, 13] },
          values: { 12: `bucket[${idx}] = (${key}, ${value})` },
          metrics: metrics(),
          changes: [`buckets[${slot}] = ${chain(b)}`],
          scene: { entities: frame({ ...base, placed: at + 1, index: slot, k, slotTone: 'active' }) },
        });
      }
    }
    if (!updated) {
      b.push([key, value]);
      puts += 1;
      steps.push({
        chapter: 'run',
        short: 'Append',
        title: `New key: append (${key}, ${value}) to bucket ${slot}`,
        body:
          b.length === 1
            ? `Bucket ${slot} was empty, so the loop on line 10 has nothing to compare. Line 14 appends \`(${key}, ${value})\`.`
            : `The loop on line 10 ended without a match. Line 14 appends \`(${key}, ${value})\` to the end of the chain in bucket ${slot}.`,
        code: { view: 'final', lines: [14] },
        values: { 14: `append((${key}, ${value}))` },
        metrics: metrics(),
        changes: [`buckets[${slot}] = ${chain(b)}`],
        scene: { entities: frame({ ...base, placed: at + 1, index: slot, slotTone: 'active' }) },
      });
    }
  });

  const slot = slotOf(lookup);
  const b = buckets[slot] ?? [];
  const base = { placed: keys.length, key: lookup };
  steps.push({
    chapter: 'run',
    short: `get ${lookup}`,
    title: `get(${lookup}): ${lookup} % ${CAPACITY} = ${slot}`,
    body: `Line 17 asks \`_index(${lookup})\`. Line 6: \`abs(${lookup}) % ${CAPACITY}\` is **${slot}**, so the answer can only be in bucket ${slot}.`,
    code: { view: 'final', lines: [6, 16, 17] },
    values: { 6: `${Math.abs(lookup)} % ${CAPACITY} = ${slot}`, 16: `key = ${lookup}` },
    metrics: metrics(),
    scene: { entities: frame({ ...base, index: slot }) },
  });
  let found: Pair | undefined;
  for (const [k, v] of b) {
    const same = k === lookup;
    compares += 1;
    steps.push({
      chapter: 'run',
      short: same ? 'Match' : 'Other key',
      title: same ? `${k} == ${lookup}: found it` : `${k} != ${lookup}: keep looking`,
      body: same ? `Line 17: \`k = ${k}, v = ${v}\`. Line 18: \`${k} == ${lookup}\` is true.` : `Line 17: \`k = ${k}, v = ${v}\`. Line 18: \`${k} == ${lookup}\` is false, so move to the next entry.`,
      code: { view: 'final', lines: [17, 18] },
      values: { 17: `k = ${k}, v = ${v}`, 18: `${k} == ${lookup} → ${same ? 'True' : 'False'}` },
      metrics: metrics(),
      scene: { entities: frame({ ...base, index: slot, k, slotTone: same ? 'found' : 'miss' }) },
    });
    if (same) {
      found = [k, v];
      break;
    }
  }
  if (found) {
    result = found[1];
    steps.push({
      chapter: 'run',
      short: `Return ${found[1]}`,
      title: `get(${lookup}) returns ${found[1]}`,
      body: `Line 19 returns the stored value, **${found[1]}**, and the other buckets were never touched.`,
      code: { view: 'final', lines: [19] },
      values: { 19: `return ${found[1]}` },
      metrics: metrics(),
      changes: [`return ${found[1]}`],
      scene: { entities: frame({ ...base, index: slot, k: found[0], slotTone: 'found', look: { label: `${lookup} → ${found[1]}`, tone: 'found', flow: true } }) },
    });
  } else {
    result = 'None';
    steps.push({
      chapter: 'run',
      short: 'Return None',
      title: `${lookup} is not stored: return None`,
      body: b.length === 0 ? `Bucket ${slot} is empty, so the loop on line 17 never runs. Line 20 returns **\`None\`**.` : `The loop on line 17 compared every key in bucket ${slot} and none matched. Line 20 returns **\`None\`**.`,
      code: { view: 'final', lines: [20] },
      values: { 20: 'return None' },
      metrics: metrics(),
      changes: ['return None'],
      scene: { entities: frame({ ...base, index: slot, slotTone: 'miss', look: { label: `${lookup}? no`, tone: 'miss' } }) },
    });
  }
  return steps;
}

const KEYS = [5, 9, 12, 5] as const;
const LOOKUP = 9;
const RUN = traceMap(KEYS, LOOKUP);
const START = { puts: 0, compares: 0, result: '—' } as const;
const FINAL_METRICS = RUN.at(-1)?.metrics ?? START;
/** Scene of run step n (0-based), so build steps show the moment they describe. */
const at = (n: number): Step['scene'] => RUN[n]?.scene ?? { entities: [] };
const find = (short: string): number => RUN.findIndex((s) => s.short === short);
const BUILD_END = 1 + 3 + 7;
const END_BUCKETS: readonly (readonly Pair[])[] = [[[12, 30]], [[5, 40], [9, 20]], [], []];

export default defineWalkthrough({
  id: 'learn/hashing/hash-map',
  title: 'Hash Map, find a value from its key',
  summary: 'From the problem to the idea to the code: hash a key to one bucket, keep a short list inside it, and watch put and get touch only that list.',
  minutes: 8,
  code: {
    lang: 'python',
    source: `class HashMap:
    def __init__(self, capacity: int = 4) -> None:
        self.buckets: list[list[tuple[int, int]]] = [[] for _ in range(capacity)]

    def _index(self, key: int) -> int:
        return abs(key) % len(self.buckets)

    def put(self, key: int, value: int) -> None:
        bucket = self.buckets[self._index(key)]
        for idx, (k, _) in enumerate(bucket):
            if k == key:
                bucket[idx] = (key, value)  # Update the existing key in place
                return
        bucket.append((key, value))

    def get(self, key: int) -> int | None:
        for k, v in self.buckets[self._index(key)]:
            if k == key:
                return v
        return None`,
  },
  snapshots: {
    scan: `def get(pairs: list[tuple[int, int]], key: int) -> int | None:
    for k, v in pairs:
        if k == key:
            return v
    return None`,
  },
  metrics: [
    { key: 'puts', label: 'Pairs stored' },
    { key: 'compares', label: 'Key compares' },
    { key: 'result', label: 'get returns' },
  ],
  legend: [
    { tone: 'active', label: 'current key / written' },
    { tone: 'compare', label: 'bucket in use' },
    { tone: 'done', label: 'stored' },
    { tone: 'miss', label: 'different key' },
    { tone: 'found', label: 'key matched' },
  ],
  goals: [
    { text: 'See why scanning every pair is slow', step: 2 },
    { text: 'Turn a key into a bucket with %', step: 3 },
    { text: 'Handle two keys in one bucket', step: 4 },
    { text: 'Follow every put, update and get', step: BUILD_END + 1 },
    { text: 'Know why put updates instead of appending', step: BUILD_END + RUN.length + 2 },
  ],
  steps: [
    {
      chapter: 'problem',
      short: 'The brief',
      title: 'Store pairs, then find a value by its key',
      body: 'A hash map saves `(key, value)` pairs. `put(5, 10)` stores one, and `get(9)` must return the value saved under key `9` (or `None`).\n\nBoth should be fast even with thousands of pairs. Here the map has 4 buckets and 4 `put` calls are coming.',
      code: { view: 'signature', lines: [1] },
      metrics: START,
      scene: { entities: scene({ keys: KEYS, buckets: emptyBuckets(), placed: 0, bare: true, note: 'put(5, 10) · get(9) → 20' }) },
    },
    {
      chapter: 'idea',
      short: 'Scan all',
      title: 'The obvious way: scan every pair',
      body: 'Keep one list of pairs. To `get` a key, walk the list until a key matches (lines 2–4).\n\nThat is **`O(n)`** per lookup: 10,000 pairs can mean 10,000 comparisons for one answer.',
      code: { view: 'snapshot', id: 'scan', lines: [2, 3, 4] },
      metrics: START,
      scene: {
        entities: [
          arr('keys', 0, 0, [5, 9, 12, 5], { label: 'pairs (keys)', tones: { 0: 'compare', 1: 'compare', 2: 'compare', 3: 'compare' } }),
          note('note', 0, VARS_Y, 'get(9) may check every pair\nn pairs → n comparisons → O(n)', { tone: 'miss' }),
        ],
      },
    },
    {
      chapter: 'idea',
      short: 'Hash to slot',
      title: 'Let the key choose its own bucket',
      body: 'Split the storage into 4 **buckets**. The remainder `key % 4` is always `0`, `1`, `2` or `3`, so it points at exactly one bucket: `9 % 4 = 1`.\n\nThe same key always gives the same bucket, so `put` and `get` both go straight there and ignore the rest.',
      code: { view: 'signature' },
      metrics: START,
      scene: {
        entities: [
          ...scene({ keys: KEYS, buckets: emptyBuckets(), placed: 0, bare: true, index: 1 }),
          vars('vals', 0, VARS_Y, [{ name: '9 % 4', value: 1 }, { name: '12 % 4', value: 0 }], { label: 'key % buckets', width: 180 }),
          note('note', 0, NOTE_Y - 100, 'slot = key % number of buckets'),
        ],
      },
    },
    {
      chapter: 'idea',
      short: 'Collisions',
      title: 'Two keys can land in the same bucket',
      body: '`5 % 4` and `9 % 4` are both `1`. That is a **collision**, and it is normal: each bucket holds a small **list** of `(key, value)` pairs, and we compare keys inside it.\n\nPutting a key that is already stored must **replace** its value, not add a second copy.',
      code: { view: 'signature' },
      metrics: START,
      scene: { entities: scene({ keys: KEYS, buckets: copy(END_BUCKETS), placed: 4, index: 1, slotTone: 'miss', note: '5 and 9 both hash to slot 1\none bucket, a short list', noteTone: 'miss' }) },
    },
    {
      chapter: 'build',
      short: 'Buckets',
      title: 'Lines 1–3: one empty list per bucket',
      body: 'The constructor makes `capacity` empty lists. Each list will hold the `(key, value)` pairs whose keys hash to that bucket.',
      code: { view: 'reveal', reveal: [1, 2, 3], lines: [3] },
      metrics: START,
      changes: ['self.buckets = [[] for _ in range(capacity)]'],
      scene: at(0),
    },
    {
      chapter: 'build',
      short: '_index',
      title: 'Lines 5–6: the key picks the bucket',
      body: 'Line 6 is the formula from the idea: `% len(self.buckets)` wraps any whole number into `0 … capacity − 1`. `abs` turns a negative key into a positive one first, so `-3` and `3` share a bucket.',
      code: { view: 'reveal', reveal: [1, 2, 3, 5, 6], lines: [6] },
      metrics: START,
      changes: ['return abs(key) % len(self.buckets)'],
      scene: at(1),
    },
    {
      chapter: 'build',
      short: 'Find bucket',
      title: 'Lines 8–9: put goes to its bucket',
      body: '`put` first finds the one bucket where `key` belongs. Everything after line 9 only touches that list.',
      code: { view: 'reveal', reveal: [1, 2, 3, 5, 6, 8, 9], lines: [9] },
      metrics: START,
      changes: ['bucket = self.buckets[self._index(key)]'],
      scene: at(1),
    },
    {
      chapter: 'build',
      short: 'Same key?',
      title: 'Lines 10–12: look for the key in the chain',
      body: 'Line 10 walks the pairs in the bucket. If line 11 finds the same key, line 12 **overwrites** its pair in place (the comment says why).',
      code: { view: 'reveal', reveal: [1, 2, 3, 5, 6, 8, 9, 10, 11, 12], lines: [10, 11, 12] },
      metrics: START,
      changes: ['for idx, (k, _) in enumerate(bucket)', 'if k == key: bucket[idx] = (key, value)'],
      scene: at(find('Same key')),
    },
    {
      chapter: 'build',
      short: 'Append',
      title: 'Lines 13–14: stop, or add a new pair',
      body: 'After an update, line 13 returns so the key is not stored twice. If the loop ends with no match, line 14 appends the new pair.',
      code: { view: 'reveal', reveal: [1, 2, 3, 5, 6, 8, 9, 10, 11, 12, 13, 14], lines: [13, 14] },
      metrics: START,
      changes: ['return', 'bucket.append((key, value))'],
      scene: at(5),
    },
    {
      chapter: 'build',
      short: 'get loop',
      title: 'Lines 16–18: get walks the same bucket',
      body: '`get` uses the same `_index`, then compares keys in that one list. A match on line 18 means the value `v` is the answer.',
      code: { view: 'reveal', reveal: [1, 2, 3, 5, 6, 8, 9, 10, 11, 12, 13, 14, 16, 17, 18], lines: [17, 18] },
      metrics: START,
      changes: ['for k, v in self.buckets[self._index(key)]', 'if k == key'],
      scene: at(find('get 9')),
    },
    {
      chapter: 'build',
      short: 'Return',
      title: 'Lines 19–20: the value, or None',
      body: 'A match returns its value. If the loop ends, the key was never stored, so line 20 returns `None`.\n\nThat is the whole class. Now let’s run it.',
      code: { view: 'final', lines: [19, 20] },
      metrics: START,
      changes: ['return v', 'return None'],
      scene: at(RUN.length - 1),
    },
    ...RUN,
    {
      chapter: 'why',
      short: 'Recap',
      title: 'One bucket, a handful of compares',
      body: 'Finding the bucket is one `%`, **`O(1)`**. Then only that bucket’s chain is scanned, so `put` and `get` are `O(1)` on average, but **`O(n)`** if every key lands in one bucket. The buckets hold all `n` pairs: `O(n)` space.\n\nSwitch to **🧪 Try your own** to try colliding keys.',
      code: { view: 'final', lines: [6, 9, 17] },
      metrics: FINAL_METRICS,
      scene: { entities: scene({ keys: KEYS, buckets: copy(END_BUCKETS), placed: 4, note: 'average  O(1)\nworst    O(n)  all keys in one bucket\nspace    O(n)', noteTone: 'found' }) },
    },
    {
      chapter: 'why',
      short: 'Update',
      title: 'Why line 12 overwrites instead of appending',
      body: 'The fourth call, `put(5, 40)`, finds `5` already in bucket 1. If we skipped lines 10–13 and just appended, the chain would hold **two** pairs for key 5 and `get(5)` would return the old value.\n\nThat is the key decision: search the bucket first, so every key appears **once**.',
      code: { view: 'final', lines: [10, 11, 12, 13] },
      values: { 12: 'bucket[0] = (5, 40)' },
      metrics: FINAL_METRICS,
      scene: { entities: scene({ keys: KEYS, buckets: copy(END_BUCKETS), placed: 4, index: 1, slotTone: 'found', note: 'put(5, 10) then put(5, 40)\nkeeps one pair: 5 → 40', noteTone: 'found' }) },
    },
  ],
  trace: {
    title: 'Put your own keys, then get one',
    inputs: [
      { name: 'keys', label: 'Keys to put (each gets value 10, 20, …)', kind: 'numbers', default: '5, 9, 12, 5' },
      { name: 'lookup', label: 'Key to get', kind: 'number', default: '9' },
    ],
    presets: [
      { label: 'Lesson example', values: { keys: '5, 9, 12, 5', lookup: '9' } },
      { label: 'Long chain', values: { keys: '4, 8, 12, 16', lookup: '16' } },
      { label: 'Same key again', values: { keys: '7, 7, 7', lookup: '7' } },
      { label: 'Missing key', values: { keys: '1, 2, 3', lookup: '11' } },
      { label: 'Empty bucket', values: { keys: '1, 2', lookup: '4' } },
      { label: 'Negative key', values: { keys: '-3, 3', lookup: '-3' } },
    ],
    maxItems: 5,
    run: (values) => {
      const keys = values['keys'];
      const lookup = values['lookup'];
      if (!Array.isArray(keys) || keys.length === 0 || typeof lookup !== 'number') throw new Error('Enter some keys and one key to get.');
      return traceMap(keys, lookup);
    },
  },
});
