import { arr, defineWalkthrough, link, note, ptr, vars } from '../../../lib/walkthrough/helpers';
import { tableBesideArray } from '../../../lib/walkthrough/layout';
import type { Entity, ScalarValue, Step, Tone, VarRow } from '../../../lib/walkthrough/types';

const KEYS_Y = 130;
const NOTE_Y = 270;

type Slot = number | null;

interface ProbeState {
  /** The keys that `put` is called with, in order. */
  readonly keys: readonly number[];
  readonly slots: readonly Slot[];
  /** Index in `keys` of the running `put`. */
  readonly at?: number;
  /** Keys before this index have been handled. */
  readonly placed: number;
  readonly key?: number;
  readonly step?: number;
  readonly idx?: number;
  /** Slots already tried for the current key. */
  readonly tried?: readonly number[];
  readonly idxTone?: Tone;
  readonly look?: { readonly label: string; readonly tone: Tone; readonly flow?: boolean };
  readonly note?: string;
  readonly noteTone?: Tone;
  /** Hide the variables (before the code has them). */
  readonly bare?: boolean;
}

const dash = (v: ScalarValue | undefined): ScalarValue => v ?? '—';
const mute = (v: ScalarValue | undefined): Tone => (v === undefined ? 'muted' : 'default');
/** Python's `%`: the result takes the sign of the divisor. */
const pmod = (a: number, m: number): number => ((a % m) + m) % m;

/** Scene: the table as one flat array, the keys to put, and the variables. */
function scene(s: ProbeState): Entity[] {
  const m = s.slots.length;
  const tones: Record<number, Tone> = {};
  s.slots.forEach((v, i) => (tones[i] = v === null ? 'default' : 'done'));
  for (const t of s.tried ?? []) tones[t] = 'miss';
  if (s.idx !== undefined) tones[s.idx] = s.idxTone ?? 'compare';
  const entities: Entity[] = [arr('slots', 0, 0, s.slots.map((v) => (v === null ? '—' : v)), { label: 'slots', tones, codeVar: 'slots' })];
  if (s.idx !== undefined) entities.push(ptr('idx', 'slots', s.idx, 'idx', { side: 'top', tone: s.idxTone ?? 'compare', codeVar: 'idx' }));
  const kTones: Record<number, Tone> = {};
  for (let i = 0; i < s.placed; i += 1) kTones[i] = 'done';
  if (s.at !== undefined) kTones[s.at] = 'active';
  entities.push(arr('keys', 0, KEYS_Y, s.keys, { label: 'keys to put', tones: kTones }));
  if (s.at !== undefined) entities.push(ptr('cursor', 'keys', s.at, 'key', { side: 'bottom', tone: 'active', codeVar: 'key' }));
  if (!s.bare) {
    const rows: VarRow[] = [
      { name: 'key', value: dash(s.key), tone: mute(s.key) },
      { name: 'step', value: dash(s.step), tone: mute(s.step) },
      { name: 'idx', value: dash(s.idx), tone: mute(s.idx) },
    ];
    entities.push(vars('vals', tableBesideArray(m, 3), 0, rows, { label: 'variables', width: 170 }));
  }
  if (s.look && s.idx !== undefined) {
    entities.push(link('look', { entity: 'vals', key: 'idx' }, { entity: 'slots', index: s.idx, side: 'right' }, { tone: s.look.tone, label: s.look.label, flow: s.look.flow ?? false, dashed: s.look.tone === 'miss' }));
  }
  if (s.note) entities.push(note('note', 0, NOTE_Y, s.note, { tone: s.noteTone ?? 'note' }));
  return entities;
}

