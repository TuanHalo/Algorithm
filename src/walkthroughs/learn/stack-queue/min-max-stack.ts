import { arr, defineWalkthrough, note, ptr, vars } from '../../../lib/walkthrough/helpers';
import { tableBesideArray } from '../../../lib/walkthrough/layout';
import type { Entity, ScalarValue, Step, Tone, VarRow } from '../../../lib/walkthrough/types';

const MIN_Y = 100;
const MAX_Y = 210;
const NOTE_Y = 370;
const ROWS = 6;

/** One stack entry `(val, min so far, max so far)`. `key` is its push number, shared by all three rows. */
interface Entry {
  readonly key: string;
  readonly val: number;
  readonly min: number;
  readonly max: number;
}

/**
 * `push`: a new entry was appended. `check`: a guard found entries. `empty`: a guard found none.
 * `peek`: line 10 read the top's cache. `newmin` / `newmax`: lines 11 / 12. `min` / `max`: a query's answer.
 * `popped`: line 18 removed the top. `raise`: an IndexError ended the program.
 */
type Phase = 'create' | 'push' | 'check' | 'empty' | 'peek' | 'newmin' | 'newmax' | 'min' | 'max' | 'popped' | 'raise';

interface MinMaxState {
  readonly entries: readonly Entry[];
  /** Widest the stack gets in this run, so the variables panel never moves. */
  readonly width: number;
  readonly phase?: Phase;
  readonly val?: number;
  readonly currMin?: number;
  readonly currMax?: number;
  readonly newMin?: number;
  readonly newMax?: number;
  readonly returns?: ScalarValue;
  readonly note?: string;
  readonly noteTone?: Tone;
}

/** Scene for one moment: the stack's values with their cached min and max rows, the `top` pin, and the variables. */
function scene(s: MinMaxState): Entity[] {
  const { entries, phase } = s;
  const top = entries.length - 1;
  const entities: Entity[] = [];
  if (entries.length === 0) {
    entities.push(arr('stack', 0, 0, ['—'], { label: 'stack', tones: { 0: phase === 'empty' || phase === 'raise' ? 'miss' : 'muted' }, showIndex: false, itemKeys: ['empty'], codeVar: 'stack' }));
  } else {
    const keys = entries.map((e) => e.key);
    const vTones: Record<number, Tone> = {};
    const minTones: Record<number, Tone> = {};
    const maxTones: Record<number, Tone> = {};
    entries.forEach((_, k) => {
      vTones[k] = 'done';
      minTones[k] = 'done';
      maxTones[k] = 'done';
    });
    if (phase === 'push') {
      vTones[top] = 'active';
      minTones[top] = 'active';
      maxTones[top] = 'active';
    }
    if (phase === 'check') vTones[top] = 'compare';
    if (phase === 'peek') {
      minTones[top] = 'compare';
      maxTones[top] = 'compare';
    }
    if (phase === 'newmin') minTones[top] = 'compare';
    if (phase === 'newmax') maxTones[top] = 'compare';
    if (phase === 'min') minTones[top] = 'found';
    if (phase === 'max') maxTones[top] = 'found';
    entities.push(arr('stack', 0, 0, entries.map((e) => e.val), { label: 'stack', tones: vTones, itemKeys: keys, codeVar: 'stack' }));
    entities.push(arr('mins', 0, MIN_Y, entries.map((e) => e.min), { label: 'min so far', tones: minTones, itemKeys: keys, showIndex: false }));
    entities.push(arr('maxes', 0, MAX_Y, entries.map((e) => e.max), { label: 'max so far', tones: maxTones, itemKeys: keys, showIndex: false }));
    const pinTone: Tone = phase === 'push' ? 'active' : phase === 'check' || phase === 'peek' || phase === 'newmin' || phase === 'newmax' ? 'compare' : 'done';
    entities.push(ptr('top', 'stack', top, 'top', { side: 'top', tone: pinTone }));
  }
  const row = (name: string, value: number | undefined, tone: Tone = 'default'): VarRow => ({ name, value: value ?? '—', tone: value === undefined ? 'muted' : tone });
  const rows: VarRow[] = [
    row('val', s.val),
    row('curr_min', s.currMin),
    row('curr_max', s.currMax),
    row('new_min', s.newMin, phase === 'newmin' ? 'active' : 'default'),
    row('new_max', s.newMax, phase === 'newmax' ? 'active' : 'default'),
    { name: 'returns', value: s.returns ?? '—', tone: s.returns === undefined ? 'muted' : s.returns === 'IndexError' ? 'miss' : 'found' },
  ];
  entities.push(vars('vals', tableBesideArray(s.width, ROWS), 0, rows, { label: 'variables', width: 170 }));
  if (s.note) entities.push(note('note', 0, NOTE_Y, s.note, { tone: s.noteTone ?? 'note' }));
  return entities;
}

