import { arr, defineWalkthrough, link, map, note, ptr, vars } from '../../../lib/walkthrough/helpers';
import { tableBesideArray } from '../../../lib/walkthrough/layout';
import type { Entity, MapEntry, ScalarValue, Step, Tone, VarRow } from '../../../lib/walkthrough/types';

const VARS_Y = 150;
const NOTE_Y = 360;
const THRESHOLD = 0.75;
const START_CAP = 2;
const MAP_W = 150;

interface ChainState {
  /** The keys that `put` is called with, in order. */
  readonly keys: readonly number[];
  readonly buckets: readonly (readonly number[])[];
  /** The table being replaced while `_rehash` runs. */
  readonly old?: readonly (readonly number[])[];
  /** Chain of `old` being walked. */
  readonly oldAt?: number;
  readonly at?: number;
  readonly placed: number;
  readonly key?: number;
  readonly idx?: number;
  readonly size?: number;
  readonly load?: number;
  readonly slotTone?: Tone;
  readonly look?: { readonly label: string; readonly tone: Tone; readonly flow?: boolean };
  readonly note?: string;
  readonly noteTone?: Tone;
  /** Hide the variables (before the code has them). */
  readonly bare?: boolean;
}

const dash = (v: ScalarValue | undefined): ScalarValue => v ?? '—';
const mute = (v: ScalarValue | undefined): Tone => (v === undefined ? 'muted' : 'default');
const list = (b: readonly number[]): string => (b.length === 0 ? '—' : b.join(' → '));
const fmt = (v: number): string => String(Math.round(v * 100) / 100);

/** Scene: the keys to put, `buckets` (slot → chain), the old table during a rehash, and the variables. */
function scene(s: ChainState): Entity[] {
  const tones: Record<number, Tone> = {};
  for (let i = 0; i < s.placed; i += 1) tones[i] = 'done';
  if (s.at !== undefined) tones[s.at] = 'active';
  const entities: Entity[] = [arr('keys', 0, 0, s.keys, { label: 'keys to put', tones })];
  if (s.at !== undefined) entities.push(ptr('cursor', 'keys', s.at, 'key', { side: 'top', tone: 'active', codeVar: 'key' }));
  const rows = Math.max(s.buckets.length, s.old?.length ?? 0);
  const x = tableBesideArray(s.keys.length, rows);
  const entries: MapEntry[] = s.buckets.map((b, i) => ({
    key: i,
    value: list(b),
    tone: i === s.idx ? (s.slotTone ?? 'compare') : b.length > 0 ? 'done' : 'default',
  }));
  entities.push(map('buckets', x, 0, 'buckets  (slot → chain)', entries, { width: MAP_W, codeVar: 'buckets' }));
  if (s.old) {
    const oldEntries: MapEntry[] = s.old.map((b, i) => ({ key: i, value: list(b), tone: i === s.oldAt ? 'compare' : 'muted' }));
    entities.push(map('old', x + 230, 0, 'old_buckets', oldEntries, { width: MAP_W, codeVar: 'old_buckets' }));
  }
  if (!s.bare) {
    const rowsV: VarRow[] = [
      { name: 'key', value: dash(s.key), tone: mute(s.key) },
      { name: 'idx', value: dash(s.idx), tone: mute(s.idx) },
      { name: 'size', value: dash(s.size), tone: mute(s.size) },
      { name: 'load', value: dash(s.load === undefined ? undefined : fmt(s.load)), tone: s.load !== undefined && s.load > THRESHOLD ? 'miss' : mute(s.load) },
    ];
    entities.push(vars('vals', 0, VARS_Y, rowsV, { label: 'variables', width: 180 }));
  }
  if (s.look && s.idx !== undefined) {
    entities.push(link('look', { entity: 'vals', key: 'idx' }, { entity: 'buckets', key: s.idx }, { tone: s.look.tone, label: s.look.label, flow: s.look.flow ?? false, dashed: s.look.tone === 'miss' }));
  }
  if (s.note) entities.push(note('note', 0, NOTE_Y, s.note, { tone: s.noteTone ?? 'note' }));
  return entities;
}

const copy = (bs: readonly (readonly number[])[]): number[][] => bs.map((b) => [...b]);
const emptyBuckets = (n: number): number[][] => Array.from({ length: n }, () => []);

