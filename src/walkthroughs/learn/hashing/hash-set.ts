import { arr, defineWalkthrough, link, map, note, ptr, vars } from '../../../lib/walkthrough/helpers';
import { tableBesideArray } from '../../../lib/walkthrough/layout';
import type { Entity, MapEntry, ScalarValue, Step, Tone, VarRow } from '../../../lib/walkthrough/types';

const VARS_Y = 150;
const NOTE_Y = 330;
const CAPACITY = 4;

interface SetState {
  /** The keys that `add` is called with, in order. */
  readonly keys: readonly number[];
  readonly buckets: readonly (readonly number[])[];
  /** Index in `keys` of the running `add`. */
  readonly at?: number;
  /** Keys before this index have been handled. */
  readonly placed: number;
  readonly key?: number;
  readonly index?: number;
  readonly slotTone?: Tone;
  /** Tone of the key cell being added (a duplicate turns `miss`). */
  readonly cellTone?: Tone;
  readonly look?: { readonly label: string; readonly tone: Tone; readonly flow?: boolean };
  readonly note?: string;
  readonly noteTone?: Tone;
  /** Hide the table and variables (before the code has them). */
  readonly bare?: boolean;
}

const dash = (v: ScalarValue | undefined): ScalarValue => v ?? '—';
const mute = (v: ScalarValue | undefined): Tone => (v === undefined ? 'muted' : 'default');
const list = (b: readonly number[]): string => (b.length === 0 ? '—' : b.join(', '));

/** Scene: the keys to add, `buckets` (slot → keys) and the variables. */
function scene(s: SetState): Entity[] {
  const tones: Record<number, Tone> = {};
  for (let i = 0; i < s.placed; i += 1) tones[i] = 'done';
  if (s.at !== undefined) tones[s.at] = s.cellTone ?? 'active';
  const entities: Entity[] = [arr('keys', 0, 0, s.keys, { label: 'keys to add', tones })];
  if (s.at !== undefined) entities.push(ptr('cursor', 'keys', s.at, 'key', { side: 'top', tone: s.cellTone ?? 'active', codeVar: 'key' }));
  const entries: MapEntry[] = s.buckets.map((b, i) => ({
    key: i,
    value: list(b),
    tone: i === s.index ? (s.slotTone ?? 'compare') : b.length > 0 ? 'done' : 'default',
  }));
  entities.push(map('buckets', tableBesideArray(s.keys.length, CAPACITY), 0, 'buckets  (slot → keys)', entries, { width: 200, codeVar: 'buckets' }));
  if (!s.bare) {
    const bucket = s.index === undefined ? undefined : `[${(s.buckets[s.index] ?? []).join(', ')}]`;
    const rows: VarRow[] = [
      { name: 'key', value: dash(s.key), tone: mute(s.key) },
      { name: 'index', value: dash(s.index), tone: mute(s.index) },
      { name: 'bucket', value: dash(bucket), tone: mute(bucket) },
    ];
    entities.push(vars('vals', 0, VARS_Y, rows, { label: 'variables', width: 180 }));
  }
  if (s.look && s.index !== undefined) {
    entities.push(
      link('look', { entity: 'vals', key: 'bucket' }, { entity: 'buckets', key: s.index }, { tone: s.look.tone, label: s.look.label, flow: s.look.flow ?? false, dashed: s.look.tone === 'miss' }),
    );
  }
  if (s.note) entities.push(note('note', 0, NOTE_Y, s.note, { tone: s.noteTone ?? 'note' }));
  return entities;
}

const copy = (bs: readonly (readonly number[])[]): number[][] => bs.map((b) => [...b]);
const emptyBuckets = (): number[][] => Array.from({ length: CAPACITY }, () => []);
const slotOf = (key: number): number => Math.abs(key) % CAPACITY;

