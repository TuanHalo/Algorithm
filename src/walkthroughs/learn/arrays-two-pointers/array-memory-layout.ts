import { arr, defineWalkthrough, link, note, ptr, vars } from '../../../lib/walkthrough/helpers';
import { tableBesideArray } from '../../../lib/walkthrough/layout';
import type { Entity, ScalarValue, Step, Tone, VarRow } from '../../../lib/walkthrough/types';

const NEW_Y = 130;
const NOTE_Y = 240;
const SLOT = 8; // bytes per slot in the pictures
const VARS_X = tableBesideArray(8, 4);

type Slot = number | null;

/** One fixed block of memory: where it starts and what each slot holds. */
interface Block {
  /** Entity id; stays with the block when it becomes `_data`, so it slides into place. */
  readonly id: string;
  readonly base: number;
  readonly slots: readonly Slot[];
}

/**
 * `full`: line 15 found no free slot. `alloc` / `copy` / `swap`: inside `_resize`.
 * `store`: lines 17–18 wrote the value. `check` / `read`: inside `__getitem__`.
 */
type Phase = 'create' | 'room' | 'full' | 'alloc' | 'copy' | 'swap' | 'store' | 'check' | 'read';

interface MemState {
  readonly data: Block;
  /** The bigger block `_resize` is filling, drawn below `_data`. */
  readonly fresh?: Block;
  readonly size: number;
  readonly capacity: number;
  readonly phase?: Phase;
  /** Value being appended. */
  readonly value?: number;
  /** Copy loop index inside `_resize`. */
  readonly i?: number;
  /** Index being read by `__getitem__`. */
  readonly index?: number;
  readonly note?: string;
  readonly noteTone?: Tone;
  /** Hide the variables panel (before the code has them). */
  readonly bare?: boolean;
}

const show = (slots: readonly Slot[]): ScalarValue[] => slots.map((v) => (v === null ? 'None' : v));
const addresses = (b: Block): string[] => b.slots.map((_, k) => `@${b.base + k * SLOT}`);

/** Scene for one moment: the `_data` block with its addresses, a new block while resizing, and the variables. */
function scene(s: MemState): Entity[] {
  const { data, fresh, size, phase, i, index } = s;
  const dTones: Record<number, Tone> = {};
  data.slots.forEach((v, k) => (dTones[k] = v === null ? 'muted' : 'done'));
  if (phase === 'full') data.slots.forEach((_, k) => (dTones[k] = 'miss'));
  if (phase === 'store') dTones[size - 1] = 'active';
  if (phase === 'copy' && i !== undefined) dTones[i] = 'compare';
  if ((phase === 'check' || phase === 'read') && index !== undefined) dTones[index] = phase === 'read' ? 'found' : 'compare';

  const entities: Entity[] = [arr(data.id, 0, 0, show(data.slots), { label: '_data', tones: dTones, indexLabels: addresses(data), codeVar: '_data' })];
  if (fresh) {
    const fTones: Record<number, Tone> = {};
    fresh.slots.forEach((v, k) => (fTones[k] = v === null ? 'muted' : 'done'));
    if (phase === 'copy' && i !== undefined) fTones[i] = 'active';
    entities.push(arr(fresh.id, 0, NEW_Y, show(fresh.slots), { label: 'new_data', tones: fTones, indexLabels: addresses(fresh), codeVar: 'new_data' }));
    if (phase === 'copy' && i !== undefined) {
      entities.push(link('copy', { entity: data.id, index: i, side: 'bottom' }, { entity: fresh.id, index: i, side: 'top' }, { label: `copy ${data.slots[i]}`, tone: 'active', flow: true }));
    }
  }
  if (!s.bare && size < data.slots.length && phase !== 'check' && phase !== 'read') {
    entities.push(ptr('next', data.id, size, '_size', { side: 'top', tone: 'done', codeVar: '_size' }));
  }
  if ((phase === 'check' || phase === 'read') && index !== undefined) entities.push(ptr('index', data.id, index, 'index', { side: 'top', tone: 'active', codeVar: 'index' }));
  if (phase === 'copy' && i !== undefined && fresh) entities.push(ptr('i', fresh.id, i, 'i', { tone: 'active', codeVar: 'i' }));

  if (!s.bare) {
    const rows: VarRow[] = [
      { name: '_size', value: size, tone: phase === 'full' ? 'miss' : 'default' },
      { name: '_capacity', value: s.capacity, tone: phase === 'full' ? 'miss' : 'default' },
    ];
    if (s.value !== undefined) rows.push({ name: 'value', value: s.value });
    if (index !== undefined) rows.push({ name: 'index', value: index });
    entities.push(vars('vals', VARS_X, 0, rows, { label: 'variables', width: 170 }));
  }
  if (s.note) entities.push(note('note', 0, fresh ? NOTE_Y : NEW_Y, s.note, { tone: s.noteTone ?? 'note' }));
  return entities;
}