type Op = { readonly kind: 'push'; readonly val: number } | { readonly kind: 'pop' } | { readonly kind: 'get_min' } | { readonly kind: 'get_max' };

/** Trace input: a number above 0 pushes it, 0 pops, −1 asks get_min, −2 asks get_max. */
function parseOps(codes: readonly number[]): Op[] {
  return codes.map((c) => {
    if (!Number.isInteger(c) || c < -2) throw new Error('Use a whole number above 0 to push it, 0 to pop, -1 for get_min or -2 for get_max.');
    if (c === 0) return { kind: 'pop' };
    if (c === -1) return { kind: 'get_min' };
    if (c === -2) return { kind: 'get_max' };
    return { kind: 'push', val: c };
  });
}

/** How wide the stack gets, so the variables panel can sit clear of it for the whole run. */
function widest(ops: readonly Op[]): number {
  let size = 0;
  let most = 1;
  for (const op of ops) {
    if (op.kind === 'push') size += 1;
    if (op.kind === 'pop') size = Math.max(0, size - 1);
    most = Math.max(most, size);
  }
  return most;
}

const tuple = (e: Entry): string => `(${e.val}, ${e.min}, ${e.max})`;

/** Creates a MinMaxStack and runs every operation, one step per decision (chapter "run", final code). */
function traceMinMax(ops: readonly Op[]): Step[] {
  const steps: Step[] = [];
  const width = widest(ops);
  let entries: Entry[] = [];
  let pushes = 0;
  let pops = 0;
  let last: ScalarValue = '—';
  const metrics = (): Record<string, ScalarValue> => ({ pushes, pops, result: last });

  steps.push({
    chapter: 'run',
    short: 'Create',
    title: 'MinMaxStack(): an empty list of entries',
    body: 'Line 4 starts `stack` empty. Each entry will be a tuple: the value, the minimum so far and the maximum so far.',
    code: { view: 'final', lines: [2, 4] },
    values: { 4: 'stack = []' },
    metrics: metrics(),
    scene: { entities: scene({ entries, width, phase: 'create' }) },
  });

  for (const op of ops) {
    if (op.kind === 'push') {
      const { val } = op;
      pushes += 1;
      const key = `p${pushes}`;
      const prev = entries[entries.length - 1];
      if (!prev) {
        steps.push({
          chapter: 'run',
          short: `push(${val})?`,
          title: `push(${val}): the stack is empty`,
          body: `Line 7: \`not stack\` is true. With nothing below it, ${val} is both the smallest and the largest value so far.`,
          code: { view: 'final', lines: [6, 7] },
          values: { 6: `val = ${val}`, 7: 'not [] → True' },
          metrics: metrics(),
          scene: { entities: scene({ entries, width, phase: 'empty', val }) },
        });
        const entry: Entry = { key, val, min: val, max: val };
        entries = [entry];
        steps.push({
          chapter: 'run',
          short: `store ${val}`,
          title: `Append ${tuple(entry)}`,
          body: `Line 8 appends \`${tuple(entry)}\`: the value, its own minimum and its own maximum.`,
          code: { view: 'final', lines: [8] },
          values: { 8: `stack.append(${tuple(entry)})` },
          metrics: metrics(),
          scene: { entities: scene({ entries, width, phase: 'push', val }) },
        });
        continue;
      }
      const currMin = prev.min;
      const currMax = prev.max;
      steps.push({
        chapter: 'run',
        short: `push(${val})?`,
        title: `push(${val}): read the top’s cached min and max`,
        body: `Line 7: the stack isn’t empty, so line 10 unpacks the top entry \`${tuple(prev)}\`: everything below holds at least ${currMin} and at most ${currMax}.`,
        code: { view: 'final', lines: [6, 7, 10] },
        values: { 6: `val = ${val}`, 7: 'not stack → False', 10: `curr_min = ${currMin}, curr_max = ${currMax}` },
        metrics: metrics(),
        scene: { entities: scene({ entries, width, phase: 'peek', val, currMin, currMax }) },
      });
      const newMin = Math.min(val, currMin);
      steps.push({
        chapter: 'run',
        short: `new_min = ${newMin}`,
        title: val < currMin ? `${val} < ${currMin}: a new minimum` : `${val} ≥ ${currMin}: the minimum stays ${currMin}`,
        body: `Line 11: \`min(${val}, ${currMin}) = ${newMin}\`. ${val < currMin ? `${val} is smaller than everything below it.` : `Something below is already ${currMin}, so ${val} doesn’t change the minimum.`}`,
        code: { view: 'final', lines: [11] },
        values: { 11: `new_min = min(${val}, ${currMin}) = ${newMin}` },
        metrics: metrics(),
        scene: { entities: scene({ entries, width, phase: 'newmin', val, currMin, currMax, newMin }) },
      });
      const newMax = Math.max(val, currMax);
      steps.push({
        chapter: 'run',
        short: `new_max = ${newMax}`,
        title: val > currMax ? `${val} > ${currMax}: a new maximum` : `${val} ≤ ${currMax}: the maximum stays ${currMax}`,
        body: `Line 12: \`max(${val}, ${currMax}) = ${newMax}\`. ${val > currMax ? `${val} is larger than everything below it.` : `Something below is already ${currMax}.`}`,
        code: { view: 'final', lines: [12] },
        values: { 12: `new_max = max(${val}, ${currMax}) = ${newMax}` },
        metrics: metrics(),
        scene: { entities: scene({ entries, width, phase: 'newmax', val, currMin, currMax, newMin, newMax }) },
      });
      const entry: Entry = { key, val, min: newMin, max: newMax };
      entries = [...entries, entry];
      steps.push({
        chapter: 'run',
        short: `store ${val}`,
        title: `Append ${tuple(entry)}`,
        body: `Line 13 appends \`${tuple(entry)}\`. While ${val} is on top, the answers to \`get_min\` and \`get_max\` are stored right next to it.`,
        code: { view: 'final', lines: [13] },
        values: { 13: `stack.append(${tuple(entry)})` },
        metrics: metrics(),
        scene: { entities: scene({ entries, width, phase: 'push', val, newMin, newMax }) },
      });
      continue;
    }

    const name = op.kind;
    const def = name === 'pop' ? 15 : name === 'get_min' ? 21 : 26;
    const guard = def + 1;
    const empty = entries.length === 0;
    const topEntry = entries[entries.length - 1];
    steps.push({
      chapter: 'run',
      short: `${name}()?`,
      title: empty ? `${name}(): the stack is empty` : `${name}(): is there a top entry?`,
      body: empty ? `Line ${guard}: \`not stack\` is true. There is no entry to read.` : `Line ${guard}: \`not stack\` is false. The top entry is \`${topEntry ? tuple(topEntry) : ''}\`.`,
      code: { view: 'final', lines: [def, guard] },
      values: { [guard]: `not stack → ${empty ? 'True' : 'False'}` },
      metrics: metrics(),
      scene: { entities: scene({ entries, width, phase: empty ? 'empty' : 'check' }) },
    });
    if (empty || !topEntry) {
      last = 'IndexError';
      steps.push({
        chapter: 'run',
        short: 'IndexError',
        title: `${name}() raises IndexError`,
        body: `Line ${guard + 1} raises \`IndexError\`: asking an empty stack is a bug in the caller, not a normal answer. The program stops here unless the caller catches it.`,
        code: { view: 'final', lines: [guard + 1] },
        values: { [guard + 1]: 'raise IndexError' },
        metrics: metrics(),
        scene: { entities: scene({ entries, width, phase: 'raise', returns: 'IndexError' }) },
      });
      return steps;
    }
    if (name === 'pop') {
      pops += 1;
      entries = entries.slice(0, -1);
      last = topEntry.val;
      const below = entries[entries.length - 1];
      steps.push({
        chapter: 'run',
        short: `pop → ${topEntry.val}`,
        title: `pop() removes ${tuple(topEntry)} and returns ${topEntry.val}`,
        body: `Line 18 pops the whole tuple and keeps its value; line 19 returns **${topEntry.val}**. ${below ? `The new top \`${tuple(below)}\` already knows the min and max of what’s left.` : 'The stack is empty again.'}`,
        code: { view: 'final', lines: [18, 19] },
        values: { 18: `val = ${topEntry.val}`, 19: `return ${topEntry.val}` },
        metrics: metrics(),
        scene: { entities: scene({ entries, width, phase: 'popped', val: topEntry.val, returns: topEntry.val }) },
      });
      continue;
    }
    const isMin = name === 'get_min';
    const answer = isMin ? topEntry.min : topEntry.max;
    last = answer;
    steps.push({
      chapter: 'run',
      short: `${isMin ? 'min' : 'max'} → ${answer}`,
      title: `${name}() returns ${answer} without scanning`,
      body: `Line ${isMin ? 24 : 29} reads \`stack[-1][${isMin ? 1 : 2}] = ${answer}\`, the ${isMin ? 'minimum' : 'maximum'} cached when the top was pushed. No other entry is looked at.`,
      code: { view: 'final', lines: [isMin ? 24 : 29] },
      values: { [isMin ? 24 : 29]: `return ${answer}` },
      metrics: metrics(),
      scene: { entities: scene({ entries, width, phase: isMin ? 'min' : 'max', returns: answer }) },
    });
  }
  return steps;
}