/** `put` for every key with linear probing, one step per decision (chapter "run", final code). */
function traceProbe(keys: readonly number[], capacity: number): Step[] {
  const steps: Step[] = [];
  const slots: Slot[] = new Array<Slot>(capacity).fill(null);
  let stored = 0;
  let probes = 0;
  let result: string | number = '—';
  const metrics = (): Record<string, string | number> => ({ stored, probes, result });
  const frame = (extra: Partial<ProbeState>): Entity[] => scene({ keys, slots: [...slots], placed: 0, ...extra });
  const push = (s: Omit<Step, 'chapter' | 'code' | 'metrics' | 'scene'> & { lines: number[]; entities: Entity[] }): void => {
    const { lines, entities, ...rest } = s;
    steps.push({ ...rest, chapter: 'run', code: { view: 'final', lines }, metrics: metrics(), scene: { entities } });
  };

  push({
    short: 'Create',
    title: `OpenAddressTable(): ${capacity} empty slots`,
    body: `Lines 2–3 make one flat array of ${capacity} slots. \`None\` means empty. There are no lists: every key lives in a slot.`,
    lines: [2, 3],
    values: { 3: `slots = [None] * ${capacity}` },
    entities: frame({}),
  });

  keys.forEach((key, at) => {
    const tried: number[] = [];
    const base = { at, placed: at, key };
    let done = false;
    for (let step = 0; step < capacity && !done; step += 1) {
      const idx = pmod(key + step, capacity);
      probes += 1;
      push({
        short: step === 0 ? `put ${key}` : `step ${step}`,
        title: step === 0 ? `put(${key}): home slot ${key} % ${capacity} = ${idx}` : `Probe step ${step}: slot ${idx}`,
        body:
          step === 0
            ? `Line 6: \`step = 0\`. Line 7: \`idx = (${key} + 0) % ${capacity} = ${idx}\`, the key's **home slot**.`
            : `Line 6: \`step = ${step}\`. Line 7: \`idx = (${key} + ${step}) % ${capacity} = ${idx}\`. Each failed try moves one slot to the right, wrapping at the end.`,
        lines: [6, 7],
        values: { 6: `step = ${step}`, 7: `idx = (${key} + ${step}) % ${capacity} = ${idx}` },
        entities: frame({ ...base, step, idx, tried: [...tried] }),
      });
      const slot = slots[idx] ?? null;
      push({
        short: slot === null ? 'Empty' : 'Taken',
        title: slot === null ? `Slot ${idx} is empty` : `Slot ${idx} is taken by ${slot}`,
        body: slot === null ? `Line 8: \`slots[${idx}] is None\` is true, so ${key} can go here.` : `Line 8: \`slots[${idx}]\` holds ${slot}, so it is not free.`,
        lines: [8],
        values: { 8: `slots[${idx}] is None → ${slot === null ? 'True' : 'False'}` },
        entities: frame({ ...base, step, idx, tried: [...tried], idxTone: slot === null ? 'active' : 'miss', ...(slot === null ? {} : { look: { label: `${key}? taken`, tone: 'miss' as Tone } }) }),
      });
      if (slot === null) {
        slots[idx] = key;
        stored += 1;
        push({
          short: 'Store',
          title: `Store ${key} in slot ${idx}`,
          body: `Line 9 writes \`slots[${idx}] = ${key}\`.`,
          lines: [9],
          values: { 9: `slots[${idx}] = ${key}` },
          changes: [`slots[${idx}] = ${key}`],
          entities: frame({ ...base, step, idx, tried: [...tried], idxTone: 'active' }),
        });
        result = idx;
        push({
          short: `Return ${idx}`,
          title: `put(${key}) returns ${idx}`,
          body: `Line 10 returns the slot, **${idx}**, after ${step + 1} probe${step === 0 ? '' : 's'}.`,
          lines: [10],
          values: { 10: `return ${idx}` },
          changes: [`return ${idx}`],
          entities: frame({ ...base, placed: at + 1, step, idx, tried: [...tried], idxTone: 'found', look: { label: `${key} → slot ${idx}`, tone: 'found', flow: true } }),
        });
        done = true;
      } else if (slot === key) {
        push({
          short: 'Same key',
          title: `${slot} == ${key}: already stored`,
          body: `Line 11: \`slots[${idx}] == ${key}\` is true, so this key is already in the table.`,
          lines: [11],
          values: { 11: `${slot} == ${key} → True` },
          entities: frame({ ...base, step, idx, tried: [...tried], idxTone: 'found' }),
        });
        result = idx;
        push({
          short: `Return ${idx}`,
          title: `Nothing to add: return ${idx}`,
          body: `Line 12 returns the slot of the existing key, **${idx}**, without writing again.`,
          lines: [12],
          values: { 12: `return ${idx}` },
          changes: [`return ${idx}`],
          entities: frame({ ...base, placed: at + 1, step, idx, tried: [...tried], idxTone: 'found', look: { label: `${key} → slot ${idx}`, tone: 'found', flow: true } }),
        });
        done = true;
      } else {
        push({
          short: 'Other key',
          title: `${slot} != ${key}: keep probing`,
          body: `Line 11: \`${slot} == ${key}\` is false. A different key sits here, so the loop goes on to the next step.`,
          lines: [11],
          values: { 11: `${slot} == ${key} → False` },
          entities: frame({ ...base, step, idx, tried: [...tried], idxTone: 'miss' }),
        });
        tried.push(idx);
      }
    }
    if (!done) {
      result = -1;
      push({
        short: 'Full',
        title: `Every slot was tried: return -1`,
        body: `The loop on line 6 ran ${capacity} steps and every slot was taken by another key. Line 13 returns **-1**: the table is full.`,
        lines: [6, 13],
        values: { 13: 'return -1' },
        changes: ['return -1'],
        entities: frame({ ...base, placed: at + 1, tried: [...tried], note: 'every slot is taken\nput gives up: return -1', noteTone: 'miss' }),
      });
    }
  });
  const last = steps.length - 1;
  const lastStep = steps[last];
  if (lastStep) steps[last] = { ...lastStep, metrics: { stored, probes, result } };
  return steps;
}