/** `add(key)` for every key, then `contains(lookup)`, one step per decision (chapter "run", final code). */
function traceSet(keys: readonly number[], lookup: number): Step[] {
  const steps: Step[] = [];
  const buckets = emptyBuckets();
  let added = 0;
  let duplicates = 0;
  let result: string = '—';
  const metrics = (): Record<string, string | number> => ({ added, duplicates, result });
  const frame = (extra: Partial<SetState>): Entity[] => scene({ keys, buckets: copy(buckets), placed: 0, ...extra });

  steps.push({
    chapter: 'run',
    short: 'Create',
    title: `HashSet(): ${CAPACITY} empty buckets`,
    body: 'Lines 2–3 build one empty list per bucket. Nothing is in the set yet.',
    code: { view: 'final', lines: [2, 3] },
    values: { 3: `buckets = ${CAPACITY} empty lists` },
    metrics: metrics(),
    scene: { entities: frame({}) },
  });

  keys.forEach((key, at) => {
    const slot = slotOf(key);
    const base = { at, placed: at, key };
    steps.push({
      chapter: 'run',
      short: `add ${key}`,
      title: `add(${key}): ${key} % ${CAPACITY} = ${slot}`,
      body: `Line 9 asks \`_index(${key})\`. Line 6: \`abs(${key}) % ${CAPACITY}\` is **${slot}**, so only bucket ${slot} can hold ${key}.`,
      code: { view: 'final', lines: [6, 9] },
      values: { 6: `${Math.abs(key)} % ${CAPACITY} = ${slot}`, 9: `bucket = [${(buckets[slot] ?? []).join(', ')}]` },
      metrics: metrics(),
      scene: { entities: frame({ ...base, index: slot }) },
    });
    const b = buckets[slot] ?? [];
    const present = b.includes(key);
    steps.push({
      chapter: 'run',
      short: present ? 'Already in' : 'Not in',
      title: present ? `${key} is already in the bucket` : `${key} is not in the bucket`,
      body: present
        ? `Line 10: \`${key} in [${b.join(', ')}]\` is true, so this key is a **duplicate**.`
        : b.length === 0
          ? `Line 10: bucket ${slot} is empty, so \`${key} in []\` is false.`
          : `Line 10: \`${key} in [${b.join(', ')}]\` is false. The keys share bucket ${slot}, but ${key} is new.`,
      code: { view: 'final', lines: [10] },
      values: { 10: `${key} in [${b.join(', ')}] → ${present ? 'True' : 'False'}` },
      metrics: metrics(),
      scene: {
        entities: frame({ ...base, index: slot, slotTone: present ? 'found' : 'miss', look: { label: present ? `${key} → True` : `${key}? no`, tone: present ? 'found' : 'miss', flow: present } }),
      },
    });
    if (present) {
      duplicates += 1;
      steps.push({
        chapter: 'run',
        short: 'Return False',
        title: `Ignore the duplicate: return False`,
        body: `Line 11 returns \`False\` and nothing is written, so ${key} still appears **once**.`,
        code: { view: 'final', lines: [11] },
        values: { 11: 'return False' },
        metrics: metrics(),
        changes: ['return False'],
        scene: { entities: frame({ ...base, placed: at + 1, index: slot, slotTone: 'found', cellTone: 'miss' }) },
      });
    } else {
      b.push(key);
      added += 1;
      steps.push({
        chapter: 'run',
        short: 'Append',
        title: `Append ${key} to bucket ${slot}`,
        body: `Line 12 adds \`${key}\` to the end of the bucket list: now \`[${b.join(', ')}]\`.`,
        code: { view: 'final', lines: [12] },
        values: { 12: `bucket = [${b.join(', ')}]` },
        metrics: metrics(),
        changes: [`buckets[${slot}] = [${b.join(', ')}]`],
        scene: { entities: frame({ ...base, placed: at + 1, index: slot, slotTone: 'active' }) },
      });
      steps.push({
        chapter: 'run',
        short: 'Return True',
        title: `${key} was new: return True`,
        body: 'Line 13 tells the caller the key was added.',
        code: { view: 'final', lines: [13] },
        values: { 13: 'return True' },
        metrics: metrics(),
        changes: ['return True'],
        scene: { entities: frame({ ...base, placed: at + 1, index: slot, slotTone: 'done' }) },
      });
    }
  });

  const slot = slotOf(lookup);
  const b = buckets[slot] ?? [];
  const base = { placed: keys.length, key: lookup };
  steps.push({
    chapter: 'run',
    short: `has ${lookup}?`,
    title: `contains(${lookup}): ${lookup} % ${CAPACITY} = ${slot}`,
    body: `Line 16 asks \`_index(${lookup})\`. Line 6: \`abs(${lookup}) % ${CAPACITY}\` is **${slot}**, so we only look in bucket ${slot}.`,
    code: { view: 'final', lines: [6, 15, 16] },
    values: { 6: `${Math.abs(lookup)} % ${CAPACITY} = ${slot}`, 15: `key = ${lookup}` },
    metrics: metrics(),
    scene: { entities: frame({ ...base, index: slot }) },
  });
  const present = b.includes(lookup);
  result = present ? 'True' : 'False';
  steps.push({
    chapter: 'run',
    short: present ? 'Return True' : 'Return False',
    title: present ? `${lookup} is in the bucket: True` : `${lookup} is not in the bucket: False`,
    body: present
      ? `Line 16: \`${lookup} in [${b.join(', ')}]\` is true, so \`contains\` returns **True**. Only one bucket was searched.`
      : b.length === 0
        ? `Line 16: bucket ${slot} is empty, so \`contains\` returns **False** at once.`
        : `Line 16: \`${lookup} in [${b.join(', ')}]\` is false. Other keys share bucket ${slot}, but ${lookup} is not one of them, so \`contains\` returns **False**.`,
    code: { view: 'final', lines: [16] },
    values: { 16: present ? 'return True' : 'return False' },
    metrics: metrics(),
    changes: [`return ${present ? 'True' : 'False'}`],
    scene: {
      entities: frame({
        ...base,
        index: slot,
        slotTone: present ? 'found' : 'miss',
        look: { label: present ? `${lookup} → True` : `${lookup}? no`, tone: present ? 'found' : 'miss', flow: present },
      }),
    },
  });
  return steps;
}

