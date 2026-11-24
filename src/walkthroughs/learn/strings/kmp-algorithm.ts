import { arr, defineWalkthrough, link, note, ptr, range, vars } from '../../../lib/walkthrough/helpers';
import { tableBesideArray } from '../../../lib/walkthrough/layout';
import type { Entity, Step, Tone } from '../../../lib/walkthrough/types';

const LPS_Y = 130;
const NOTE_Y = 260;

/** Letters travel as numbers so the trace can take them: 1 = A, 2 = B, …, 26 = Z. */
const letter = (code: number): string => String.fromCharCode(64 + code);
const word = (codes: readonly number[]): string => `"${codes.map(letter).join('')}"`;
const show = (values: readonly number[]): string => `[${values.join(', ')}]`;

interface KmpState {
  readonly pattern: readonly number[];
  /** The table as Python holds it right now; omitted before line 3 runs. */
  readonly lps?: readonly number[];
  readonly i?: number;
  readonly length?: number;
  /** Result of line 8's comparison between `pattern[i]` and `pattern[length]`. */
  readonly verdict?: 'match' | 'miss';
  /** Index in `lps` written this step. */
  readonly wrote?: number;
  /** The border drawn as two bands: its length and the index where its suffix copy ends. */
  readonly border?: { readonly size: number; readonly end: number };
  readonly done?: boolean;
  readonly showVars?: boolean;
  readonly note?: string;
  readonly noteTone?: Tone;
}

/** Scene: the pattern on top with `i` and `length`, the table `lps` under it, variables on the right. */
function scene(s: KmpState): Entity[] {
  const m = s.pattern.length;
  const entities: Entity[] = [];
  const patTones: Record<number, Tone> = {};
  const inLoop = s.i !== undefined && s.i < m && !s.done;
  if (inLoop && s.verdict) {
    patTones[s.i as number] = 'active';
    patTones[s.length ?? 0] = s.verdict === 'miss' ? 'miss' : 'compare';
  }
  entities.push(arr('pattern', 0, 0, s.pattern.map(letter), { label: 'pattern', tones: patTones, codeVar: 'pattern' }));

  if (s.border && s.border.size > 0) {
    entities.push(range('prefix', 'pattern', 0, s.border.size - 1, 'done'));
    entities.push(range('suffix', 'pattern', s.border.end - s.border.size + 1, s.border.end, 'compare'));
  }
  if (inLoop) {
    entities.push(ptr('i', 'pattern', s.i as number, 'i', { side: 'top', tone: 'active', codeVar: 'i' }));
    if (s.length !== undefined) entities.push(ptr('length', 'pattern', s.length, 'length', { side: 'bottom', tone: 'compare', codeVar: 'length' }));
    if (s.verdict && s.length !== undefined) {
      const from = { entity: 'pattern', index: s.i as number, side: 'top' as const };
      const to = { entity: 'pattern', index: s.length, side: 'top' as const };
      const a = letter(s.pattern[s.i as number] ?? 0);
      const b = letter(s.pattern[s.length] ?? 0);
      if (s.verdict === 'match') entities.push(link('look', from, to, { label: `${a} = ${b}`, tone: 'found', flow: true }));
      else entities.push(link('look', from, to, { label: `${a} ≠ ${b}`, tone: 'miss', dashed: true }));
    }
  }
  if (s.lps) {
    const tones: Record<number, Tone> = {};
    const filled = s.done ? m : (s.i ?? 0);
    for (let k = 0; k < filled; k += 1) tones[k] = s.done ? 'found' : 'done';
    if (s.wrote !== undefined) tones[s.wrote] = 'active';
    entities.push(arr('lps', 0, LPS_Y, s.lps, { label: 'lps', tones, codeVar: 'lps' }));
  }
  if (s.showVars) {
    const dash = (v: number | undefined): number | string => v ?? '—';
    entities.push(
      vars(
        'vals',
        tableBesideArray(m, 3),
        0,
        [
          { name: 'm', value: m },
          { name: 'length', value: dash(s.length), tone: s.length === undefined ? 'muted' : 'default' },
          { name: 'i', value: s.done ? '—' : dash(s.i), tone: s.i === undefined || s.done ? 'muted' : 'default' },
        ],
        { label: 'variables', width: 180 },
      ),
    );
  }
  if (s.note) entities.push(note('note', 0, NOTE_Y, s.note, { tone: s.noteTone ?? 'note' }));
  return entities;
}