const OPS: readonly Op[] = [
  { kind: 'push', val: 5 },
  { kind: 'push', val: 2 },
  { kind: 'push', val: 7 },
  { kind: 'push', val: 1 },
  { kind: 'pop' },
  { kind: 'get_min' },
  { kind: 'pop' },
  { kind: 'get_max' },
];
const WIDTH = widest(OPS);
const RUN = traceMinMax(OPS);
const startMetrics = { pushes: 0, pops: 0, result: '—' } as const;
const FINAL_METRICS = RUN.at(-1)?.metrics ?? startMetrics;
const BUILD_END = 14;
const at = (n: number): Step['scene'] => RUN[n]?.scene ?? { entities: [] };
const find = (short: string): number => RUN.findIndex((s) => s.short === short);
const FULL: readonly Entry[] = [
  { key: 'p1', val: 5, min: 5, max: 5 },
  { key: 'p2', val: 2, min: 2, max: 5 },
  { key: 'p3', val: 7, min: 2, max: 7 },
  { key: 'p4', val: 1, min: 1, max: 7 },
];

export default defineWalkthrough({
  id: 'learn/stack-queue/min-max-stack',
  title: 'Min-Max Stack, answers cached on every entry',
  summary: 'From the idea to the code: a stack that answers get_min and get_max in O(1) by storing the minimum and maximum so far with every pushed value.',
  minutes: 7,
  code: {
    lang: 'python',
    source: `class MinMaxStack:
    def __init__(self) -> None:
        # Each entry: (value, min so far, max so far)
        self.stack: list[tuple[int, int, int]] = []

    def push(self, val: int) -> None:
        if not self.stack:
            self.stack.append((val, val, val))
        else:
            _, curr_min, curr_max = self.stack[-1]
            new_min = min(val, curr_min)
            new_max = max(val, curr_max)
            self.stack.append((val, new_min, new_max))

    def pop(self) -> int:
        if not self.stack:
            raise IndexError("pop from empty MinMaxStack")
        val, _, _ = self.stack.pop()
        return val

    def get_min(self) -> int:
        if not self.stack:
            raise IndexError("get_min from empty MinMaxStack")
        return self.stack[-1][1]

    def get_max(self) -> int:
        if not self.stack:
            raise IndexError("get_max from empty MinMaxStack")
        return self.stack[-1][2]`,
  },
  snapshots: {
    brute: `def get_min(self) -> int:
    return min(self.stack)  # Looks at every value: O(n)

def get_max(self) -> int:
    return max(self.stack)  # And again: O(n)`,
  },
  metrics: [
    { key: 'pushes', label: 'Pushes' },
    { key: 'pops', label: 'Pops' },
    { key: 'result', label: 'Last return' },
  ],
  legend: [
    { tone: 'active', label: 'just pushed' },
    { tone: 'compare', label: 'top entry being read' },
    { tone: 'done', label: 'on the stack' },
    { tone: 'found', label: 'returned' },
    { tone: 'miss', label: 'empty / full scan' },
    { tone: 'muted', label: 'nothing here' },
  ],
  goals: [
    { text: 'See why scanning for the minimum is O(n)', step: 2 },
    { text: 'Cache the min and max on every entry', step: 3 },
    { text: 'Follow every push, pop and query', step: BUILD_END + 1 },
    { text: 'Know why a cached minimum stays correct after a pop', step: BUILD_END + RUN.length + 2 },
  ],
  steps: [
    {
      chapter: 'problem',
      short: 'The brief',
      title: 'A stack that knows its smallest and largest value',
      body: 'Like writing the coldest temperature so far on the tag of every layer you put on: take off the outer coats, and the tag on your current layer still has the answer.\n\n`MinMaxStack` needs `push`, `pop`, `get_min` and `get_max`, **all in `O(1)`**. For `[5, 2, 7, 1]`, `get_min()` is 1, and after one `pop()` it must be 2.',
      code: { view: 'signature', lines: [1] },
      metrics: startMetrics,
      scene: { entities: scene({ entries: FULL, width: WIDTH, note: 'get_min() → 1, get_max() → 7\nafter pop(): get_min() → 2' }) },
    },
    {
      chapter: 'idea',
      short: 'Scan',
      title: 'The obvious way: scan the stack on every query',
      body: 'Lines 2 and 5 look at every value to find the smallest or largest. That’s `n` reads per query: **`O(n)`**.\n\nWorse, a pop can remove the minimum, so the answer can’t just be kept in one variable: after popping 1, who is the minimum now?',
      code: { view: 'snapshot', id: 'brute', lines: [2, 5] },
      metrics: startMetrics,
      scene: { entities: [arr('stack', 0, 0, [5, 2, 7, 1], { label: 'stack', tones: { 0: 'miss', 1: 'miss', 2: 'miss', 3: 'miss' }, itemKeys: ['p1', 'p2', 'p3', 'p4'], codeVar: 'stack' }), note('note', 0, NOTE_Y, 'min(stack) reads all 4 values\none variable can’t survive a pop\nof the minimum', { tone: 'miss' })] },
    },
    {
      chapter: 'idea',
      short: 'Cache',
      title: 'Store the min and max so far with every value',
      body: 'A stack only changes at the top. While a value sits on the stack, everything **below** it never changes, so the minimum of "this value and everything below" can be computed once, at push time, and stored with it.\n\nThen the answer is always on the top entry, and a pop simply uncovers the older answer.',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: { entities: scene({ entries: FULL, width: WIDTH, phase: 'peek', note: 'top entry (1, 1, 7): min 1, max 7\npop it → (7, 2, 7) is on top\nits min 2 was right all along' }) },
    },
    {
      chapter: 'build',
      short: 'Entries',
      title: 'Lines 3–4: a list of (value, min, max) tuples',
      body: 'One list, one tuple per pushed value. The comment says what the three numbers mean.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4], lines: [3, 4] },
      metrics: startMetrics,
      changes: ['self.stack = []'],
      scene: at(0),
    },
    {
      chapter: 'build',
      short: 'First push',
      title: 'Lines 6–8: the first value is its own min and max',
      body: 'On an empty stack there is nothing to compare with, so the entry is `(val, val, val)`.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 6, 7, 8], lines: [7, 8] },
      metrics: startMetrics,
      changes: ['if not self.stack: append((val, val, val))'],
      scene: at(find('store 5')),
    },
    {
      chapter: 'build',
      short: 'Read top',
      title: 'Lines 9–10: read the answers cached on the top',
      body: 'The top entry already holds the min and max of everything on the stack. The `_` skips its value, which we don’t need.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 6, 7, 8, 9, 10], lines: [9, 10] },
      metrics: startMetrics,
      changes: ['_, curr_min, curr_max = self.stack[-1]'],
      scene: at(find('push(2)?')),
    },
    {
      chapter: 'build',
      short: 'Update',
      title: 'Lines 11–12: fold the new value in',
      body: 'The new minimum is the smaller of the new value and the old minimum; the same for the maximum. Two comparisons, whatever the stack’s size.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 6, 7, 8, 9, 10, 11, 12], lines: [11, 12] },
      metrics: startMetrics,
      changes: ['new_min = min(val, curr_min)', 'new_max = max(val, curr_max)'],
      scene: at(find('new_min = 2')),
    },
    {
      chapter: 'build',
      short: 'Store',
      title: 'Line 13: push the value with its answers',
      body: 'The tuple goes on top. From now on, `get_min` and `get_max` read it directly.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 6, 7, 8, 9, 10, 11, 12, 13], lines: [13] },
      metrics: startMetrics,
      changes: ['self.stack.append((val, new_min, new_max))'],
      scene: at(find('store 2')),
    },
    {
      chapter: 'build',
      short: 'pop guard',
      title: 'Lines 15–17: popping an empty stack is an error',
      body: 'Unlike the plain stack lesson, this class raises `IndexError` (Python’s own `list.pop()` does the same): asking an empty stack is treated as a bug in the caller.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 6, 7, 8, 9, 10, 11, 12, 13, 15, 16, 17], lines: [16, 17] },
      metrics: startMetrics,
      changes: ['if not self.stack: raise IndexError'],
      scene: at(find('pop()?')),
    },
    {
      chapter: 'build',
      short: 'pop',
      title: 'Lines 18–19: drop the whole tuple, return its value',
      body: 'The cached min and max leave with it. The entry below becomes the top, with its own answers.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 6, 7, 8, 9, 10, 11, 12, 13, 15, 16, 17, 18, 19], lines: [18, 19] },
      metrics: startMetrics,
      changes: ['val, _, _ = self.stack.pop()', 'return val'],
      scene: at(find('pop → 1')),
    },
    {
      chapter: 'build',
      short: 'min guard',
      title: 'Lines 21–23: get_min needs an entry too',
      body: 'An empty stack has no minimum, so `get_min` raises the same way.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 6, 7, 8, 9, 10, 11, 12, 13, 15, 16, 17, 18, 19, 21, 22, 23], lines: [22, 23] },
      metrics: startMetrics,
      changes: ['if not self.stack: raise IndexError'],
      scene: at(find('get_min()?')),
    },
    {
      chapter: 'build',
      short: 'get_min',
      title: 'Line 24: the answer is slot 1 of the top entry',
      body: '`stack[-1]` is the top tuple and `[1]` its cached minimum: one read.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 6, 7, 8, 9, 10, 11, 12, 13, 15, 16, 17, 18, 19, 21, 22, 23, 24], lines: [24] },
      metrics: startMetrics,
      changes: ['return self.stack[-1][1]'],
      scene: at(find('min → 2')),
    },
    {
      chapter: 'build',
      short: 'max guard',
      title: 'Lines 26–28: get_max, same guard',
      body: '`get_max` mirrors `get_min` exactly.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 6, 7, 8, 9, 10, 11, 12, 13, 15, 16, 17, 18, 19, 21, 22, 23, 24, 26, 27, 28], lines: [27, 28] },
      metrics: startMetrics,
      changes: ['if not self.stack: raise IndexError'],
      scene: at(find('get_max()?')),
    },
    {
      chapter: 'build',
      short: 'get_max',
      title: 'Line 29: slot 2 of the top entry',
      body: '`[2]` is the cached maximum.\n\nThat’s the whole class. Now let’s run it.',
      code: { view: 'final', lines: [29] },
      metrics: startMetrics,
      changes: ['return self.stack[-1][2]'],
      scene: at(find('max → 5')),
    },
    ...RUN,
    {
      chapter: 'why',
      short: 'Recap',
      title: 'Every operation is O(1)',
      body: 'A push does two comparisons and one append; pop, `get_min` and `get_max` each read or remove the top: all **`O(1)`**. The price is memory: three numbers per value instead of one, still **`O(n)`**.\n\nSwitch to **🧪 Try your own** to run your own pushes and queries.',
      code: { view: 'final', lines: [11, 12, 24, 29] },
      metrics: FINAL_METRICS,
      scene: { entities: scene({ entries: FULL.slice(0, 2), width: WIDTH, returns: 5, note: '4 pushes, 2 pops, 2 queries\nnever more than 2 comparisons\n→ O(1) each, 3 numbers per value', noteTone: 'found' }) },
    },
    {
      chapter: 'why',
      short: 'Why cache',
      title: 'Why line 3 stores the minimum so far on every entry',
      body: 'A single `min` variable breaks the moment the minimum is popped: after popping 1 it still says 1. The per-entry cache can’t go stale, because an entry’s "so far" only covers values **below** it, and those can’t change while it sits on the stack.\n\nThat is the key decision: compute the answer at push time and let pop uncover the previous one.',
      code: { view: 'final', lines: [3, 11, 24] },
      values: { 3: 'below never changes → cache stays right' },
      metrics: FINAL_METRICS,
      scene: { entities: scene({ entries: FULL.slice(0, 3), width: WIDTH, phase: 'min', returns: 2, note: 'one variable: min = 1, then pop 1\n→ still says 1, wrong\ncache: (7, 2, 7) says 2, right' }) },
    },
  ],
  trace: {
    title: 'Run your own pushes, pops and queries',
    inputs: [{ name: 'ops', label: 'Operations: a number > 0 pushes it, 0 pops, -1 get_min, -2 get_max', kind: 'numbers', default: '5, 2, 7, 1, 0, -1, 0, -2' }],
    presets: [
      { label: 'Lesson example', values: { ops: '5, 2, 7, 1, 0, -1, 0, -2' } },
      { label: 'Repeated minimum', values: { ops: '3, 3, 1, 0, -1, 0, -1' } },
      { label: 'All increasing', values: { ops: '1, 2, 3, 4, -1, -2' } },
      { label: 'Pop when empty', values: { ops: '4, 0, 0' } },
    ],
    maxItems: 10,
    run: (values) => {
      const codes = values['ops'];
      if (!Array.isArray(codes) || codes.length === 0) throw new Error('Enter at least one operation.');
      return traceMinMax(parseOps(codes));
    },
  },
});