const KEYS = [5, 9, 5, 12] as const;
const LOOKUP = 13;
const RUN = traceSet(KEYS, LOOKUP);
const START = { added: 0, duplicates: 0, result: '—' } as const;
const FINAL_METRICS = RUN.at(-1)?.metrics ?? START;
/** Scene of run step n (0-based), so build steps show the moment they describe. */
const at = (n: number): Step['scene'] => RUN[n]?.scene ?? { entities: [] };
const find = (short: string): number => RUN.findIndex((s) => s.short === short);
const BUILD_END = 1 + 3 + 6;
const END_BUCKETS: readonly (readonly number[])[] = [[12], [5, 9], [], []];

export default defineWalkthrough({
  id: 'learn/hashing/hash-set',
  title: 'Hash Set, have I seen this before?',
  summary: 'From the problem to the idea to the code: hash a value to one bucket, check that bucket, and keep every value exactly once.',
  minutes: 7,
  code: {
    lang: 'python',
    source: `class HashSet:
    def __init__(self, capacity: int = 4) -> None:
        self.buckets: list[list[int]] = [[] for _ in range(capacity)]

    def _index(self, key: int) -> int:
        return abs(key) % len(self.buckets)

    def add(self, key: int) -> bool:
        bucket = self.buckets[self._index(key)]
        if key in bucket:
            return False  # Ignore duplicates so every key stays unique
        bucket.append(key)
        return True

    def contains(self, key: int) -> bool:
        return key in self.buckets[self._index(key)]`,
  },
  snapshots: {
    scan: `def add(seen: list[int], key: int) -> bool:
    if key in seen:
        return False
    seen.append(key)
    return True`,
  },
  metrics: [
    { key: 'added', label: 'Keys added' },
    { key: 'duplicates', label: 'Duplicates' },
    { key: 'result', label: 'contains' },
  ],
  legend: [
    { tone: 'active', label: 'current key / written' },
    { tone: 'compare', label: 'bucket in use' },
    { tone: 'done', label: 'stored' },
    { tone: 'miss', label: 'not found / duplicate' },
    { tone: 'found', label: 'key found' },
  ],
  goals: [
    { text: 'See why a list makes "seen it?" slow', step: 2 },
    { text: 'Jump to one bucket with %', step: 3 },
    { text: 'Keep every value exactly once', step: 4 },
    { text: 'Follow every add and contains', step: BUILD_END + 1 },
    { text: 'Know why add checks before it appends', step: BUILD_END + RUN.length + 2 },
  ],
  steps: [
    {
      chapter: 'problem',
      short: 'The brief',
      title: 'Remember values, and answer “seen it?”',
      body: 'A hash set keeps **unique** values with no extra data attached. `add(5)` stores a value, and `contains(13)` answers yes or no.\n\nBoth must stay fast with thousands of values. Here the set has 4 buckets and 4 `add` calls are coming, one of them a repeat.',
      code: { view: 'signature', lines: [1] },
      metrics: START,
      scene: { entities: scene({ keys: KEYS, buckets: emptyBuckets(), placed: 0, bare: true, note: 'add(5), add(9), add(5), add(12)\ncontains(13) → ?' }) },
    },
    {
      chapter: 'idea',
      short: 'Scan a list',
      title: 'The obvious way: one list, check every item',
      body: 'Keep a single list. Before adding a value, line 2 asks `key in seen`, and Python must walk the list to answer.\n\nThat is **`O(n)`** per check, so 10,000 values mean up to 10,000 comparisons for every `add`.',
      code: { view: 'snapshot', id: 'scan', lines: [2, 3, 4] },
      metrics: START,
      scene: {
        entities: [
          arr('keys', 0, 0, [5, 9, 12, 7], { label: 'seen', tones: { 0: 'compare', 1: 'compare', 2: 'compare', 3: 'compare' } }),
          note('note', 0, VARS_Y, 'is 7 in the list? check every item\nn values → n comparisons → O(n)', { tone: 'miss' }),
        ],
      },
    },
    {
      chapter: 'idea',
      short: 'Pick a bucket',
      title: 'Let the value choose one bucket',
      body: 'Split the storage into 4 **buckets**. The remainder `key % 4` is always `0`, `1`, `2` or `3`, so it names exactly one bucket: `13 % 4 = 1`.\n\nA value can only ever be stored in its own bucket, so that is the only place to look.',
      code: { view: 'signature' },
      metrics: START,
      scene: {
        entities: [
          ...scene({ keys: KEYS, buckets: copy(END_BUCKETS), placed: 4, bare: true, index: 1, slotTone: 'compare' }),
          vars('vals', 0, VARS_Y, [{ name: '13 % 4', value: 1 }, { name: '12 % 4', value: 0 }], { label: 'key % buckets', width: 180 }),
          note('note', 0, NOTE_Y - 100, 'slot = key % number of buckets'),
        ],
      },
    },
    {
      chapter: 'idea',
      short: 'Keep unique',
      title: 'Check the bucket before adding',
      body: 'Different values can share a bucket (`5` and `9` both go to bucket 1), so each bucket is a short list. Searching it is quick because it holds only a few values.\n\nTo keep every value **once**, `add` first looks in the bucket and does nothing if the value is already there.',
      code: { view: 'signature' },
      metrics: START,
      scene: { entities: scene({ keys: KEYS, buckets: copy(END_BUCKETS), placed: 4, index: 1, slotTone: 'miss', note: 'add(5) twice → still one 5\nbucket 1 holds 5 and 9', noteTone: 'miss' }) },
    },
    {
      chapter: 'build',
      short: 'Buckets',
      title: 'Lines 1–3: one empty list per bucket',
      body: 'The constructor makes `capacity` empty lists. Each one will hold the values that hash to that bucket.',
      code: { view: 'reveal', reveal: [1, 2, 3], lines: [3] },
      metrics: START,
      changes: ['self.buckets = [[] for _ in range(capacity)]'],
      scene: at(0),
    },
    {
      chapter: 'build',
      short: '_index',
      title: 'Lines 5–6: the value picks the bucket',
      body: 'Line 6 is the formula from the idea: `% len(self.buckets)` wraps any whole number into `0 … capacity − 1`. `abs` turns a negative value into a positive one first.',
      code: { view: 'reveal', reveal: [1, 2, 3, 5, 6], lines: [6] },
      metrics: START,
      changes: ['return abs(key) % len(self.buckets)'],
      scene: at(1),
    },
    {
      chapter: 'build',
      short: 'Find bucket',
      title: 'Lines 8–9: add goes to its bucket',
      body: '`add` first finds the one bucket that could hold `key`. Everything after line 9 only touches that short list.',
      code: { view: 'reveal', reveal: [1, 2, 3, 5, 6, 8, 9], lines: [9] },
      metrics: START,
      changes: ['bucket = self.buckets[self._index(key)]'],
      scene: at(1),
    },
    {
      chapter: 'build',
      short: 'Duplicate?',
      title: 'Lines 10–11: skip a value that is already there',
      body: 'Line 10, `key in bucket`, walks the short list. If the value is found, line 11 returns `False` and writes nothing (the comment says why).',
      code: { view: 'reveal', reveal: [1, 2, 3, 5, 6, 8, 9, 10, 11], lines: [10, 11] },
      metrics: START,
      changes: ['if key in bucket: return False'],
      scene: at(find('Already in')),
    },
    {
      chapter: 'build',
      short: 'Append',
      title: 'Lines 12–13: store a new value',
      body: 'Past the check, the value is new: line 12 appends it and line 13 returns `True`.',
      code: { view: 'reveal', reveal: [1, 2, 3, 5, 6, 8, 9, 10, 11, 12, 13], lines: [12, 13] },
      metrics: START,
      changes: ['bucket.append(key)', 'return True'],
      scene: at(find('Return True')),
    },
    {
      chapter: 'build',
      short: 'contains',
      title: 'Lines 15–16: ask one bucket',
      body: '`contains` uses the same `_index`, then asks `key in` that one bucket. The answer is `True` or `False`, and no other bucket is touched.\n\nThat is the whole class. Now let’s run it.',
      code: { view: 'final', lines: [15, 16] },
      metrics: START,
      changes: ['return key in self.buckets[self._index(key)]'],
      scene: at(RUN.length - 1),
    },
    ...RUN,
    {
      chapter: 'why',
      short: 'Recap',
      title: 'One bucket per question',
      body: 'Finding the bucket is one `%`, **`O(1)`**. Searching it is short, so `add` and `contains` are `O(1)` on average, but **`O(n)`** if every value lands in one bucket. The buckets hold at most `n` values: `O(n)` space.\n\nSwitch to **🧪 Try your own** to try repeats and misses.',
      code: { view: 'final', lines: [6, 9, 16] },
      metrics: FINAL_METRICS,
      scene: { entities: scene({ keys: KEYS, buckets: copy(END_BUCKETS), placed: 4, note: 'average  O(1)\nworst    O(n)  one crowded bucket\nspace    O(n)', noteTone: 'found' }) },
    },
    {
      chapter: 'why',
      short: 'Check first',
      title: 'Why line 10 checks before line 12 appends',
      body: 'The third call, `add(5)`, finds `5` already in bucket 1. Without lines 10–11 the bucket would become `[5, 9, 5]`, and the set would hold the same value twice.\n\nThat is the key decision: look first, write only when the value is **new**, and a set stays a set.',
      code: { view: 'final', lines: [10, 11, 12] },
      values: { 11: 'duplicate 5: nothing written' },
      metrics: FINAL_METRICS,
      scene: { entities: scene({ keys: KEYS, buckets: copy(END_BUCKETS), placed: 4, index: 1, slotTone: 'found', note: 'add(5) again → False\nthe bucket stays [5, 9]', noteTone: 'found' }) },
    },
  ],
  trace: {
    title: 'Add your own values, then ask contains',
    inputs: [
      { name: 'keys', label: 'Values to add', kind: 'numbers', default: '5, 9, 5, 12' },
      { name: 'lookup', label: 'Value for contains', kind: 'number', default: '13' },
    ],
    presets: [
      { label: 'Lesson example', values: { keys: '5, 9, 5, 12', lookup: '13' } },
      { label: 'Value present', values: { keys: '5, 9, 12', lookup: '9' } },
      { label: 'All duplicates', values: { keys: '7, 7, 7', lookup: '7' } },
      { label: 'Same bucket', values: { keys: '4, 8, 12', lookup: '16' } },
      { label: 'Empty bucket', values: { keys: '1, 2', lookup: '4' } },
      { label: 'Negative value', values: { keys: '-3, 3', lookup: '3' } },
    ],
    maxItems: 6,
    run: (values) => {
      const keys = values['keys'];
      const lookup = values['lookup'];
      if (!Array.isArray(keys) || keys.length === 0 || typeof lookup !== 'number') throw new Error('Enter some values and one value for contains.');
      return traceSet(keys, lookup);
    },
  },
});