/** `put` for every key, including every `_rehash` it triggers, one step per decision (chapter "run", final code). */
function traceChain(keys: readonly number[]): Step[] {
  const steps: Step[] = [];
  let buckets = emptyBuckets(START_CAP);
  let size = 0;
  let old: number[][] | undefined;
  let oldAt: number | undefined;
  let resizes = 0;
  let stored = 0;
  const metrics = (): Record<string, string | number> => ({ stored, resizes, result: '—' });
  const frame = (extra: Partial<ChainState>): Entity[] => scene({ keys, buckets: copy(buckets), old: old ? copy(old) : undefined, oldAt, placed: 0, ...extra });
  const push = (s: Omit<Step, 'chapter' | 'code' | 'metrics' | 'scene'> & { lines: number[]; entities: Entity[] }): void => {
    const { lines, entities, ...rest } = s;
    steps.push({ ...rest, chapter: 'run', code: { view: 'final', lines }, metrics: metrics(), scene: { entities } });
  };

  push({
    short: 'Create',
    title: `ChainedHashTable(): ${START_CAP} empty buckets`,
    body: `Lines 2–4 make ${START_CAP} empty buckets and set \`size = 0\`. Each bucket will hold a chain of keys.`,
    lines: [2, 3, 4],
    values: { 3: `buckets = ${START_CAP} empty lists`, 4: 'size = 0' },
    entities: frame({}),
  });

  /** One call of `put`; `base` says what the keys row shows, `rehashing` adds the loop lines. */
  const put = (key: number, base: Partial<ChainState>, rehashing: boolean): void => {
    const cap = buckets.length;
    const idx = key % cap;
    const extra = rehashing ? [19, 20, 21] : [];
    push({
      short: `put ${key}`,
      title: `put(${key}): ${key} % ${cap} = ${idx}`,
      body: rehashing
        ? `Lines 19–21 call \`self.put(${key})\` on the new table. Line 7: \`${key} % ${cap}\` is **${idx}**, so ${key} may land somewhere new.`
        : `Line 7: \`idx = ${key} % ${cap}\`, which is **${idx}**. Only chain ${idx} can hold ${key}.`,
      lines: [7, ...extra],
      values: { 7: `idx = ${key} % ${cap} = ${idx}` },
      entities: frame({ ...base, key, idx, size }),
    });
    const chain = buckets[idx] ?? [];
    const present = chain.includes(key);
    push({
      short: present ? 'Already in' : 'Not in',
      title: present ? `${key} is already in chain ${idx}` : `${key} is not in chain ${idx}`,
      body: present
        ? `Line 8: \`${key} in [${chain.join(', ')}]\` is true, so line 9 returns and nothing changes.`
        : chain.length === 0
          ? `Line 8: chain ${idx} is empty, so \`${key} in []\` is false.`
          : `Line 8: \`${key} in [${chain.join(', ')}]\` is false. The chain already has other keys: a **collision**, handled by simply adding to the chain.`,
      lines: present ? [8, 9] : [8],
      values: { 8: `${key} in [${chain.join(', ')}] → ${present ? 'True' : 'False'}` },
      entities: frame({ ...base, key, idx, size, slotTone: present ? 'found' : chain.length > 0 ? 'miss' : 'compare' }),
    });
    if (present) return;
    chain.push(key);
    size += 1;
    stored = size;
    push({
      short: 'Append',
      title: `Append ${key} to chain ${idx}, size = ${size}`,
      body: `Line 10 appends ${key}: chain ${idx} is now \`[${chain.join(', ')}]\`. Line 11 counts it: \`size = ${size}\`.`,
      lines: [10, 11],
      values: { 10: `buckets[${idx}] = [${chain.join(', ')}]`, 11: `size = ${size}` },
      changes: [`buckets[${idx}] = [${chain.join(', ')}]`, `size = ${size}`],
      entities: frame({ ...base, key, idx, size, slotTone: 'active' }),
    });
    const load = size / cap;
    const grow = load > THRESHOLD;
    push({
      short: `load ${fmt(load)}`,
      title: grow ? `${size}/${cap} = ${fmt(load)}: too crowded` : `${size}/${cap} = ${fmt(load)}: fine`,
      body: `Line 12: \`${size} / ${cap}\` is **${fmt(load)}**, compared with \`${THRESHOLD}\`. ${grow ? 'It is bigger, so line 13 calls `_rehash` to double the table.' : 'It is not bigger, so the chains stay as they are.'}`,
      lines: grow ? [12, 13] : [12],
      values: { 12: `${fmt(load)} > ${THRESHOLD} → ${grow ? 'True' : 'False'}` },
      entities: frame({ ...base, key, idx, size, load, slotTone: grow ? 'miss' : 'done' }),
    });
    if (!grow) return;

    resizes += 1;
    old = buckets;
    const newCap = cap * 2;
    push({
      short: 'Keep old',
      title: `_rehash: keep the old table as old_buckets`,
      body: 'Line 16 sets the current table aside. We are about to build a bigger one and move every key across.',
      lines: [15, 16],
      values: { 16: `old_buckets = ${cap} buckets` },
      entities: frame({ ...base, key, idx, size, load }),
    });
    buckets = emptyBuckets(newCap);
    size = 0;
    push({
      short: 'Double',
      title: `New table: ${newCap} empty buckets, size = 0`,
      body: `Line 17 makes \`${cap} × 2 = ${newCap}\` empty buckets. Line 18 resets \`size = 0\`, because the keys will be counted again as they are re-put.`,
      lines: [17, 18],
      values: { 17: `buckets = ${newCap} empty lists`, 18: 'size = 0' },
      changes: [`buckets = ${newCap} empty lists`, 'size = 0'],
      entities: frame({ ...base, key, size }),
    });
    old.forEach((chainOld, ci) => {
      for (const k of [...chainOld]) {
        oldAt = ci;
        put(k, base, true);
      }
    });
    old = undefined;
    oldAt = undefined;
  };

  keys.forEach((key, at) => {
    put(key, { at, placed: at }, false);
  });
  const last = steps.length - 1;
  const lastStep = steps[last];
  if (lastStep) steps[last] = { ...lastStep, metrics: { stored, resizes, result: `${buckets.length} buckets` } };
  return steps;
}

