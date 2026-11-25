import { arr, defineWalkthrough, link, note, ptr, vars } from '../../../lib/walkthrough/helpers';
import type { Entity, Step, Tone } from '../../../lib/walkthrough/types';

/**
 * Drawn like the Singly Linked List reference (`.migration-contract.md` §5.1),
 * one row per level, stacked like §5.1's several arrays: level 0 is the usual
 * row of one-cell blocks at y 0, level i is a row behind it at y = −ROW × i, and
 * a node has one block in every row up to its height (one per entry of its
 * `forward` list), in the same column. The head sentinel is the left column
 * (rows labelled `forward[i]`), a muted `None` column stands at the right end,
 * and each `forward[i]` is a link `fw-<col>-<i>` along its row. Columns are 80
 * apart (not 100) so the widest list still fits. `curr` stands on its block in
 * the row being searched.
 */
const COL = 80;
const ROW = 200;
const VARS_Y = 150;
const NOTE_X = 250;

/** A column: 0 is the head sentinel, 1…n are the keys in order, n + 1 is `None`. */
interface SkipState {
  readonly keys: readonly number[];
  /** Height of each key's tower: its highest level. */
  readonly levels: readonly number[];
  /** `self.level`: the highest level in use. */
  readonly top: number;
  readonly target?: number;
  readonly curr?: number;
  readonly i?: number;
  /** The column `curr.forward[i]` points at, and how the check on it went. */
  readonly peek?: number;
  readonly peekTone?: Tone;
  /** A column whose level-0 block shows the answer. */
  readonly answer?: number;
  readonly answerTone?: Tone;
  /** Only draw level 0 (the plain linked list). */
  readonly flat?: boolean;
  readonly note?: string;
  readonly noteTone?: Tone;
  readonly hideVars?: boolean;
}

/** Highest level of a column (head and None span every level in use). */
function heightOf(s: Pick<SkipState, 'keys' | 'levels' | 'top'>, col: number): number {
  if (col === 0 || col === s.keys.length + 1) return s.top;
  return s.levels[col - 1] ?? 0;
}

/** Column that `forward[i]` of column `col` points at (n + 1 means `None`). */
function forwardOf(s: Pick<SkipState, 'keys' | 'levels' | 'top'>, col: number, i: number): number {
  for (let c = col + 1; c <= s.keys.length; c += 1) if (heightOf(s, c) >= i) return c;
  return s.keys.length + 1;
}

const blockId = (col: number, i: number, n: number): string => (col === 0 ? `head-l${i}` : col === n + 1 ? `none-l${i}` : `n${col}-l${i}`);

/** Scene for one moment: the towers, the forward links of every level, curr and the variables. */
function scene(s: SkipState): Entity[] {
  const n = s.keys.length;
  const levelsShown = s.flat ? 0 : s.top;
  const entities: Entity[] = [];
  for (let col = 0; col <= n + 1; col += 1) {
    const h = Math.min(heightOf(s, col), levelsShown);
    for (let i = 0; i <= h; i += 1) {
      const sentinel = col === 0 || col === n + 1;
      let tone: Tone = sentinel ? 'muted' : 'default';
      if (s.i === i && s.peek === col && !sentinel) tone = s.peekTone ?? 'compare';
      if (s.i === i && s.curr === col && col !== 0) tone = 'active';
      if (i === 0 && s.answer === col) tone = s.answerTone ?? 'found';
      const text = col === 0 ? 'head' : col === n + 1 ? 'None' : (s.keys[col - 1] ?? 0);
      entities.push(
        arr(blockId(col, i, n), col * COL, -i * ROW, [text], {
          tones: { 0: tone },
          showIndex: false,
          label: col === 0 && !s.flat ? `forward[${i}]` : undefined,
        }),
      );
    }
  }
  for (let i = 0; i <= levelsShown; i += 1) {
    for (let col = 0; col <= n; col += 1) {
      if (heightOf(s, col) < i) continue;
      const to = forwardOf(s, col, i);
      const hot = s.i === i && s.curr === col && s.peek !== undefined;
      entities.push(
        link(`fw-${col}-${i}`, { entity: blockId(col, i, n), side: 'right' }, { entity: blockId(to, i, n), side: 'left' }, {
          tone: hot ? (s.peekTone ?? 'compare') : 'default',
        }),
      );
    }
  }
  if (s.curr !== undefined) {
    const row = Math.min(s.i ?? heightOf(s, s.curr), heightOf(s, s.curr), levelsShown);
    entities.push(ptr('curr', blockId(s.curr, row, n), 0, 'curr', { tone: 'active', codeVar: 'curr' }));
  }

  if (!s.hideVars) {
    const name = (col: number | undefined): string => (col === undefined ? '—' : col === 0 ? 'head' : col === n + 1 ? 'None' : `node ${s.keys[col - 1]}`);
    const fw = s.curr !== undefined && s.i !== undefined && s.i >= 0 ? name(forwardOf(s, s.curr, s.i)) : '—';
    entities.push(
      vars(
        'vals',
        0,
        VARS_Y,
        [
          { name: 'target', value: s.target ?? '—', tone: s.target === undefined ? 'muted' : 'default' },
          { name: 'i', value: s.i ?? '—', tone: s.i === undefined ? 'muted' : 'default' },
          { name: 'curr', value: name(s.curr), tone: s.curr === undefined ? 'muted' : 'default' },
          { name: 'curr.forward[i]', value: fw, tone: fw === '—' ? 'muted' : 'default' },
        ],
        { label: 'variables', width: 230 },
      ),
    );
  }
  if (s.note) entities.push(note('note', s.hideVars ? 0 : NOTE_X, VARS_Y, s.note, { tone: s.noteTone ?? 'note' }));
  return entities;
}