/** Runs compute_lps on any pattern and records one step per decision (chapter "run", final code). */
function traceLps(pattern: readonly number[]): Step[] {
  const m = pattern.length;
  const steps: Step[] = [];
  let compares = 0;
  let fallbacks = 0;
  const metrics = (result: string = '—'): Record<string, string | number> => ({ compares, fallbacks, result });
  const lps = new Array<number>(m).fill(0);
  let length = 0;
  let i = 1;
  const base = { pattern, showVars: true };

  steps.push({
    chapter: 'run',
    short: 'Table',
    title: `An empty table for ${word(pattern)}`,
    body: `Line 2: \`m = ${m}\`. Line 3: \`lps\` gets ${m} slots, all 0. \`lps[0]\` stays 0 for good, because a single letter has no proper prefix.`,
    code: { view: 'final', lines: [2, 3] },
    values: { 2: `m = ${m}`, 3: `lps = ${show(lps)}` },
    metrics: metrics(),
    scene: { entities: scene({ pattern, showVars: true, lps: [...lps] }) },
  });
  steps.push({
    chapter: 'run',
    short: 'Pointers',
    title: 'length = 0, i = 1',
    body: `Line 4: \`length = 0\`, no border matched yet. Line 5: \`i = 1\`, the first letter that can have one. \`i\` reads forward and never goes back.`,
    code: { view: 'final', lines: [4, 5] },
    values: { 4: 'length = 0', 5: 'i = 1' },
    metrics: metrics(),
    scene: { entities: scene({ ...base, lps: [...lps], i, length }) },
  });

  while (i < m) {
    const a = pattern[i] ?? 0;
    const b = pattern[length] ?? 0;
    compares += 1;
    const match = a === b;
    steps.push({
      chapter: 'run',
      short: `Compare i=${i}`,
      title: `${letter(a)} vs ${letter(b)}: ${match ? 'the border grows' : 'the border breaks'}`,
      body: `Line 7: \`i = ${i}\` is inside the pattern. Line 8 compares \`pattern[${i}] = ${letter(a)}\` with \`pattern[${length}] = ${letter(b)}\`, the letter right after the current border${length === 0 ? ' (empty)' : ` (length ${length})`}. ${match ? 'They are equal.' : 'They differ.'}`,
      code: { view: 'final', lines: [7, 8] },
      values: { 7: `${i} < ${m} → True`, 8: `${letter(a)} == ${letter(b)} → ${match ? 'True' : 'False'}` },
      metrics: metrics(),
      scene: { entities: scene({ ...base, lps: [...lps], i, length, verdict: match ? 'match' : 'miss', border: { size: length, end: i - 1 } }) },
    });
    if (match) {
      length += 1;
      lps[i] = length;
      const wrote = i;
      i += 1;
      steps.push({
        chapter: 'run',
        short: `lps[${wrote}] = ${length}`,
        title: `Border extended: lps[${wrote}] = ${length}`,
        body: `Lines 9–11: \`length\` becomes ${length}, \`lps[${wrote}] = ${length}\` (the first ${length} letters ${word(pattern.slice(0, length))} are also the last ${length} of the prefix ending at ${wrote}), and \`i\` moves on to ${i}.`,
        code: { view: 'final', lines: [9, 10, 11] },
        values: { 9: `length = ${length}`, 10: `lps[${wrote}] = ${length}`, 11: `i = ${i}` },
        metrics: metrics(),
        scene: { entities: scene({ ...base, lps: [...lps], i, length, wrote, border: { size: length, end: wrote } }) },
      });
    } else if (length !== 0) {
      const old = length;
      length = lps[old - 1] ?? 0;
      fallbacks += 1;
      steps.push({
        chapter: 'run',
        short: 'Fall back',
        title: `Fall back: length = lps[${old - 1}] = ${length}`,
        body: `Line 12: the border isn’t empty, so line 13 doesn’t give up. The next-shorter border of ${word(pattern.slice(0, old))} is already in the table: \`lps[${old - 1}] = ${length}\`. \`i\` stays at ${i}, so the same letter is tried again against \`pattern[${length}]\`.`,
        code: { view: 'final', lines: [12, 13] },
        values: { 12: `${old} != 0 → True`, 13: `length = lps[${old - 1}] = ${length}` },
        metrics: metrics(),
        scene: { entities: scene({ ...base, lps: [...lps], i, length, border: { size: length, end: i - 1 }, note: `border ${old} → ${length}\nstill reading letter ${i}` }) },
      });
    } else {
      const at = i;
      i += 1;
      steps.push({
        chapter: 'run',
        short: 'No border',
        title: `No border ends at ${at}: lps[${at}] stays 0`,
        body: `Lines 12 and 14: \`length\` is already 0, so there is nothing shorter to fall back to. Line 15 just moves \`i\` on to ${i}. \`lps[${at}]\` keeps its 0.`,
        code: { view: 'final', lines: [14, 15] },
        values: { 14: 'length == 0', 15: `i = ${i}` },
        metrics: metrics(),
        scene: { entities: scene({ ...base, lps: [...lps], i, length, wrote: at }) },
      });
    }
  }

  steps.push({
    chapter: 'run',
    short: 'Return',
    title: `lps = ${show(lps)}`,
    body: `Line 7: \`i = ${i}\` is no longer below \`m = ${m}\`, so the loop ends. Line 17 returns the table after ${compares} comparison${compares === 1 ? '' : 's'}, for a pattern of ${m} letters.`,
    code: { view: 'final', lines: [7, 17] },
    values: { 7: `${i} < ${m} → False`, 17: `return ${show(lps)}` },
    metrics: metrics(show(lps)),
    scene: { entities: scene({ ...base, lps: [...lps], i, length, done: true }) },
  });
  return steps;
}