const KEYS = [7, 12, 2, 7] as const;
const CAP = 5;
const RUN = traceProbe(KEYS, CAP);
const START = { stored: 0, probes: 0, result: '—' } as const;
const FINAL_METRICS = RUN.at(-1)?.metrics ?? START;
const at = (n: number): Step['scene'] => RUN[n]?.scene ?? { entities: [] };
const find = (short: string): number => RUN.findIndex((s) => s.short === short);
const BUILD_END = 1 + 3 + 6;
const ROW: readonly Slot[] = [null, null, 7, 12, 2];

export default defineWalkthrough({
  id: 'learn/hashing/open-addressing',
  title: 'Open Addressing, find the next free slot',
  summary: 'From the problem to the idea to the code: keep every key in one flat array and, when its slot is taken, probe the next one until a free slot appears.',
  minutes: 9,
  code: {
    lang: 'python',
    source: `class OpenAddressTable:
    def __init__(self, capacity: int = 8) -> None:
        self.slots: list[int | None] = [None] * capacity

    def put(self, key: int) -> int:
        for step in range(len(self.slots)):
            idx = (key + step) % len(self.slots)
            if self.slots[idx] is None:
                self.slots[idx] = key
                return idx
            if self.slots[idx] == key:
                return idx  # Already stored
        return -1  # Every slot is taken`,
  },
  snapshots: {
    drop: `def put(self, key: int) -> int:
    idx = key % len(self.slots)
    self.slots[idx] = key  # A taken slot is overwritten
    return idx`,
  },
  metrics: [
    { key: 'stored', label: 'Keys stored' },
    { key: 'probes', label: 'Slots probed' },
    { key: 'result', label: 'put returns' },
  ],
  legend: [
    { tone: 'active', label: 'current key / written' },
    { tone: 'compare', label: 'slot being probed' },
    { tone: 'done', label: 'stored' },
    { tone: 'miss', label: 'taken by another key' },
    { tone: 'found', label: 'slot found' },
  ],
  goals: [
    { text: 'See why a taken slot cannot be overwritten', step: 2 },
    { text: 'Probe the next slot, wrapping around', step: 3 },
    { text: 'Know why the table must not fill up', step: 4 },
    { text: 'Follow every probe, store and repeat', step: BUILD_END + 1 },
    { text: 'Know why the loop stops after `capacity` steps', step: BUILD_END + RUN.length + 2 },
  ],
  steps: [
    {
      chapter: 'problem',
      short: 'The brief',
      title: 'Store keys in a flat array, with no lists',
      body: 'We have one array of 5 slots and no room for chains. `7 % 5` and `12 % 5` are both `2`, so the second key finds its home slot **already taken**.\n\n`put(key)` must still place every key and return the slot it ended up in.',
      code: { view: 'signature', lines: [1] },
      metrics: START,
      scene: { entities: scene({ keys: KEYS, slots: ROW.map(() => null), placed: 0, bare: true, note: 'put(7), put(12): both want slot 2' }) },
    },
    {
      chapter: 'idea',
      short: 'Overwrite',
      title: 'The obvious way: use the home slot only',
      body: 'Put `key % 5` and be done. Line 3 of this version overwrites whatever is in the slot.\n\nPutting `12` after `7` **erases 7**, so the table silently loses keys.',
      code: { view: 'snapshot', id: 'drop', lines: [3] },
      metrics: START,
      scene: {
        entities: [
          arr('slots', 0, 0, ['—', '—', 12, '—', '—'], { label: 'slots', tones: { 2: 'miss' } }),
          note('note', 0, KEYS_Y, '7 sat in slot 2, 12 overwrote it\nthe key 7 is lost', { tone: 'miss' }),
        ],
      },
    },
    {
      chapter: 'idea',
      short: 'Probe',
      title: 'If the slot is taken, try the next one',
      body: 'Try slot `(key + step) % 5` for `step = 0, 1, 2, …`. Step 0 is the home slot, and each failed try slides **one slot to the right**.\n\nThe `% 5` wraps past the last slot back to slot 0. Reading follows the same path, so a key is always found where probing put it.',
      code: { view: 'signature' },
      metrics: START,
      scene: { entities: scene({ keys: KEYS, slots: ROW, placed: 4, tried: [2], idx: 3, idxTone: 'active', note: '12: slot 2 taken → try 3 (free)\nidx = (key + step) % 5', noteTone: 'note' }) },
    },
    {
      chapter: 'idea',
      short: 'Crowding',
      title: 'Filled slots make the next probes longer',
      body: 'Taken slots bunch together, and a key whose home is inside a bunch walks to its end. The fuller the array, the longer that walk.\n\nWith every slot taken the walk never ends, so the loop is capped at `capacity` steps and the table reports it is full.',
      code: { view: 'signature' },
      metrics: START,
      scene: { entities: scene({ keys: KEYS, slots: [3, 4, 5, 1, 2], placed: 4, tried: [0, 1, 2, 3, 4], note: 'full table: 5 probes, no free slot\nso put returns -1', noteTone: 'miss' }) },
    },
    {
      chapter: 'build',
      short: 'Slots',
      title: 'Lines 1–3: one flat array',
      body: 'The constructor makes `capacity` slots. `None` marks an empty one, and every key will live **inside** this array.',
      code: { view: 'reveal', reveal: [1, 2, 3], lines: [3] },
      metrics: START,
      changes: ['self.slots = [None] * capacity'],
      scene: at(0),
    },
    {
      chapter: 'build',
      short: 'Probe idx',
      title: 'Lines 5–7: the probe formula',
      body: 'Line 6 counts `step` from 0 up to `capacity − 1`, so no slot is tried twice. Line 7 is the formula from the idea: home slot plus `step`, wrapped with `%`.',
      code: { view: 'reveal', reveal: [1, 2, 3, 5, 6, 7], lines: [6, 7] },
      metrics: START,
      changes: ['for step in range(len(self.slots))', 'idx = (key + step) % len(self.slots)'],
      scene: at(1),
    },
    {
      chapter: 'build',
      short: 'Free slot',
      title: 'Lines 8–10: take a free slot',
      body: 'If the probed slot is `None`, line 9 writes the key there and line 10 returns where it went.',
      code: { view: 'reveal', reveal: [1, 2, 3, 5, 6, 7, 8, 9, 10], lines: [8, 9, 10] },
      metrics: START,
      changes: ['if self.slots[idx] is None', 'self.slots[idx] = key', 'return idx'],
      scene: at(find('Store')),
    },
    {
      chapter: 'build',
      short: 'Repeat?',
      title: 'Lines 11–12: the key is already here',
      body: 'A taken slot may hold the **same** key. Then line 12 returns that slot and writes nothing, so a key never appears twice.',
      code: { view: 'reveal', reveal: [1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 12], lines: [11, 12] },
      metrics: START,
      changes: ['if self.slots[idx] == key', 'return idx'],
      scene: at(find('Same key')),
    },
    {
      chapter: 'build',
      short: 'Keep going',
      title: 'A different key: the loop goes on',
      body: 'If the slot holds another key, neither `if` fires and the `for` loop moves to the next `step`: that is the probing. Nothing extra is needed.',
      code: { view: 'reveal', reveal: [1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 12], lines: [6, 11] },
      metrics: START,
      changes: ['(loop continues)'],
      scene: at(find('Other key')),
    },
    {
      chapter: 'build',
      short: 'Full',
      title: 'Line 13: no free slot',
      body: 'If the loop tries every slot without success, the table is full and line 13 returns `-1`.\n\nThat is the whole class. Now let’s run it.',
      code: { view: 'final', lines: [13] },
      metrics: START,
      changes: ['return -1'],
      scene: at(RUN.length - 1),
    },
    ...RUN,
    {
      chapter: 'why',
      short: 'Recap',
      title: 'Fast while the table has room',
      body: 'With plenty of free slots a key finds one after a few probes: about **`O(1)`**. In a crowded table the probe walks across a whole bunch, up to **`O(n)`**. The slots are the only storage: `O(m)` space, with no pointers.\n\nSwitch to **🧪 Try your own** to fill a table up.',
      code: { view: 'final', lines: [6, 7, 8] },
      metrics: FINAL_METRICS,
      scene: { entities: scene({ keys: KEYS, slots: ROW, placed: 4, note: 'room to spare  ≈ O(1)\ncrowded table   up to O(n)\nspace           O(m)', noteTone: 'found' }) },
    },
    {
      chapter: 'why',
      short: 'Why step',
      title: 'Why the loop runs `step` up to capacity',
      body: 'Each `step` visits a **new** slot, and after `capacity` steps every slot has been visited once. So if a free slot exists the loop is sure to find it, and if none exists it ends instead of looping forever.\n\nThat is the key decision: probing a fixed, wrapping sequence makes the search both **complete** and **finite**.',
      code: { view: 'final', lines: [6, 7, 13] },
      values: { 7: '(key + step) % 5 visits all 5 slots' },
      metrics: FINAL_METRICS,
      scene: { entities: scene({ keys: KEYS, slots: ROW, placed: 4, note: 'step 0..4 → 5 different slots\nfree slot found, or give up', noteTone: 'found' }) },
    },
  ],
  trace: {
    title: 'Put your own keys into a flat table',
    inputs: [
      { name: 'keys', label: 'Keys to put', kind: 'numbers', default: '7, 12, 2, 7' },
      { name: 'capacity', label: 'Slots (3–8)', kind: 'number', default: '5' },
    ],
    presets: [
      { label: 'Lesson example', values: { keys: '7, 12, 2, 7', capacity: '5' } },
      { label: 'No collision', values: { keys: '0, 1, 2', capacity: '5' } },
      { label: 'Wraps around', values: { keys: '4, 9, 14', capacity: '5' } },
      { label: 'Table full', values: { keys: '1, 4, 7, 2', capacity: '3' } },
      { label: 'Negative key', values: { keys: '-3, 2', capacity: '5' } },
    ],
    maxItems: 6,
    run: (values) => {
      const keys = values['keys'];
      const capacity = values['capacity'];
      if (!Array.isArray(keys) || keys.length === 0 || typeof capacity !== 'number') throw new Error('Enter some keys and a number of slots.');
      if (capacity < 3 || capacity > 8) throw new Error('Use 3 to 8 slots so the table fits the stage.');
      return traceProbe(keys, capacity);
    },
  },
});