/** Tower heights without coin flips: the k-th key (from 1) reaches level = trailing zero bits of k, capped at 2. */
function levelsFor(count: number): number[] {
  return Array.from({ length: count }, (_, idx) => {
    let k = idx + 1;
    let level = 0;
    while (k % 2 === 0 && level < 2) {
      k /= 2;
      level += 1;
    }
    return level;
  });
}

/** Runs search on a skip list built from the keys and records one step per decision (chapter "run", final code). */
function traceSearch(input: readonly number[], target: number): Step[] {
  const keys = [...new Set(input)].sort((a, b) => a - b);
  const levels = levelsFor(keys.length);
  const top = Math.max(0, ...levels);
  const n = keys.length;
  const base = { keys, levels, top, target } as const;
  const steps: Step[] = [];
  let hops = 0;
  let drops = 0;
  const metrics = (result: string = '—'): Record<string, string | number> => ({ hops, drops, result });
  const name = (col: number): string => (col === 0 ? 'head' : col === n + 1 ? 'None' : `node ${keys[col - 1]}`);
  const tidy = keys.length !== input.length || keys.some((k, idx) => k !== input[idx]);

  let curr = 0;
  let i = top;
  steps.push({
    chapter: 'run',
    short: 'Start',
    title: `Search for ${target}, starting on level ${top}`,
    body: `${tidy ? 'A skip list keeps its keys sorted and unique, so the keys were sorted first.\n\n' : ''}Line 16: \`curr = self.head\`. Line 18 starts on the highest level in use, \`i = ${top}\`, the fastest lane.`,
    code: { view: 'final', lines: [16, 18] },
    values: { 16: 'curr = head', 18: `i = ${top}` },
    metrics: metrics(),
    scene: { entities: scene({ ...base, curr, i }) },
  });

  for (;;) {
    const fw = forwardOf(base, curr, i);
    if (fw <= n && (keys[fw - 1] ?? 0) < target) {
      const k = keys[fw - 1] ?? 0;
      steps.push({
        chapter: 'run',
        short: `${k} < ${target}`,
        title: `Level ${i}: ${k} < ${target}, move right`,
        body: `Line 19: \`curr.forward[${i}]\` is node ${k}, and \`${k} < ${target}\`, so the target is further right on this lane.`,
        code: { view: 'final', lines: [19] },
        values: { 19: `${k} < ${target} → True` },
        metrics: metrics(),
        scene: { entities: scene({ ...base, curr, i, peek: fw, peekTone: 'compare' }) },
      });
      curr = fw;
      hops += 1;
      steps.push({
        chapter: 'run',
        short: 'Move',
        title: `curr moves to node ${k}`,
        body: `Line 20: \`curr = curr.forward[${i}]\`. On level ${i} that skips every node in between.`,
        code: { view: 'final', lines: [20] },
        values: { 20: `curr = node ${k}` },
        metrics: metrics(),
        scene: { entities: scene({ ...base, curr, i }) },
      });
      continue;
    }
    const why = fw > n ? `\`curr.forward[${i}]\` is \`None\`: this lane ends here` : `\`curr.forward[${i}]\` is node ${keys[fw - 1]}, and \`${keys[fw - 1]} < ${target}\` is false: too far`;
    steps.push({
      chapter: 'run',
      short: 'Stop',
      title: fw > n ? `Level ${i}: the lane ends, stop` : `Level ${i}: ${keys[fw - 1]} is too far, stop`,
      body: `Line 19: ${why}. \`curr\` stays on ${name(curr)}.`,
      code: { view: 'final', lines: [19] },
      values: { 19: fw > n ? 'forward is None → False' : `${keys[fw - 1]} < ${target} → False` },
      metrics: metrics(),
      scene: { entities: scene({ ...base, curr, i, peek: fw, peekTone: 'miss' }) },
    });
    if (i === 0) break;
    i -= 1;
    drops += 1;
    steps.push({
      chapter: 'run',
      short: `Level ${i}`,
      title: `Drop down to level ${i}`,
      body: `Line 18 moves to the next lane down, \`i = ${i}\`. \`curr\` stays on ${name(curr)}: everything left of it is smaller than ${target}.`,
      code: { view: 'final', lines: [18] },
      values: { 18: `i = ${i}` },
      metrics: metrics(),
      scene: { entities: scene({ ...base, curr, i }) },
    });
  }

  const cand = forwardOf(base, curr, 0);
  steps.push({
    chapter: 'run',
    short: 'Step in',
    title: `Step to ${name(cand)}, the first key ≥ ${target}`,
    body: `Line 21: \`curr = curr.forward[0]\`. Every key before it is smaller than ${target}, so if ${target} is in the list, it is here.`,
    code: { view: 'final', lines: [21] },
    values: { 21: `curr = ${name(cand)}` },
    metrics: metrics(),
    scene: { entities: scene({ ...base, curr: cand, i: 0 }) },
  });
  const hit = cand <= n && keys[cand - 1] === target;
  steps.push({
    chapter: 'run',
    short: 'Return',
    title: hit ? `Found ${target}: return True` : `${target} isn’t there: return False`,
    body: hit
      ? `Line 22: \`curr\` is a node and its key is ${target}, so the search returns **True** after ${hops} move${hops === 1 ? '' : 's'} right.`
      : cand > n
        ? `Line 22: \`curr\` is \`None\`: every key is smaller than ${target}. The search returns **False**.`
        : `Line 22: \`curr.key\` is ${keys[cand - 1]}, not ${target}. The search returns **False**.`,
    code: { view: 'final', lines: [22] },
    values: { 22: hit ? `${target} == ${target} → True` : cand > n ? 'curr is None → False' : `${keys[cand - 1]} == ${target} → False` },
    metrics: metrics(hit ? 'True' : 'False'),
    scene: { entities: scene({ ...base, curr: cand, answer: cand <= n ? cand : undefined, answerTone: hit ? 'found' : 'miss' }) },
  });
  return steps;
}