const PATTERN = [1, 2, 1, 2, 3] as const;
const RUN = traceLps(PATTERN);
const startMetrics = { compares: 0, fallbacks: 0, result: '—' } as const;
const FINAL_METRICS = RUN.at(-1)?.metrics ?? startMetrics;
const TABLE = [0, 0, 1, 2, 0] as const;
const story = (extra: Partial<KmpState> = {}): Entity[] => scene({ pattern: PATTERN, ...extra });
const runScene = (index: number): { entities: readonly Entity[] } => RUN[index]?.scene ?? { entities: story() };

export default defineWalkthrough({
  id: 'learn/strings/kmp-algorithm',
  title: 'KMP, the prefix table that never lets the text rewind',
  summary: 'From the idea to the code: build the table of longest prefix-suffix lengths that lets a pattern match skip ahead on a mismatch instead of starting over.',
  minutes: 7,
  code: {
    lang: 'python',
    source: `def compute_lps(pattern: list[int]) -> list[int]:
    m = len(pattern)
    lps = [0] * m
    length = 0  # Length of the border matched so far
    i = 1

    while i < m:
        if pattern[i] == pattern[length]:
            length += 1
            lps[i] = length
            i += 1
        elif length != 0:
            length = lps[length - 1]  # Fall back to a shorter border; i stays
        else:
            i += 1  # No border at all: lps[i] stays 0

    return lps`,
  },
  snapshots: {
    brute: `def compute_lps(pattern: list[int]) -> list[int]:
    m = len(pattern)
    lps = [0] * m
    for i in range(1, m):
        for k in range(i, 0, -1):  # Try the longest border first
            if pattern[:k] == pattern[i - k + 1 : i + 1]:
                lps[i] = k
                break
    return lps`,
  },
  metrics: [
    { key: 'compares', label: 'Comparisons' },
    { key: 'fallbacks', label: 'Fall-backs' },
    { key: 'result', label: 'Returns' },
  ],
  legend: [
    { tone: 'active', label: 'letter at i' },
    { tone: 'compare', label: 'letter after the border / suffix copy' },
    { tone: 'done', label: 'border prefix / table slot filled' },
    { tone: 'found', label: 'equal letters / finished table' },
    { tone: 'miss', label: 'letters differ' },
  ],
  goals: [
    { text: 'Know what a prefix-suffix border is', step: 2 },
    { text: 'Reuse the table instead of recomputing it', step: 4 },
    { text: 'Follow every comparison and fall-back', step: 12 },
    { text: 'See why a mismatch never moves i back', step: 26 },
  ],
  steps: [
    {
      chapter: 'problem',
      short: 'The brief',
      title: 'Build the table for "ABABC"',
      body: 'Imagine reading a book for "ABABC". You matched `ABAB`, then the next letter is wrong. A careless reader rewinds to the start of the match; a clever one notices that `AB` at the end of what was read is also the **start** of the pattern, and carries on from there.\n\nLine 1 takes the pattern (`A = 1 … Z = 26`) and returns `lps`: for each prefix, the length of its longest proper prefix that is also its suffix. Here: `[0, 0, 1, 2, 0]`.',
      code: { view: 'signature', lines: [1] },
      metrics: startMetrics,
      scene: { entities: story({ note: 'pattern = "ABABC"\nanswer: lps = [0, 0, 1, 2, 0]' }) },
    },
    {
      chapter: 'idea',
      short: 'Border',
      title: 'lps[i] is the longest border of the prefix ending at i',
      body: 'A **border** is a proper prefix that is also a suffix. The prefix `"ABAB"` (up to `i = 3`) has border `"AB"`: its first two letters equal its last two.\n\nSo `lps[3] = 2`. After a mismatch in a search, those 2 letters are already matched: the pattern resumes at index 2 and the text pointer never rewinds.',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: { entities: story({ lps: [0, 0, 1, 2, 0], border: { size: 2, end: 3 }, note: '"ABAB": prefix AB = suffix AB\nlps[3] = 2' }) },
    },
    {
      chapter: 'idea',
      short: 'Try all',
      title: 'The obvious way: try every length at every index',
      body: 'Lines 5–6 test each prefix with every candidate border length `k`, longest first, slicing and comparing up to `k` letters each time: roughly **`O(m³)`**.\n\nThat throws away what we already know. The border at `i` isn’t independent of the border at `i − 1`.',
      code: { view: 'snapshot', id: 'brute', lines: [5, 6] },
      metrics: startMetrics,
      scene: { entities: story({ note: 'every i × every k × up to k letters\n→ about O(m³)', noteTone: 'miss' }) },
    },
    {
      chapter: 'idea',
      short: 'Extend',
      title: 'Build each border from the one before it',
      body: 'Suppose the border at `i − 1` has length `length`. If `pattern[i]` equals `pattern[length]`, that border grows by one letter.\n\nIf not, the only candidates left are shorter borders of that same border, and `lps[length − 1]` already stores the next-longest one. Fall back to it and try again, without moving `i`.',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: { entities: story({ note: 'equal → length + 1\ndifferent → length = lps[length − 1]\ni only ever moves forward' }) },
    },
    {
      chapter: 'build',
      short: 'Table',
      title: 'Lines 2–3: one slot per prefix',
      body: 'Line 2 measures the pattern. Line 3 creates `lps` with a 0 in every slot: 0 is the right answer whenever no border exists, so we only write when we find one.',
      code: { view: 'reveal', reveal: [1, 2, 3], lines: [2, 3] },
      metrics: startMetrics,
      changes: ['m = len(pattern)', 'lps = [0] * m'],
      scene: runScene(0),
    },
    {
      chapter: 'build',
      short: 'Pointers',
      title: 'Lines 4–5: length and i',
      body: 'Line 4: `length` is the border matched so far and starts at 0. Line 5: `i` starts at 1, because a one-letter prefix can’t have a proper border.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5], lines: [4, 5] },
      metrics: startMetrics,
      changes: ['length = 0', 'i = 1'],
      scene: runScene(1),
    },
    {
      chapter: 'build',
      short: 'Compare',
      title: 'Lines 7–8: does the border extend?',
      body: 'Line 7 loops until `i` has covered the pattern. Line 8 compares the letter at `i` with the letter right after the current border, `pattern[length]`.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5, 7, 8], lines: [7, 8] },
      metrics: startMetrics,
      changes: ['while i < m', 'if pattern[i] == pattern[length]'],
      scene: runScene(4),
    },
    {
      chapter: 'build',
      short: 'Extend',
      title: 'Lines 9–11: the border grows, record it',
      body: 'A match makes the border one letter longer (line 9). Line 10 records that length for this index, and line 11 moves on.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5, 7, 8, 9, 10, 11], lines: [9, 10, 11] },
      metrics: startMetrics,
      changes: ['length += 1', 'lps[i] = length', 'i += 1'],
      scene: runScene(5),
    },
    {
      chapter: 'build',
      short: 'Fall back',
      title: 'Lines 12–13: a shorter border, same i',
      body: 'On a mismatch with a non-empty border, line 13 swaps `length` for `lps[length − 1]`, the next-longest border. `i` is untouched: the same letter gets another chance against a shorter border.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12, 13], lines: [12, 13] },
      metrics: startMetrics,
      changes: ['elif length != 0', 'length = lps[length - 1]'],
      scene: runScene(9),
    },
    {
      chapter: 'build',
      short: 'No border',
      title: 'Lines 14–15: nothing left to fall back to',
      body: 'If `length` is already 0 there is no shorter border. `lps[i]` stays 0 and line 15 moves `i` on.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12, 13, 14, 15], lines: [14, 15] },
      metrics: startMetrics,
      changes: ['else', 'i += 1'],
      scene: runScene(3),
    },
    {
      chapter: 'build',
      short: 'Return',
      title: 'Line 17: return the table',
      body: 'Once `i` passes the last letter, line 17 returns `lps`.\n\nThat’s the whole function. Now let’s run it.',
      code: { view: 'final', lines: [17] },
      metrics: startMetrics,
      changes: ['return lps'],
      scene: { entities: story({ showVars: true, lps: [...TABLE], i: 5, length: 0, done: true }) },
    },
    ...RUN,
    {
      chapter: 'why',
      short: 'Recap',
      title: 'Linear time: i never goes back',
      body: 'Every loop turn either moves `i` forward or shrinks `length`. `length` can only grow by 1 when `i` grows by 1, so it can’t shrink more often than it grew: at most `2m` turns, **`O(m)` time**. The table costs **`O(m)` space**.\n\nSearching a text with this table costs another `O(n)`, for **`O(n + m)`** in total.',
      code: { view: 'final', lines: [7, 9, 13, 15] },
      metrics: FINAL_METRICS,
      scene: { entities: story({ showVars: true, lps: [...TABLE], i: 5, length: 0, done: true, note: 'i moves forward ≤ m times\nlength shrinks ≤ as often as it grew\n→ O(m) time, O(m) space', noteTone: 'found' }) },
    },
    {
      chapter: 'why',
      short: 'Keep i',
      title: 'Why a mismatch keeps i where it is',
      body: 'On line 13, `i` does not move: the letters before it are already known to match a border, so they never need to be read again. Only `length` shrinks, jumping straight to the next border in the table.\n\nThat is the key decision, and it is the same trick a KMP search uses to keep the text pointer from ever rewinding.',
      code: { view: 'final', lines: [12, 13] },
      values: { 12: 'mismatch, border not empty', 13: 'shorter border; i stays' },
      metrics: FINAL_METRICS,
      scene: { entities: story({ showVars: true, lps: [0, 0, 1, 2, 0], i: 4, length: 2, verdict: 'miss', border: { size: 2, end: 3 }, note: 'C ≠ A at length 2\nlength → lps[1] = 0, i stays 4\nno letter is read twice', noteTone: 'found' }) },
    },
  ],
  trace: {
    title: 'Build the table for your own pattern',
    inputs: [{ name: 'pattern', label: 'Pattern letters as numbers (1 = A … 26 = Z)', kind: 'numbers', default: '1, 2, 1, 2, 3' }],
    presets: [
      { label: 'ABABC', values: { pattern: '1, 2, 1, 2, 3' } },
      { label: 'AAAA', values: { pattern: '1, 1, 1, 1' } },
      { label: 'ABCD (no borders)', values: { pattern: '1, 2, 3, 4' } },
      { label: 'AABAAAB (fall back, then match)', values: { pattern: '1, 1, 2, 1, 1, 1, 2' } },
      { label: 'One letter', values: { pattern: '1' } },
    ],
    maxItems: 10,
    run: (values) => {
      const input = values['pattern'];
      if (!Array.isArray(input) || input.length === 0) throw new Error('Enter at least one letter.');
      if (input.some((v) => !Number.isInteger(v) || v < 1 || v > 26)) throw new Error('Use whole numbers from 1 (A) to 26 (Z).');
      return traceLps(input);
    },
  },
});