const KEYS = [4, 6, 9] as const;
const RUN = traceChain(KEYS);
const START = { stored: 0, resizes: 0, result: '—' } as const;
const FINAL_METRICS = RUN.at(-1)?.metrics ?? START;
const at = (n: number): Step['scene'] => RUN[n]?.scene ?? { entities: [] };
const find = (short: string): number => RUN.findIndex((s) => s.short === short);
const BUILD_END = 1 + 3 + 8;
const END_BUCKETS: readonly (readonly number[])[] = [[4], [9], [6], []];

export default defineWalkthrough({
  id: 'learn/hashing/separate-chaining',
  title: 'Separate Chaining, collisions share a chain',
  summary: 'From the problem to the idea to the code: let colliding keys share a list, and double the table when the average chain gets too long.',
  minutes: 10,
  code: {
    lang: 'python',
    source: `class ChainedHashTable:
    def __init__(self, capacity: int = 2) -> None:
        self.buckets: list[list[int]] = [[] for _ in range(capacity)]
        self.size = 0

    def put(self, key: int) -> None:
        idx = key % len(self.buckets)
        if key in self.buckets[idx]:
            return
        self.buckets[idx].append(key)
        self.size += 1
        if self.size / len(self.buckets) > 0.75:
            self._rehash()  # Keep average chain length under 1

    def _rehash(self) -> None:
        old_buckets = self.buckets
        self.buckets = [[] for _ in range(len(old_buckets) * 2)]
        self.size = 0
        for chain in old_buckets:
            for key in chain:
                self.put(key)`,
  },
  snapshots: {
    drop: `def put(self, key: int) -> None:
    idx = key % len(self.buckets)
    self.buckets[idx] = [key]  # A second key here erases the first`,
  },
  metrics: [
    { key: 'stored', label: 'Keys stored' },
    { key: 'resizes', label: 'Resizes' },
    { key: 'result', label: 'Table size' },
  ],
  legend: [
    { tone: 'active', label: 'current key / written' },
    { tone: 'compare', label: 'chain in use' },
    { tone: 'done', label: 'stored' },
    { tone: 'miss', label: 'collision / too full' },
    { tone: 'found', label: 'already stored' },
    { tone: 'muted', label: 'old table' },
  ],
  goals: [
    { text: 'See why a collision cannot just overwrite', step: 2 },
    { text: 'Let colliding keys share a chain', step: 3 },
    { text: 'Know when the chains are too long', step: 4 },
    { text: 'Follow every put and the rehash', step: BUILD_END + 1 },
    { text: 'Know why rehash re-puts every key', step: BUILD_END + RUN.length + 2 },
  ],
  steps: [
    {
      chapter: 'problem',
      short: 'The brief',
      title: 'Two keys, one bucket: what now?',
      body: 'A table with 2 buckets must store keys `4`, `6` and `9`. `4 % 2` and `6 % 2` are both `0`: a **collision**.\n\nThe table must keep both keys, and stay fast as it fills up.',
      code: { view: 'signature', lines: [1] },
      metrics: START,
      scene: { entities: scene({ keys: KEYS, buckets: emptyBuckets(START_CAP), placed: 0, bare: true, note: 'put(4), put(6), put(9)\n4 and 6 both want bucket 0' }) },
    },
    {
      chapter: 'idea',
      short: 'Overwrite',
      title: 'The obvious way: one key per bucket',
      body: 'If a bucket holds one key, line 3 of this version just replaces whatever was there. Putting `6` after `4` **erases `4`**.\n\nA lookup for `4` now fails, so the table loses data.',
      code: { view: 'snapshot', id: 'drop', lines: [3] },
      metrics: START,
      scene: {
        entities: [
          arr('keys', 0, 0, [4, 6], { label: 'keys', tones: { 0: 'done', 1: 'miss' } }),
          map('buckets', 380, 0, 'one key per bucket', [{ key: 0, value: '6', tone: 'miss' }, { key: 1, value: '—' }], { width: 150 }),
          note('note', 0, VARS_Y, '4 was here, 6 overwrote it\ndata lost', { tone: 'miss' }),
        ],
      },
    },
    {
      chapter: 'idea',
      short: 'Chains',
      title: 'Let colliding keys share a chain',
      body: 'Make each bucket a **list**. Keys that collide simply sit in the same list, one after another: bucket 0 holds `4 → 6`.\n\nTo look for a key, compute its bucket and search only that short chain.',
      code: { view: 'signature' },
      metrics: START,
      scene: { entities: scene({ keys: KEYS, buckets: [[4, 6], [9]], placed: 3, idx: 0, slotTone: 'miss', note: 'bucket 0 holds 4 → 6\nno key is lost', noteTone: 'found' }) },
    },
    {
      chapter: 'idea',
      short: 'Load factor',
      title: 'Long chains slow everything down',
      body: 'If every key lands in one chain, searching it is `O(n)`. The average chain length is the **load factor**, `size / buckets`.\n\nPast `0.75` we **double** the number of buckets and move every key to its new bucket (`key % new size`). Chains shrink again.',
      code: { view: 'signature' },
      metrics: START,
      scene: { entities: scene({ keys: KEYS, buckets: [[4, 6], [9]], placed: 3, size: 3, load: 1.5, idx: 0, slotTone: 'miss', note: '3 keys ÷ 2 buckets = 1.5\ntoo crowded: double the table', noteTone: 'miss' }) },
    },
    {
      chapter: 'build',
      short: 'Buckets',
      title: 'Lines 1–4: empty chains and a counter',
      body: 'The constructor makes one empty list per bucket and counts the stored keys in `size`. We need that count to measure the load.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4], lines: [3, 4] },
      metrics: START,
      changes: ['self.buckets = [[] for _ in range(capacity)]', 'self.size = 0'],
      scene: at(0),
    },
    {
      chapter: 'build',
      short: 'Pick chain',
      title: 'Lines 6–7: the key picks a chain',
      body: 'Line 7 is the bucket formula: `key % len(self.buckets)` is always `0 … capacity − 1`, so it names exactly one chain.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 6, 7], lines: [7] },
      metrics: START,
      changes: ['idx = key % len(self.buckets)'],
      scene: at(1),
    },
    {
      chapter: 'build',
      short: 'No repeats',
      title: 'Lines 8–9: skip a key already in the chain',
      body: 'Line 8 searches the one short chain. If the key is there, line 9 returns, so no key is stored twice.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 6, 7, 8, 9], lines: [8, 9] },
      metrics: START,
      changes: ['if key in self.buckets[idx]: return'],
      scene: at(find('Not in')),
    },
    {
      chapter: 'build',
      short: 'Append',
      title: 'Lines 10–11: add to the chain and count it',
      body: 'A collision needs no special code: line 10 just appends to the chain. Line 11 adds 1 to `size`.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 6, 7, 8, 9, 10, 11], lines: [10, 11] },
      metrics: START,
      changes: ['self.buckets[idx].append(key)', 'self.size += 1'],
      scene: at(find('Append')),
    },
    {
      chapter: 'build',
      short: 'Too full?',
      title: 'Lines 12–13: rehash past the threshold',
      body: 'Line 12 is the load factor from the idea. When it passes `0.75`, line 13 calls `_rehash`; the comment says what that buys.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 6, 7, 8, 9, 10, 11, 12, 13], lines: [12, 13] },
      metrics: START,
      changes: ['if self.size / len(self.buckets) > 0.75', 'self._rehash()'],
      scene: at(find('load 1')),
    },
    {
      chapter: 'build',
      short: 'Bigger table',
      title: 'Lines 15–17: a table twice as big',
      body: 'Line 16 keeps the old table, and line 17 builds a new one with **twice** the buckets.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 6, 7, 8, 9, 10, 11, 12, 13, 15, 16, 17], lines: [16, 17] },
      metrics: START,
      changes: ['old_buckets = self.buckets', 'self.buckets = [[] ...] * 2'],
      scene: at(find('Double')),
    },
    {
      chapter: 'build',
      short: 'Recount',
      title: 'Lines 18–20: reset the count, walk the old chains',
      body: 'Line 18 resets `size`, because every key is about to be counted again. Lines 19–20 walk each old chain, key by key.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 6, 7, 8, 9, 10, 11, 12, 13, 15, 16, 17, 18, 19, 20], lines: [18, 19, 20] },
      metrics: START,
      changes: ['self.size = 0', 'for chain in old_buckets', 'for key in chain'],
      scene: at(find('Double')),
    },
    {
      chapter: 'build',
      short: 'Re-put',
      title: 'Line 21: put every old key again',
      body: 'Each key is put into the **new** table. Its bucket is `key % new size`, which can differ from before, so the keys spread out.\n\nThat is the whole class. Now let’s run it.',
      code: { view: 'final', lines: [21] },
      metrics: START,
      changes: ['self.put(key)'],
      scene: at(RUN.length - 1),
    },
    ...RUN,
    {
      chapter: 'why',
      short: 'Recap',
      title: 'Short chains keep put and get fast',
      body: 'A put costs one `%` plus a short chain: **`O(1 + α)`**, where `α = size / buckets` stays under about 0.75. A rehash touches every key, **`O(n + m)`**, but it doubles the table, so it is rare and spreads out to `O(1)` per put.\n\nSwitch to **🧪 Try your own** to trigger rehashes.',
      code: { view: 'final', lines: [7, 12, 13] },
      metrics: FINAL_METRICS,
      scene: { entities: scene({ keys: KEYS, buckets: copy(END_BUCKETS), placed: 3, note: 'put      O(1 + α)\nrehash   O(n + m), rare\nspace    O(n + m)', noteTone: 'found' }) },
    },
    {
      chapter: 'why',
      short: 'Re-put all',
      title: 'Why line 21 puts every key again',
      body: 'After doubling, `key % len(self.buckets)` gives a **different** answer: `6 % 2 = 0` but `6 % 4 = 2`. If we just copied the chains over, a lookup would search the wrong bucket and miss.\n\nThat is the key decision: a bigger table needs a **fresh bucket for every key**, and `put` already knows how to find it.',
      code: { view: 'final', lines: [19, 20, 21] },
      values: { 21: '6 % 4 = 2, not 0' },
      metrics: FINAL_METRICS,
      scene: { entities: scene({ keys: KEYS, buckets: copy(END_BUCKETS), placed: 3, idx: 2, slotTone: 'found', note: '6 % 2 = 0 (old table)\n6 % 4 = 2 (new table)', noteTone: 'found' }) },
    },
  ],
  trace: {
    title: 'Put your own keys and watch the table grow',
    inputs: [{ name: 'keys', label: 'Keys to put (0 or more)', kind: 'numbers', default: '4, 6, 9' }],
    presets: [
      { label: 'Lesson example', values: { keys: '4, 6, 9' } },
      { label: 'All collide', values: { keys: '2, 4, 6, 8' } },
      { label: 'Duplicate key', values: { keys: '3, 3, 5' } },
      { label: 'No resize', values: { keys: '1' } },
      { label: 'Two resizes', values: { keys: '1, 2, 3, 4, 5' } },
    ],
    maxItems: 5,
    run: (values) => {
      const keys = values['keys'];
      if (!Array.isArray(keys) || keys.length === 0) throw new Error('Enter some keys.');
      if (keys.some((k) => k < 0)) throw new Error('Use keys from 0 upwards.');
      return traceChain(keys);
    },
  },
});