/** Fresh memory for each new block: far from the old one, so the old one can't just grow. */
const baseFor = (generation: number): number => 1000 * (generation + 1);

/** Creates a DynamicArray, appends every value and reads one index, one step per decision (chapter "run", final code). */
function traceMemory(values: readonly number[], capacity: number, readIndex: number): Step[] {
  const steps: Step[] = [];
  let appends = 0;
  let copies = 0;
  const metrics = (result: string | number = '—'): Record<string, string | number> => ({ appends, copies, result });
  let generation = 0;
  let cap = Math.max(1, capacity);
  let size = 0;
  let data: Block = { id: `block-${generation}`, base: baseFor(generation), slots: new Array<Slot>(cap).fill(null) };

  steps.push({
    chapter: 'run',
    short: 'Create',
    title: `DynamicArray(${capacity}): one block of ${cap} slot${cap === 1 ? '' : 's'}`,
    body: `Line 3: \`_capacity = ${cap}\`. Line 4: nothing stored yet, \`_size = 0\`. Line 5 reserves one block of ${cap} slot${cap === 1 ? '' : 's'}, side by side from address ${data.base}.`,
    code: { view: 'final', lines: [3, 4, 5] },
    values: { 3: `_capacity = ${cap}`, 4: '_size = 0', 5: `_data = [None] * ${cap}` },
    metrics: metrics(),
    scene: { entities: scene({ data, size, capacity: cap, phase: 'create' }) },
  });

  for (const value of values) {
    const full = size === cap;
    steps.push({
      chapter: 'run',
      short: `append(${value})`,
      title: full ? `append(${value}): the block is full` : `append(${value}): there is room`,
      body: full
        ? `Line 15: \`_size == _capacity\` (${size} == ${cap}) is true. The slot after the last one, @${data.base + cap * SLOT}, isn’t ours, so the block can’t just grow.`
        : `Line 15: \`${size} == ${cap}\` is false, so slot ${size} is free.`,
      code: { view: 'final', lines: [14, 15] },
      values: { 14: `value = ${value}`, 15: `${size} == ${cap} → ${full ? 'True' : 'False'}` },
      metrics: metrics(),
      scene: { entities: scene({ data, size, capacity: cap, phase: full ? 'full' : 'room', value }) },
    });

    if (full) {
      const newCap = cap * 2;
      generation += 1;
      let fresh: Block = { id: `block-${generation}`, base: baseFor(generation), slots: new Array<Slot>(newCap).fill(null) };
      steps.push({
        chapter: 'run',
        short: 'New block',
        title: `_resize(${newCap}): reserve a block twice as big`,
        body: `Line 16 calls \`_resize(${cap} * 2)\`. Line 21 reserves a new block of ${newCap} slots somewhere else in memory, at address ${fresh.base}.`,
        code: { view: 'final', lines: [16, 20, 21] },
        values: { 16: `_resize(${newCap})`, 21: `new_data = [None] * ${newCap}` },
        metrics: metrics(),
        scene: { entities: scene({ data, fresh, size, capacity: cap, phase: 'alloc', value }) },
      });
      for (let i = 0; i < size; i += 1) {
        const slots = [...fresh.slots];
        slots[i] = data.slots[i] ?? null;
        fresh = { ...fresh, slots };
        copies += 1;
        steps.push({
          chapter: 'run',
          short: `copy ${i}`,
          title: `Copy slot ${i}: ${data.slots[i]}`,
          body: `Line 22: \`i = ${i}\`. Line 23 copies \`_data[${i}] = ${data.slots[i]}\` from @${data.base + i * SLOT} into \`new_data[${i}]\` at @${fresh.base + i * SLOT}.`,
          code: { view: 'final', lines: [22, 23] },
          values: { 22: `i = ${i}`, 23: `new_data[${i}] = ${data.slots[i]}` },
          metrics: metrics(),
          scene: { entities: scene({ data, fresh, size, capacity: cap, phase: 'copy', i, value }) },
        });
      }
      data = fresh;
      cap = newCap;
      steps.push({
        chapter: 'run',
        short: 'Switch',
        title: `Use the new block: capacity ${cap}`,
        body: `Line 24 points \`_data\` at the new block, and line 25 sets \`_capacity = ${cap}\`. The old block is no longer used, so Python frees it.`,
        code: { view: 'final', lines: [24, 25] },
        values: { 24: `_data = block @${data.base}`, 25: `_capacity = ${cap}` },
        metrics: metrics(),
        scene: { entities: scene({ data, size, capacity: cap, phase: 'room', value }) },
      });
    }

    const slots = [...data.slots];
    slots[size] = value;
    data = { ...data, slots };
    size += 1;
    appends += 1;
    steps.push({
      chapter: 'run',
      short: `store ${value}`,
      title: `Store ${value} in slot ${size - 1}`,
      body: `Line 17: \`_data[${size - 1}] = ${value}\`, at address @${data.base + (size - 1) * SLOT}. Line 18 counts it: \`_size = ${size}\`.`,
      code: { view: 'final', lines: [17, 18] },
      values: { 17: `_data[${size - 1}] = ${value}`, 18: `_size = ${size}` },
      metrics: metrics(),
      scene: { entities: scene({ data, size, capacity: cap, phase: 'store', value }) },
    });
  }

  steps.push({
    chapter: 'run',
    short: `read [${readIndex}]`,
    title: `arr[${readIndex}]: is ${readIndex} inside the array?`,
    body: `Reading \`arr[${readIndex}]\` calls \`__getitem__\`. Line 8: \`0 <= ${readIndex} < ${size}\` is true, so no \`IndexError\` on line 9.`,
    code: { view: 'final', lines: [7, 8] },
    values: { 7: `index = ${readIndex}`, 8: `not 0 <= ${readIndex} < ${size} → False` },
    metrics: metrics(),
    scene: { entities: scene({ data, size, capacity: cap, phase: 'check', index: readIndex }) },
  });
  const got = data.slots[readIndex] ?? 0;
  const address = data.base + readIndex * SLOT;
  steps.push({
    chapter: 'run',
    short: `Return ${got}`,
    title: `One jump to @${address}: return ${got}`,
    body: `Line 10 doesn’t walk the block: the slot’s address is \`${data.base} + ${readIndex} × ${SLOT} = ${address}\`, so it reads ${got} in one step. Lines 11–12 return **${got}**.`,
    code: { view: 'final', lines: [10, 11, 12] },
    values: { 10: `@${data.base} + ${readIndex} * ${SLOT} = @${address} → ${got}`, 12: `return ${got}` },
    metrics: metrics(got),
    scene: { entities: scene({ data, size, capacity: cap, phase: 'read', index: readIndex }) },
  });
  return steps;
}

