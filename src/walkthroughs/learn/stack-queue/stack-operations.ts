import { arr, defineWalkthrough, link, note, ptr, vars } from '../../../lib/walkthrough/helpers';
import type { Entity, ScalarValue, Step, Tone, VarRow } from '../../../lib/walkthrough/types';

const VARS_Y = 150;
const NOTE_X = 220;

/** One value on the stack. `key` is its push number, so it keeps its block while it stays. */
interface Item {
  readonly key: string;
  readonly value: number;
}

/**
 * What the scene shows about the top: `push` just appended, `check` line 10 / 15 found
 * items, `empty` the same check found none, `read` peek's answer, `popped` after line 12.
 */
type Phase = 'create' | 'push' | 'check' | 'empty' | 'read' | 'popped';

interface StackState {
  readonly items: readonly Item[];
  readonly phase?: Phase;
  /** Argument of the running `push`. */
  readonly value?: number;
  /** What the running call returned (`None` included). */
  readonly returns?: ScalarValue;
  readonly note?: string;
  readonly noteTone?: Tone;
}

/** Scene for one moment: `_items` bottom → top (left → right), the `top` pin, and the variables. */
function scene(s: StackState): Entity[] {
  const { items, phase } = s;
  const top = items.length - 1;
  const entities: Entity[] = [];
  if (items.length === 0) {
    // An empty list still needs a block on the stage: one muted placeholder.
    entities.push(arr('items', 0, 0, ['—'], { label: '_items', tones: { 0: phase === 'empty' ? 'miss' : 'muted' }, showIndex: false, itemKeys: ['empty'], codeVar: '_items' }));
  } else {
    const tones: Record<number, Tone> = {};
    items.forEach((_, k) => (tones[k] = 'done'));
    if (phase === 'push') tones[top] = 'active';
    if (phase === 'check') tones[top] = 'compare';
    if (phase === 'read') tones[top] = 'found';
    entities.push(arr('items', 0, 0, items.map((it) => it.value), { label: '_items', tones, itemKeys: items.map((it) => it.key), codeVar: '_items' }));
    const pinTone: Tone = phase === 'push' ? 'active' : phase === 'check' ? 'compare' : phase === 'read' ? 'found' : 'done';
    entities.push(ptr('top', 'items', top, 'top', { side: 'top', tone: pinTone }));
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

type Op = { readonly kind: 'push'; readonly value: number } | { readonly kind: 'pop' } | { readonly kind: 'peek' };

/** Trace input: a number above 0 pushes it, 0 pops, −1 peeks. */
function parseOps(codes: readonly number[]): Op[] {
  return codes.map((c) => {
    if (!Number.isInteger(c) || c < -1) throw new Error('Use a whole number above 0 to push it, 0 to pop, or -1 to peek.');
    if (c === 0) return { kind: 'pop' };
    if (c === -1) return { kind: 'peek' };
    return { kind: 'push', value: c };
  });
}

const show = (items: readonly Item[]): string => `[${items.map((it) => it.value).join(', ')}]`;

/** Creates a Stack and runs every operation, one step per decision (chapter "run", final code). */
function traceStack(ops: readonly Op[]): Step[] {
  const steps: Step[] = [];
  let items: Item[] = [];
  let pushes = 0;
  let pops = 0;
  let last: ScalarValue = '—';
  const metrics = (): Record<string, ScalarValue> => ({ pushes, pops, result: last });

  steps.push({
    chapter: 'run',
    short: 'Create',
    title: 'Stack(): an empty list',
    body: 'Lines 2–4 start `_items` as an empty list. Its end will be the top, so for now there is no top at all.',
    code: { view: 'final', lines: [2, 4] },
    values: { 4: '_items = []' },
    metrics: metrics(),
    scene: { entities: scene({ items, phase: 'create' }) },
  });

  for (const op of ops) {
    if (op.kind === 'push') {
      pushes += 1;
      items = [...items, { key: `p${pushes}`, value: op.value }];
      steps.push({
        chapter: 'run',
        short: `push(${op.value})`,
        title: `push(${op.value}): ${op.value} lands on top`,
        body: `Line 7 appends ${op.value} to the end of \`_items\`, which is the top. Nothing below it moves. The stack is now ${show(items)}.`,
        code: { view: 'final', lines: [6, 7] },
        values: { 6: `value = ${op.value}`, 7: `_items = ${show(items)}` },
        metrics: metrics(),
        scene: { entities: scene({ items, phase: 'push', value: op.value }) },
      });
      continue;
    }

    const name = op.kind;
    const guard = name === 'pop' ? 10 : 15;
    const def = name === 'pop' ? 9 : 14;
    const empty = items.length === 0;
    steps.push({
      chapter: 'run',
      short: `${name}()?`,
      title: empty ? `${name}(): the stack is empty` : `${name}(): is there a top?`,
      body: empty
        ? `Line ${guard}: \`not _items\` is true, the list is empty. Without this check, \`${name === 'pop' ? '_items.pop()' : '_items[-1]'}\` would raise an \`IndexError\`.`
        : `Line ${guard}: \`not _items\` is false: there are ${items.length} item${items.length === 1 ? '' : 's'}, so the top is \`_items[-1] = ${items[items.length - 1]?.value}\`.`,
      code: { view: 'final', lines: [def, guard] },
      values: { [guard]: `not ${show(items)} → ${empty ? 'True' : 'False'}` },
      metrics: metrics(),
      scene: { entities: scene({ items, phase: empty ? 'empty' : 'check' }) },
    });

    if (empty) {
      last = 'None';
      if (name === 'pop') pops += 1;
      steps.push({
        chapter: 'run',
        short: 'None',
        title: `${name}() returns None`,
        body: `Line ${guard + 1} returns \`None\`, so the caller learns the stack was empty and the program keeps running.`,
        code: { view: 'final', lines: [guard + 1] },
        values: { [guard + 1]: 'return None' },
        metrics: metrics(),
        scene: { entities: scene({ items, phase: 'empty', returns: 'None' }) },
      });
      continue;
    }

    const topValue = items[items.length - 1]?.value ?? 0;
    last = topValue;
    if (name === 'peek') {
      steps.push({
        chapter: 'run',
        short: `peek → ${topValue}`,
        title: `peek() returns ${topValue} and leaves it there`,
        body: `Line 17 reads \`_items[-1] = ${topValue}\`, the last item. It doesn’t remove it: the stack is still ${show(items)}.`,
        code: { view: 'final', lines: [17] },
        values: { 17: `return ${topValue}` },
        metrics: metrics(),
        scene: { entities: scene({ items, phase: 'read', returns: topValue }) },
      });
      continue;
    }
    pops += 1;
    items = items.slice(0, -1);
    steps.push({
      chapter: 'run',
      short: `pop → ${topValue}`,
      title: `pop() takes ${topValue} off the top`,
      body: `Line 12: \`_items.pop()\` removes the last item, ${topValue}, and returns it. ${items.length === 0 ? 'The stack is empty again.' : `The new top is ${items[items.length - 1]?.value}.`}`,
      code: { view: 'final', lines: [12] },
      values: { 12: `pop() → ${topValue}, _items = ${show(items)}` },
      metrics: metrics(),
      scene: { entities: scene({ items, phase: 'popped', returns: topValue }) },
    });
  }
  return steps;
}

const OPS: readonly Op[] = [
  { kind: 'push', value: 14 },
  { kind: 'push', value: 28 },
  { kind: 'peek' },
  { kind: 'push', value: 42 },
  { kind: 'pop' },
  { kind: 'pop' },
  { kind: 'pop' },
  { kind: 'pop' },
];
const RUN = traceStack(OPS);
const startMetrics = { pushes: 0, pops: 0, result: '—' } as const;
const FINAL_METRICS = RUN.at(-1)?.metrics ?? startMetrics;
const BUILD_END = 9;
/** Scene of run step n (0-based), so build steps show the moment they describe. */
const at = (n: number): Step['scene'] => RUN[n]?.scene ?? { entities: [] };
/** First run step whose short label is `short`. */
const find = (short: string): number => RUN.findIndex((s) => s.short === short);
const PILE: readonly Item[] = [
  { key: 'p1', value: 14 },
  { key: 'p2', value: 28 },
  { key: 'p3', value: 42 },
];

export default defineWalkthrough({
  id: 'learn/stack-queue/stack-operations',
  title: 'Stack, last in first out',
  summary: 'From the idea to the code: a stack on a Python list, with push, peek and pop touching only the end of the list, so every operation is O(1).',
  minutes: 5,
  code: {
    lang: 'python',
    source: `class Stack:
    def __init__(self) -> None:
        # The list's end is the top: append and pop there are O(1)
        self._items: list[int] = []

    def push(self, value: int) -> None:
        self._items.append(value)

    def pop(self) -> int | None:
        if not self._items:
            return None  # Empty: say so instead of raising IndexError
        return self._items.pop()

    def peek(self) -> int | None:
        if not self._items:
            return None
        return self._items[-1]  # Read the top, leave it in place`,
  },
  snapshots: {
    brute: `class Stack:
    def __init__(self) -> None:
        self._items: list[int] = []

    def push(self, value: int) -> None:
        self._items.insert(0, value)  # Top at index 0

    def pop(self) -> int:
        return self._items.pop(0)  # Every item shifts left`,
  },
  metrics: [
    { key: 'pushes', label: 'Pushes' },
    { key: 'pops', label: 'Pops' },
    { key: 'result', label: 'Last return' },
  ],
  legend: [
    { tone: 'active', label: 'just pushed' },
    { tone: 'compare', label: 'top being checked' },
    { tone: 'done', label: 'on the stack' },
    { tone: 'found', label: 'returned' },
    { tone: 'miss', label: 'empty / costly move' },
    { tone: 'muted', label: 'nothing here' },
  ],
  goals: [
    { text: 'See why the top shouldn’t be index 0', step: 2 },
    { text: 'Guard pop and peek on an empty stack', step: 6 },
    { text: 'Follow every push, peek and pop', step: BUILD_END + 1 },
    { text: 'Know why the end of the list is the top', step: BUILD_END + RUN.length + 2 },
  ],
  steps: [
    {
      chapter: 'problem',
      short: 'The brief',
      title: 'A pile where only the top is reachable',
      body: 'Like a spring-loaded stack of cafeteria trays: you put a tray on top and take the top one off. The last one in is the first one out (**LIFO**).\n\n`Stack` needs `push(value)`, `pop()` and `peek()`, each in **`O(1)`**, and `pop()` on an empty stack must not crash.',
      code: { view: 'signature', lines: [1] },
      metrics: startMetrics,
      scene: { entities: scene({ items: PILE, note: 'push puts a value on top\npop takes the top value off\npeek reads it, leaves it there' }) },
    },
    {
      chapter: 'idea',
      short: 'Top first',
      title: 'The obvious way: keep the top at index 0',
      body: 'Lines 6 and 9 treat `_items[0]` as the top. But `insert(0, value)` and `pop(0)` must shift **every** other item one slot to make or close the gap.\n\nWith `n` items that’s `n` moves per call: **`O(n)`**.',
      code: { view: 'snapshot', id: 'brute', lines: [6, 9] },
      metrics: startMetrics,
      scene: {
        entities: [
          arr('items', 0, 0, [42, 28, 14], { label: '_items', tones: { 0: 'found', 1: 'miss', 2: 'miss' }, itemKeys: ['p3', 'p2', 'p1'], codeVar: '_items' }),
          ptr('top', 'items', 0, 'top', { side: 'top', tone: 'found' }),
          ...[1, 2].map((k) => link(`shift-${k}`, { entity: 'items', index: k, side: 'bottom' }, { entity: 'items', index: k - 1, side: 'bottom' }, { tone: 'miss', dashed: true })),
          note('note', NOTE_X, VARS_Y, 'pop(0) takes 42, then 28 and 14\neach shift one slot left\nn items → n moves: O(n)', { tone: 'miss' }),
        ],
      },
    },
    {
      chapter: 'idea',
      short: 'Top last',
      title: 'Put the top at the end instead',
      body: 'A Python list can add or remove its **last** item without moving anything else. So make the end of the list the top: push is `append`, pop is `pop()`, peek is `_items[-1]`.\n\nAll three touch one slot: **`O(1)`**. Only an empty list needs care.',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: { entities: scene({ items: PILE, phase: 'check', note: 'top = the last item\nappend / pop() at the end\nnothing else moves → O(1)' }) },
    },
    {
      chapter: 'build',
      short: 'The list',
      title: 'Lines 3–4: an empty list whose end is the top',
      body: 'The stack is a plain list, `_items`, ordered bottom → top. The comment records the one decision everything else follows.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4], lines: [3, 4] },
      metrics: startMetrics,
      changes: ['self._items = []'],
      scene: at(0),
    },
    {
      chapter: 'build',
      short: 'push',
      title: 'Lines 6–7: push appends to the end',
      body: '`append` writes the value just past the last item, so it becomes the new top. Python lists keep spare room, so this is `O(1)` amortized.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 6, 7], lines: [6, 7] },
      metrics: startMetrics,
      changes: ['self._items.append(value)'],
      scene: at(find('push(42)')),
    },
    {
      chapter: 'build',
      short: 'Empty?',
      title: 'Lines 9–11: pop checks for an empty stack first',
      body: '`[].pop()` raises an `IndexError`. Line 10 catches the empty case first, and line 11 returns `None` so the caller can tell.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 6, 7, 9, 10, 11], lines: [10, 11] },
      metrics: startMetrics,
      changes: ['if not self._items: return None'],
      scene: at(RUN.length - 2),
    },
    {
      chapter: 'build',
      short: 'pop',
      title: 'Line 12: pop removes the last item',
      body: '`list.pop()` with no index removes and returns the **last** item: the top. The items below it don’t move.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 6, 7, 9, 10, 11, 12], lines: [12] },
      metrics: startMetrics,
      changes: ['return self._items.pop()'],
      scene: at(find('pop → 42')),
    },
    {
      chapter: 'build',
      short: 'peek guard',
      title: 'Lines 14–16: peek needs the same guard',
      body: 'Reading `_items[-1]` on an empty list also raises an `IndexError`, so `peek` starts with the same check.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 6, 7, 9, 10, 11, 12, 14, 15, 16], lines: [14, 15, 16] },
      metrics: startMetrics,
      changes: ['if not self._items: return None'],
      scene: at(find('peek()?')),
    },
    {
      chapter: 'build',
      short: 'peek',
      title: 'Line 17: read the top without removing it',
      body: 'Index `-1` is the last item. `peek` only reads it, so the stack stays the same.\n\nThat’s the whole class. Now let’s run it.',
      code: { view: 'final', lines: [17] },
      metrics: startMetrics,
      changes: ['return self._items[-1]'],
      scene: at(find('peek → 28')),
    },
    ...RUN,
    {
      chapter: 'why',
      short: 'Recap',
      title: 'Every operation touches one slot',
      body: 'Push, pop and peek each work on the last slot only: **`O(1)`** (push is amortized, because a full list occasionally grows). The list holds one slot per item: **`O(n)`** space.\n\nSwitch to **🧪 Try your own** to run your own pushes and pops.',
      code: { view: 'final', lines: [7, 12, 17] },
      metrics: FINAL_METRICS,
      scene: { entities: scene({ items: [], returns: 'None', note: '3 pushes, 4 pops, 1 peek\nnothing ever shifted\n→ O(1) per operation', noteTone: 'found' }) },
    },
    {
      chapter: 'why',
      short: 'Why the end',
      title: 'Why line 3 puts the top at the end of the list',
      body: 'A list stores its items side by side from index 0. Changing index 0 shifts all the others; changing the last slot shifts nothing. With 1,000 items, `pop(0)` moves 999 values and `pop()` moves none.\n\nThat is the key decision: put the busy end of the stack where the list is cheap to change.',
      code: { view: 'final', lines: [3, 7, 12] },
      values: { 3: 'top = end: no item ever shifts' },
      metrics: FINAL_METRICS,
      scene: { entities: scene({ items: PILE, phase: 'check', note: '1,000 items:\npop(0) → 999 shifts\npop()  → 0 shifts' }) },
    },
  ],
  trace: {
    title: 'Run your own pushes, peeks and pops',
    inputs: [{ name: 'ops', label: 'Operations: a number > 0 pushes it, 0 pops, -1 peeks', kind: 'numbers', default: '14, 28, -1, 42, 0, 99, 0' }],
    presets: [
      { label: 'LIFO basics', values: { ops: '14, 28, -1, 42, 0, 99, 0' } },
      { label: 'Drain the stack', values: { ops: '1, 2, 3, 0, 0, 0' } },
      { label: 'Pop when empty', values: { ops: '7, 0, 0, -1, 15' } },
      { label: 'Build and peek', values: { ops: '10, 20, 30, 40, -1, 0' } },
    ],
    maxItems: 10,
    run: (values) => {
      const codes = values['ops'];
      if (!Array.isArray(codes) || codes.length === 0) throw new Error('Enter at least one operation.');
      return traceStack(parseOps(codes));
    },
  },
});