const KEYS = [3, 6, 9, 12, 17, 25] as const;
const TARGET = 17;
const LEVELS = levelsFor(KEYS.length);
const BASE = { keys: KEYS, levels: LEVELS, top: 2, target: TARGET } as const;
const RUN = traceSearch(KEYS, TARGET);
const startMetrics = { hops: 0, drops: 0, result: '—' } as const;
const FINAL_METRICS = RUN.at(-1)?.metrics ?? startMetrics;
/** Scene of run step n (0-based), so build steps show the moment they describe. */
const at = (n: number): Step['scene'] => RUN[n]?.scene ?? { entities: [] };
const find = (short: string): number => RUN.findIndex((s) => s.short === short);
const RUN_START = 11;

export default defineWalkthrough({
  id: 'learn/linked-list/skip-list',
  title: 'Skip List, express lanes over a linked list',
  summary: 'From the idea to the code: stack sparser and sparser linked lists on top of a sorted one, and search by riding the fastest lane until it overshoots, then dropping a level.',
  minutes: 9,
  code: {
    lang: 'python',
    source: `class SkipNode:
    def __init__(self, key: int, level: int) -> None:
        self.key = key
        # forward[i] stores the pointer to the next node at level i
        self.forward: list[SkipNode | None] = [None] * (level + 1)


class SkipList:
    def __init__(self, max_level: int = 16) -> None:
        # Sentinel head node containing pointers up to max_level
        self.head = SkipNode(-1, max_level)
        self.level = 0  # Highest level in use

    def search(self, target: int) -> bool:
        """Searches for target in O(log n) average time."""
        curr = self.head
        # Traverse from the top active level down to level 0
        for i in range(self.level, -1, -1):
            while curr.forward[i] and curr.forward[i].key < target:
                curr = curr.forward[i]
        curr = curr.forward[0]
        return curr is not None and curr.key == target`,
  },
  snapshots: {
    walk: `def search(head: SkipNode, target: int) -> bool:
    curr = head.forward[0]
    while curr is not None and curr.key < target:
        curr = curr.forward[0]  # One node at a time
    return curr is not None and curr.key == target`,
  },
  metrics: [
    { key: 'hops', label: 'Moves right' },
    { key: 'drops', label: 'Levels dropped' },
    { key: 'result', label: 'Returns' },
  ],
  legend: [
    { tone: 'active', label: 'curr on the current level' },
    { tone: 'compare', label: 'curr.forward[i], being checked' },
    { tone: 'found', label: 'target found' },
    { tone: 'miss', label: 'too far / lane ends / not found' },
    { tone: 'muted', label: 'head sentinel / None' },
  ],
  goals: [
    { text: 'See why a sorted linked list searches in O(n)', step: 2 },
    { text: 'Know where the express lanes come from', step: 3 },
    { text: 'Ride a lane, then drop a level', step: RUN_START + find('Level 1') },
    { text: 'Know why line 19 uses <, not <=', step: RUN_START + RUN.length + 1 },
  ],
  steps: [
    {
      chapter: 'problem',
      short: 'The brief',
      title: 'Is 17 in the sorted keys 3, 6, 9, 12, 17, 25?',
      body: 'Like a subway with local and express trains: ride the express as far as it helps, then change to a slower line. Lines 1–2 define a node that can sit on several levels.\n\nReturn whether `target` is in the list, faster than walking it node by node: here 17 is there, so **True**.',
      code: { view: 'signature', lines: [1, 2] },
      metrics: startMetrics,
      scene: { entities: scene({ ...BASE, hideVars: true, answer: 5, note: 'search(17) → True\nlevel 2: 12\nlevel 1: 6, 12, 25' }) },
    },
    {
      chapter: 'idea',
      short: 'Walk',
      title: 'A plain sorted list: walk until you pass it',
      body: 'Lines 3–4 hop along level 0 while keys are smaller than the target. Sorted order lets us stop early, but reaching 17 still takes 5 hops.\n\nLinked lists can’t jump to the middle, so binary search is out: **`O(n)`**.',
      code: { view: 'snapshot', id: 'walk', lines: [3, 4] },
      metrics: startMetrics,
      scene: { entities: scene({ ...BASE, flat: true, hideVars: true, answer: 5, note: '5 hops: 3, 6, 9, 12, 17\nn hops at worst → O(n)', noteTone: 'miss' }) },
    },
    {
      chapter: 'idea',
      short: 'Lanes',
      title: 'Add express lanes that skip half the nodes',
      body: 'Give about half the nodes a level-1 link, half of those a level-2 link, and so on: each lane skips about half the nodes of the one below, so there are about `log₂ n` lanes and a search moves only a step or two on each.\n\nReal skip lists flip a coin per level (height `k` with chance `1/2^k`). Here every 2nd key reaches level 1 and every 4th level 2, so the run is repeatable.',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: { entities: scene({ ...BASE, hideVars: true, note: 'every 2nd key: level 1\nevery 4th key: level 2\n~log₂ n lanes, ~2 moves each' }) },
    },
    {
      chapter: 'build',
      short: 'Tower',
      title: 'Lines 3–5: one forward link per level',
      body: 'Line 3 stores the key. Line 5 gives the node one `forward` link per level it belongs to, so `forward[i]` is the next node on lane `i`.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5], lines: [3, 4, 5] },
      metrics: startMetrics,
      changes: ['self.key = key', 'self.forward = [None] * (level + 1)'],
      scene: { entities: scene({ ...BASE, hideVars: true, note: 'node 12: forward[0], [1], [2]\nnode 9: forward[0] only' }) },
    },
    {
      chapter: 'build',
      short: 'Head',
      title: 'Lines 8–10: a list that starts at a sentinel',
      body: 'Line 9 builds an empty skip list. The comment on line 10 explains the head: a dummy node tall enough for every level.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5, 8, 9, 10], lines: [8, 9, 10] },
      metrics: startMetrics,
      changes: ['class SkipList'],
      scene: { entities: scene({ ...BASE, hideVars: true, note: 'head: one forward link per level\nevery lane starts at head' }) },
    },
    {
      chapter: 'build',
      short: 'Level',
      title: 'Lines 11–12: the head and the highest lane in use',
      body: 'Line 11 makes the sentinel with key −1. Line 12 tracks `self.level`, the highest lane that has any node; inserts raise it (here 2).',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5, 8, 9, 10, 11, 12], lines: [11, 12] },
      metrics: startMetrics,
      changes: ['self.head = SkipNode(-1, max_level)', 'self.level = 0'],
      scene: { entities: scene({ ...BASE, hideVars: true, note: 'self.level = 2 for these keys' }) },
    },
    {
      chapter: 'build',
      short: 'Start',
      title: 'Lines 14–16: search starts at the head',
      body: 'Line 14 takes the target; the docstring on line 15 states the goal. Line 16 puts `curr` on the head, left of every key.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5, 8, 9, 10, 11, 12, 14, 15, 16], lines: [14, 15, 16] },
      metrics: startMetrics,
      changes: ['curr = self.head'],
      scene: at(0),
    },
    {
      chapter: 'build',
      short: 'Lanes',
      title: 'Lines 17–18: top lane first, then down',
      body: 'Line 18 visits the lanes from `self.level` down to 0. `curr` never moves back, so each lane continues where the one above stopped.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5, 8, 9, 10, 11, 12, 14, 15, 16, 17, 18], lines: [17, 18] },
      metrics: startMetrics,
      changes: ['for i in range(self.level, -1, -1)'],
      scene: at(find('Level 1')),
    },
    {
      chapter: 'build',
      short: 'Ride',
      title: 'Lines 19–20: ride the lane while it stays below target',
      body: 'Line 19 checks that a next node exists on lane `i` and its key is smaller than the target. Line 20 moves there.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5, 8, 9, 10, 11, 12, 14, 15, 16, 17, 18, 19, 20], lines: [19, 20] },
      metrics: startMetrics,
      changes: ['while curr.forward[i] and curr.forward[i].key < target', 'curr = curr.forward[i]'],
      scene: at(1),
    },
    {
      chapter: 'build',
      short: 'Check',
      title: 'Lines 21–22: one step in, then compare',
      body: '`curr` ends on the last key smaller than the target. Line 21 steps to the next node on level 0, and line 22 checks that it holds the target.\n\nThat’s the whole search. Now let’s run it.',
      code: { view: 'final', lines: [21, 22] },
      metrics: startMetrics,
      changes: ['curr = curr.forward[0]', 'return curr is not None and curr.key == target'],
      scene: at(RUN.length - 2),
    },
    ...RUN,
    {
      chapter: 'why',
      short: 'Recap',
      title: 'About log n lanes, a couple of moves each',
      body: 'With coin-flip heights there are about `log₂ n` lanes and about 2 moves per lane: **`O(log n)` time on average**. Unlucky flips (every node on level 0) make it a plain list, **`O(n)` worst case**; the search itself uses **`O(1)` space**.\n\nSwitch to **🧪 Try your own** to search your own keys.',
      code: { view: 'final', lines: [18, 19, 20] },
      metrics: FINAL_METRICS,
      scene: { entities: scene({ ...BASE, hideVars: true, answer: 5, note: '~log₂ n lanes × ~2 moves\n→ O(log n) on average\nall level 0 → O(n) worst', noteTone: 'found' }) },
    },
    {
      chapter: 'why',
      short: 'Strict <',
      title: 'Why line 19 uses <, not <=',
      body: 'With `<=`, level 0 would move `curr` onto 17 itself, and line 21 would then step past it to 25: the search would say **False**.\n\nThat is the key decision: stop on the last key **smaller** than the target, so line 21 lands on the target if it exists.',
      code: { view: 'final', lines: [19, 21] },
      values: { 19: '<: stop before 17', 21: 'then one step onto 17' },
      metrics: FINAL_METRICS,
      scene: { entities: scene({ ...BASE, hideVars: true, curr: 5, i: 0, answer: 6, answerTone: 'miss', note: 'with <=: curr stops on 17\nline 21 steps on to 25\n→ returns False', noteTone: 'miss' }) },
    },
  ],
  trace: {
    title: 'Search your own skip list',
    inputs: [
      { name: 'keys', label: 'Keys (sorted for you)', kind: 'numbers', default: '3, 6, 9, 12, 17, 25' },
      { name: 'target', label: 'Target', kind: 'number', default: '17' },
    ],
    presets: [
      { label: 'Not in the list', values: { keys: '3, 6, 9, 12, 17, 25', target: '10' } },
      { label: 'Top-lane key', values: { keys: '3, 6, 9, 12, 17, 25', target: '12' } },
      { label: 'Smaller than all', values: { keys: '3, 6, 9, 12, 17, 25', target: '1' } },
      { label: 'Larger than all', values: { keys: '3, 6, 9, 12, 17, 25', target: '30' } },
      { label: 'One key', values: { keys: '5', target: '5' } },
    ],
    maxItems: 7,
    run: (values) => {
      const keys = values['keys'];
      const target = values['target'];
      if (!Array.isArray(keys) || keys.length === 0) throw new Error('Enter at least one key.');
      if (typeof target !== 'number') throw new Error('Enter a target.');
      return traceSearch(keys, target);
    },
  },
});