const VALUES = [10, 20, 30, 40, 50] as const;
const RUN = traceMemory(VALUES, 2, 3);
const startMetrics = { appends: 0, copies: 0, result: '—' } as const;
const FINAL_METRICS = RUN.at(-1)?.metrics ?? startMetrics;
const BUILD_END = 12;
/** Scene of run step n (0-based), so build steps show the moment they describe. */
const at = (n: number): Step['scene'] => RUN[n]?.scene ?? { entities: [] };
/** First run step whose short label is `short`. */
const find = (short: string): number => RUN.findIndex((s) => s.short === short);
const FULL: Block = { id: 'block-0', base: 1000, slots: [10, 20] };
const FOUR: Block = { id: 'block-1', base: 2000, slots: [10, 20, 30, 40] };

export default defineWalkthrough({
  id: 'learn/arrays-two-pointers/array-memory-layout',
  title: 'Arrays in Memory, one block and a doubling trick',
  summary: 'From the idea to the code: why arr[i] is one jump in memory, and how a dynamic array keeps append fast by doubling its block when it fills up.',
  minutes: 8,
  code: {
    lang: 'python',
    source: `class DynamicArray:
    def __init__(self, capacity: int = 2) -> None:
        self._capacity = max(1, capacity)
        self._size = 0
        self._data: list[int | None] = [None] * self._capacity  # One block

    def __getitem__(self, index: int) -> int:
        if not 0 <= index < self._size:
            raise IndexError("Array index out of bounds")
        value = self._data[index]  # Address = start + index * slot size
        assert value is not None  # Slots below _size are always filled
        return value

    def append(self, value: int) -> None:
        if self._size == self._capacity:
            self._resize(self._capacity * 2)  # Double, so copies stay rare
        self._data[self._size] = value
        self._size += 1

    def _resize(self, new_capacity: int) -> None:
        new_data: list[int | None] = [None] * new_capacity
        for i in range(self._size):
            new_data[i] = self._data[i]
        self._data = new_data
        self._capacity = new_capacity`,
  },
  snapshots: {
    brute: `def append(self, value: int) -> None:
    new_data = [None] * (self._size + 1)  # Room for exactly one more
    for i in range(self._size):
        new_data[i] = self._data[i]  # Copy everything, every time
    new_data[self._size] = value
    self._data = new_data
    self._size += 1`,
  },
  metrics: [
    { key: 'appends', label: 'Appends' },
    { key: 'copies', label: 'Copies' },
    { key: 'result', label: 'Returns' },
  ],
  legend: [
    { tone: 'active', label: 'being written' },
    { tone: 'compare', label: 'being read' },
    { tone: 'done', label: 'stored' },
    { tone: 'muted', label: 'free slot' },
    { tone: 'miss', label: 'block full' },
    { tone: 'found', label: 'returned' },
  ],
  goals: [
    { text: 'See why arr[i] is one jump in memory', step: 2 },
    { text: 'See why growing one slot at a time is O(n²)', step: 3 },
    { text: 'Double the block so copies stay rare', step: 4 },
    { text: 'Follow every append, copy and read', step: BUILD_END + 1 },
    { text: 'Know why the block doubles instead of adding a slot', step: BUILD_END + RUN.length + 2 },
  ],
  steps: [
    {
      chapter: 'problem',
      short: 'The brief',
      title: 'A list that reads fast and keeps growing',
      body: 'Like a row of identical lockers: knowing where the first one is and how wide they are, you can walk straight to locker 42.\n\n`DynamicArray` must read `arr[i]` instantly and accept `append(value)` forever, but memory comes in **fixed blocks**: this one has 2 slots, and both are taken.',
      code: { view: 'signature', lines: [1, 2] },
      metrics: startMetrics,
      scene: { entities: scene({ data: FULL, size: 2, capacity: 2, bare: true, note: 'append(30)? the block has no free slot' }) },
    },
    {
      chapter: 'idea',
      short: 'One jump',
      title: 'Equal slots side by side: an address is arithmetic',
      body: 'All slots are the same size (8 bytes here) and sit next to each other, so slot `i` lives at **`start + i × 8`**. Slot 3 of a block at 2000 is at `2000 + 3 × 8 = 2024`.\n\nNo walking past slots 0–2: reading any index is one calculation, **`O(1)`**.',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: {
        entities: [
          arr('block-1', 0, 0, show(FOUR.slots), { label: '_data', tones: { 3: 'compare' }, indexLabels: addresses(FOUR), codeVar: '_data' }),
          ptr('index', 'block-1', 3, 'index', { side: 'top', tone: 'active', codeVar: 'index' }),
          note('note', 0, NEW_Y, 'slot i lives at start + i × 8\nslot 3 → 2000 + 3 × 8 = 2024\none calculation, no walking'),
        ],
      },
    },
    {
      chapter: 'idea',
      short: 'Grow by 1',
      title: 'The obvious way: a new block one slot bigger',
      body: 'A full block can’t grow: the next address belongs to something else. So lines 2–4 reserve a block with one more slot and copy everything over, on **every** append.\n\nAppending `n` values copies `0 + 1 + 2 + … + (n − 1) ≈ n²/2` values: **`O(n²)`**.',
      code: { view: 'snapshot', id: 'brute', lines: [2, 3, 4] },
      metrics: startMetrics,
      scene: {
        entities: [
          arr('block-0', 0, 0, show(FULL.slots), { label: '_data', tones: { 0: 'compare', 1: 'compare' }, indexLabels: addresses(FULL), codeVar: '_data' }),
          arr('block-1', 0, NEW_Y, ['10', '20', 'None'], { label: 'new_data', tones: { 2: 'muted' }, indexLabels: ['@2000', '@2008', '@2016'], codeVar: 'new_data' }),
          link('copy', { entity: 'block-0', index: 0, side: 'bottom' }, { entity: 'block-1', index: 0, side: 'top' }, { tone: 'miss', dashed: true }),
          link('copy-2', { entity: 'block-0', index: 1, side: 'bottom' }, { entity: 'block-1', index: 1, side: 'top' }, { tone: 'miss', dashed: true }),
          note('note', 0, NOTE_Y, 'every append copies every value\n1,000 appends ≈ 500,000 copies', { tone: 'miss' }),
        ],
      },
    },
    {
      chapter: 'idea',
      short: 'Double',
      title: 'Double the block when it fills',
      body: 'Copy only when the block is full, and then make it **twice** as big. The copies come at sizes 1, 2, 4, 8, … and add up to **less than `2n`** for `n` appends.\n\nSpread over all appends, that’s fewer than 2 copies each: **amortized `O(1)`**.',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: {
        entities: [
          arr('block-1', 0, 0, ['10', '20', '30', 'None'], { label: '_data', tones: { 0: 'done', 1: 'done', 2: 'done', 3: 'muted' }, indexLabels: addresses(FOUR), codeVar: '_data' }),
          note('note', 0, NEW_Y, 'capacity 2 → 4 → 8 → 16 …\ncopies: 2 + 4 + 8 + … < 2n\n→ under 2 copies per append'),
        ],
      },
    },
    {
      chapter: 'build',
      short: 'Block',
      title: 'Lines 1–2 and 5: one block of slots',
      body: '`__init__` reserves a single block of `capacity` slots, all empty (`None`). Python’s own `list` works the same way underneath.',
      code: { view: 'reveal', reveal: [1, 2, 5], lines: [5] },
      metrics: startMetrics,
      changes: ['self._data = [None] * self._capacity'],
      scene: at(0),
    },
    {
      chapter: 'build',
      short: 'Size',
      title: 'Lines 3–4: capacity vs size',
      body: '`_capacity` is how many slots the block has; `_size` is how many are used. The next append goes into slot `_size` (the pin above the block).',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5], lines: [3, 4] },
      metrics: startMetrics,
      changes: ['self._capacity = max(1, capacity)', 'self._size = 0'],
      scene: at(0),
    },
    {
      chapter: 'build',
      short: 'Bounds',
      title: 'Lines 7–9: only read slots that hold a value',
      body: 'Slots at or past `_size` are empty, and negative indexes aren’t allowed here, so line 9 raises an `IndexError` for them.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5, 7, 8, 9], lines: [8, 9] },
      metrics: startMetrics,
      changes: ['if not 0 <= index < self._size: raise IndexError'],
      scene: at(RUN.length - 2),
    },
    {
      chapter: 'build',
      short: 'Read',
      title: 'Lines 10–12: one jump to the slot',
      body: 'Line 10 is the address formula from the idea: the slot is found by arithmetic, not by walking. Line 11 just documents that a used slot is never `None`.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12], lines: [10, 11, 12] },
      metrics: startMetrics,
      changes: ['value = self._data[index]', 'return value'],
      scene: at(RUN.length - 1),
    },
    {
      chapter: 'build',
      short: 'Full?',
      title: 'Lines 14–16: double the block when it’s full',
      body: 'Line 15 checks for a free slot. Only when there is none does line 16 resize, to **twice** the capacity (the comment says why).',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12, 14, 15, 16], lines: [15, 16] },
      metrics: startMetrics,
      changes: ['if self._size == self._capacity', 'self._resize(self._capacity * 2)'],
      scene: at(find('append(30)')),
    },
    {
      chapter: 'build',
      short: 'Store',
      title: 'Lines 17–18: write into the next free slot',
      body: 'Line 17 writes the value into slot `_size`, and line 18 counts it.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12, 14, 15, 16, 17, 18], lines: [17, 18] },
      metrics: startMetrics,
      changes: ['self._data[self._size] = value', 'self._size += 1'],
      scene: at(find('store 10')),
    },
    {
      chapter: 'build',
      short: 'New block',
      title: 'Lines 20–22: a bigger block, somewhere else',
      body: '`_resize` reserves a new, bigger block. It lives at a different address, so line 22 walks every used slot to copy it over.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12, 14, 15, 16, 17, 18, 20, 21, 22], lines: [21, 22] },
      metrics: startMetrics,
      changes: ['new_data = [None] * new_capacity', 'for i in range(self._size)'],
      scene: at(find('New block')),
    },
    {
      chapter: 'build',
      short: 'Copy',
      title: 'Lines 23–25: copy, then switch blocks',
      body: 'Line 23 copies one slot. Lines 24–25 then point `_data` at the new block and update the capacity; the old block is freed.\n\nThat’s the whole class. Now let’s run it.',
      code: { view: 'final', lines: [23, 24, 25] },
      metrics: startMetrics,
      changes: ['new_data[i] = self._data[i]', 'self._data = new_data', 'self._capacity = new_capacity'],
      scene: at(find('copy 0')),
    },
    ...RUN,
    {
      chapter: 'why',
      short: 'Recap',
      title: 'Reads are O(1); appends are O(1) on average',
      body: 'A read is one address calculation: **`O(1)`**. An append is usually one write; now and then it copies the whole block, but the copies add up to less than `2n`, so appends cost **amortized `O(1)`**. A single resize is still `O(n)`, and the block can be up to twice the data: `O(n)` space.\n\nSwitch to **🧪 Try your own** to append your own values.',
      code: { view: 'final', lines: [10, 15, 16] },
      metrics: FINAL_METRICS,
      scene: { entities: scene({ ...lastState(), note: '5 appends → 2 + 4 = 6 copies\nn appends → fewer than 2n copies', noteTone: 'found' }) },
    },
    {
      chapter: 'why',
      short: 'Why double',
      title: 'Why line 16 doubles instead of adding one slot',
      body: 'Growing by one slot copies everything on every append: 1,000 appends cost about **500,000** copies. Doubling copies at 2, 4, 8, …, 512 slots: about **1,000** copies in total.\n\nThat is the key decision: growing by a **factor** (×2 here; CPython uses about ×1.125) keeps the copies proportional to `n`.',
      code: { view: 'final', lines: [15, 16] },
      values: { 16: 'capacity × 2: copies stay below 2n' },
      metrics: FINAL_METRICS,
      scene: { entities: scene({ ...lastState(), note: '1,000 appends:\n+1 slot  → ≈ 500,000 copies\n× 2      → ≈ 1,000 copies' }) },
    },
  ],
  trace: {
    title: 'Append your own values to a dynamic array',
    inputs: [
      { name: 'values', label: 'Values to append', kind: 'numbers', default: '7, 3, 9, 1, 4, 6' },
      { name: 'capacity', label: 'Starting capacity (1–4)', kind: 'number', default: '1' },
      { name: 'index', label: 'Index to read at the end', kind: 'number', default: '4' },
    ],
    presets: [
      { label: 'Lesson example', values: { values: '10, 20, 30, 40, 50', capacity: '2', index: '3' } },
      { label: 'Never full', values: { values: '5, 6, 7', capacity: '4', index: '0' } },
      { label: 'Exactly full', values: { values: '1, 2, 3, 4', capacity: '4', index: '3' } },
      { label: 'Starts at 1', values: { values: '8, 6, 4, 2, 1', capacity: '1', index: '4' } },
    ],
    maxItems: 8,
    run: (values) => {
      const items = values['values'];
      const capacity = values['capacity'];
      const index = values['index'];
      if (!Array.isArray(items) || items.length === 0 || typeof capacity !== 'number' || typeof index !== 'number') throw new Error('Enter some values, a capacity and an index.');
      if (capacity < 1 || capacity > 4) throw new Error('Use a starting capacity from 1 to 4.');
      let cap = capacity;
      while (cap < items.length) cap *= 2;
      if (cap > 10) throw new Error(`That grows the block to ${cap} slots, too wide for the stage. Use fewer values or another capacity.`);
      if (index < 0 || index >= items.length) throw new Error(`Read an index from 0 to ${items.length - 1}.`);
      return traceMemory(items, capacity, index);
    },
  },
});

/** The state after the story run: 5 values in an 8-slot block at 3000. */
function lastState(): MemState {
  return { data: { id: 'block-2', base: 3000, slots: [10, 20, 30, 40, 50, null, null, null] }, size: 5, capacity: 8, phase: 'room' };
}
