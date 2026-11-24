import { arr, defineWalkthrough, link, note, ptr, range, vars } from '../../../lib/walkthrough/helpers';
import { tableBesideArray } from '../../../lib/walkthrough/layout';
import type { Entity, Step, Tone } from '../../../lib/walkthrough/types';

const Z_Y = 130;
const NOTE_Y = 260;

/** Letters travel as numbers so the trace can take them: 1 = a, 2 = b, …, 26 = z. */
const letter = (code: number): string => String.fromCharCode(96 + code);
const word = (codes: readonly number[]): string => `"${codes.map(letter).join('')}"`;
const show = (values: readonly number[]): string => `[${values.join(', ')}]`;

interface ZState {
  readonly s: readonly number[];
  /** The Z-array as Python holds it right now; omitted before line 3 runs. */
  readonly z?: readonly number[];
  readonly i?: number;
  /** The match box is `s[left:right]`; it equals the prefix `s[0:right - left]`. */
  readonly left?: number;
  readonly right?: number;
  /** A letter comparison on line 9: prefix letter `s[a]` against `s[b]`. */
  readonly cmp?: { readonly a: number; readonly b: number; readonly ok: boolean };
  /** Line 8 copied from this mirror index of the prefix. */
  readonly mirror?: number;
  /** Highlight `z[i]` as the cell being written. */
  readonly writing?: boolean;
  readonly done?: boolean;
  readonly showVars?: boolean;
  readonly note?: string;
  readonly noteTone?: Tone;
}

/** Scene: `s` on top with the match box, the Z-array under it, variables on the right. */
function scene(s: ZState): Entity[] {
  const n = s.s.length;
  const entities: Entity[] = [];
  const sTones: Record<number, Tone> = {};
  if (s.cmp) {
    sTones[s.cmp.a] = 'compare';
    sTones[s.cmp.b] = s.cmp.ok ? 'active' : 'miss';
  }
  entities.push(arr('s', 0, 0, s.s.map(letter), { label: 's', tones: sTones, codeVar: 's' }));

  const box = s.left !== undefined && s.right !== undefined && s.right > s.left;
  if (box) {
    entities.push(range('box', 's', s.left as number, (s.right as number) - 1, 'compare'));
    if (s.right !== undefined && s.left !== undefined && s.left > 0) entities.push(range('prefix', 's', 0, s.right - s.left - 1, 'done'));
  }
  if (s.i !== undefined && !s.done) entities.push(ptr('i', 's', s.i, 'i', { side: 'top', tone: 'compare', codeVar: 'i' }));
  if (s.cmp) {
    const from = { entity: 's', index: s.cmp.a, side: 'bottom' as const };
    const to = { entity: 's', index: s.cmp.b, side: 'bottom' as const };
    const x = letter(s.s[s.cmp.a] ?? 0);
    const y = letter(s.s[s.cmp.b] ?? 0);
    if (s.cmp.ok) entities.push(link('look', from, to, { label: `${x} = ${y}`, tone: 'found', flow: true }));
    else entities.push(link('look', from, to, { label: `${x} ≠ ${y}`, tone: 'miss', dashed: true }));
  } else if (s.mirror !== undefined && s.i !== undefined) {
    entities.push(link('look', { entity: 's', index: s.i, side: 'bottom' }, { entity: 's', index: s.mirror, side: 'bottom' }, { label: `z[${s.mirror}] = ${s.z?.[s.mirror] ?? 0}`, tone: 'compare' }));
  }
  if (s.z) {
    const tones: Record<number, Tone> = {};
    const filled = s.done ? n : (s.i ?? 0);
    for (let k = 0; k < filled; k += 1) tones[k] = s.done ? 'found' : 'done';
    if (s.i !== undefined && !s.done) tones[s.i] = s.writing ? 'active' : 'compare';
    entities.push(arr('z', 0, Z_Y, s.z, { label: 'z', tones, codeVar: 'z' }));
  }
  if (s.showVars) {
    const dash = (v: number | undefined): number | string => v ?? '—';
    entities.push(
      vars(
        'vals',
        tableBesideArray(n, 4),
        0,
        [
          { name: 'i', value: s.done ? '—' : dash(s.i), tone: s.i === undefined || s.done ? 'muted' : 'default' },
          { name: 'left', value: dash(s.left), tone: s.left === undefined ? 'muted' : 'default' },
          { name: 'right', value: dash(s.right), tone: s.right === undefined ? 'muted' : 'default' },
          { name: 'z[i]', value: s.i === undefined || s.done ? '—' : (s.z?.[s.i] ?? '—'), tone: s.i === undefined || s.done ? 'muted' : 'default' },
        ],
        { label: 'variables', width: 180 },
      ),
    );
  }
  if (s.note) entities.push(note('note', 0, NOTE_Y, s.note, { tone: s.noteTone ?? 'note' }));
  return entities;
}

/** Runs compute_z_array on any string and records one step per decision (chapter "run", final code). */
function traceZ(input: readonly number[]): Step[] {
  const s = input;
  const n = s.length;
  const steps: Step[] = [];
  let compares = 0;
  let copies = 0;
  const metrics = (result: string = '—'): Record<string, string | number> => ({ compares, copies, result });
  const z = new Array<number>(n).fill(0);
  let left = 0;
  let right = 0;
  const base = { s, showVars: true };

  steps.push({
    chapter: 'run',
    short: 'Z-array',
    title: `An empty Z-array for ${word(s)}`,
    body: `Line 2: \`n = ${n}\`. Line 3: \`z\` gets ${n} slots, all 0. \`z[0]\` stays 0 by convention: the whole string trivially matches itself, and the loop starts at 1.`,
    code: { view: 'final', lines: [2, 3] },
    values: { 2: `n = ${n}`, 3: `z = ${show(z)}` },
    metrics: metrics(),
    scene: { entities: scene({ s, showVars: true, z: [...z] }) },
  });
  steps.push({
    chapter: 'run',
    short: 'No box yet',
    title: 'left = right = 0: no match box yet',
    body: 'Line 4: the **box** `s[left:right]` is the rightmost stretch known to equal a prefix of `s`. Before anything is compared it is empty.',
    code: { view: 'final', lines: [4] },
    values: { 4: 'left = 0, right = 0' },
    metrics: metrics(),
    scene: { entities: scene({ ...base, z: [...z], left, right }) },
  });

  for (let i = 1; i < n; i += 1) {
    const inside = i < right;
    if (inside) {
      const mirror = i - left;
      const copied = Math.min(right - i, z[mirror] ?? 0);
      z[i] = copied;
      copies += 1;
      steps.push({
        chapter: 'run',
        short: `i = ${i} copy`,
        title: `Inside the box: z[${i}] starts at ${copied}`,
        body: `Line 6: \`i = ${i}\`. Line 7: \`${i} < ${right}\`, so \`i\` is inside the box. Inside it, the text looks like the prefix, and \`i\` mirrors index \`${i} − ${left} = ${mirror}\`, where \`z[${mirror}] = ${z[mirror]}\`. Line 8 copies that, but no more than the \`${right} − ${i} = ${right - i}\` letters the box still covers.`,
        code: { view: 'final', lines: [6, 7, 8] },
        values: { 6: `i = ${i}`, 7: `${i} < ${right} → True`, 8: `z[${i}] = min(${right - i}, z[${mirror}] = ${z[mirror]}) = ${copied}` },
        metrics: metrics(),
        scene: { entities: scene({ ...base, z: [...z], i, left, right, mirror, writing: true }) },
      });
    } else {
      steps.push({
        chapter: 'run',
        short: `i = ${i}`,
        title: `i = ${i} is outside the box: start from scratch`,
        body: `Line 6: \`i = ${i}\`. Line 7: \`${i} < ${right}\` is false, so the box tells us nothing about this position. \`z[${i}]\` stays 0 and has to be found by comparing letters.`,
        code: { view: 'final', lines: [6, 7] },
        values: { 6: `i = ${i}`, 7: `${i} < ${right} → False` },
        metrics: metrics(),
        scene: { entities: scene({ ...base, z: [...z], i, left, right }) },
      });
    }

    for (;;) {
      const k = z[i] ?? 0;
      if (i + k >= n) {
        steps.push({
          chapter: 'run',
          short: 'End of s',
          title: `i + z[${i}] = ${i + k} reaches the end`,
          body: `Line 9: \`${i} + ${k} < ${n}\` is false, so there is no letter left to compare. \`z[${i}]\` is final: ${k}.`,
          code: { view: 'final', lines: [9] },
          values: { 9: `${i} + ${k} < ${n} → False` },
          metrics: metrics(),
          scene: { entities: scene({ ...base, z: [...z], i, left, right }) },
        });
        break;
      }
      compares += 1;
      const a = s[k] ?? 0;
      const b = s[i + k] ?? 0;
      if (a !== b) {
        steps.push({
          chapter: 'run',
          short: `${letter(a)} ≠ ${letter(b)}`,
          title: `${letter(a)} vs ${letter(b)}: the match stops`,
          body: `Line 9: \`s[${k}] = ${letter(a)}\` (the prefix) against \`s[${i + k}] = ${letter(b)}\`. They differ, so \`z[${i}]\` is final: ${k}.`,
          code: { view: 'final', lines: [9] },
          values: { 9: `${letter(a)} == ${letter(b)} → False` },
          metrics: metrics(),
          scene: { entities: scene({ ...base, z: [...z], i, left, right, cmp: { a: k, b: i + k, ok: false } }) },
        });
        break;
      }
      z[i] = k + 1;
      steps.push({
        chapter: 'run',
        short: `${letter(a)} = ${letter(b)}`,
        title: `${letter(a)} = ${letter(b)}: z[${i}] grows to ${k + 1}`,
        body: `Line 9: \`s[${k}] = ${letter(a)}\` (the prefix) equals \`s[${i + k}] = ${letter(b)}\`. Line 10 extends the match: \`z[${i}] = ${k + 1}\`.`,
        code: { view: 'final', lines: [9, 10] },
        values: { 9: `${letter(a)} == ${letter(b)} → True`, 10: `z[${i}] = ${k + 1}` },
        metrics: metrics(),
        scene: { entities: scene({ ...base, z: [...z], i, left, right, cmp: { a: k, b: i + k, ok: true }, writing: true }) },
      });
    }

    const reach = i + (z[i] ?? 0);
    if (reach > right) {
      const oldRight = right;
      left = i;
      right = reach;
      steps.push({
        chapter: 'run',
        short: 'New box',
        title: right > left ? `A new box: s[${left}:${right}]` : `An empty box at ${left}`,
        body: `Line 11: \`${i} + ${z[i]} = ${reach}\` is past \`right = ${oldRight}\`. Line 12 makes this match the new box: \`left = ${left}\`, \`right = ${right}\`. ${right > left ? 'It reaches further right than the old one, so later positions can reuse it.' : 'It is empty because `z[i]` is 0, so nothing can be reused from it.'}`,
        code: { view: 'final', lines: [11, 12] },
        values: { 11: `${i} + ${z[i]} = ${reach} > ${oldRight} → True`, 12: `left, right = ${left}, ${right}` },
        metrics: metrics(),
        scene: { entities: scene({ ...base, z: [...z], i, left, right }) },
      });
    } else {
      steps.push({
        chapter: 'run',
        short: 'Keep box',
        title: `Keep the box s[${left}:${right}]`,
        body: `Line 11: \`${i} + ${z[i]} = ${reach}\` doesn’t get past \`right = ${right}\`. The old box still reaches furthest, so line 12 is skipped.`,
        code: { view: 'final', lines: [11] },
        values: { 11: `${i} + ${z[i]} = ${reach} > ${right} → False` },
        metrics: metrics(),
        scene: { entities: scene({ ...base, z: [...z], i, left, right }) },
      });
    }
  }

  steps.push({
    chapter: 'run',
    short: 'Return',
    title: `z = ${show(z)}`,
    body: `Line 6 has no index left, so the loop ends. Line 13 returns the Z-array: ${compares} letter comparisons and ${copies} copies from a mirror for a string of ${n} letters.`,
    code: { view: 'final', lines: [6, 13] },
    values: { 6: 'loop done', 13: `return ${show(z)}` },
    metrics: metrics(show(z)),
    scene: { entities: scene({ ...base, z: [...z], left, right, done: true }) },
  });
  return steps;
}

const S = [1, 2, 1, 3, 1, 2, 1] as const;
const RUN = traceZ(S);
const startMetrics = { compares: 0, copies: 0, result: '—' } as const;
const FINAL_METRICS = RUN.at(-1)?.metrics ?? startMetrics;
const Z = [0, 0, 1, 0, 3, 0, 1] as const;
const story = (extra: Partial<ZState> = {}): Entity[] => scene({ s: S, ...extra });
const runScene = (index: number): { entities: readonly Entity[] } => RUN[index]?.scene ?? { entities: story() };

export default defineWalkthrough({
  id: 'learn/strings/z-algorithm',
  title: 'Z-Algorithm, reuse what the prefix already told you',
  summary: 'From the idea to the code: for every position, how far does the text match the start of the string? A match box lets later positions copy answers instead of comparing again.',
  minutes: 7,
  code: {
    lang: 'python',
    source: `def compute_z_array(s: list[int]) -> list[int]:
    n = len(s)
    z = [0] * n
    left = right = 0  # s[left:right] is the rightmost stretch matching a prefix

    for i in range(1, n):
        if i < right:
            z[i] = min(right - i, z[i - left])  # Copy the mirror's answer, clipped
        while i + z[i] < n and s[z[i]] == s[i + z[i]]:
            z[i] += 1
        if i + z[i] > right:
            left, right = i, i + z[i]  # This match reaches furthest: new box
    return z`,
  },
  snapshots: {
    brute: `def compute_z_array(s: list[int]) -> list[int]:
    n = len(s)
    z = [0] * n
    for i in range(1, n):
        while i + z[i] < n and s[z[i]] == s[i + z[i]]:
            z[i] += 1  # Starts comparing from zero at every i
    return z`,
  },
  metrics: [
    { key: 'compares', label: 'Letter compares' },
    { key: 'copies', label: 'Mirror copies' },
    { key: 'result', label: 'Returns' },
  ],
  legend: [
    { tone: 'active', label: 'letter that matched / cell being written' },
    { tone: 'compare', label: 'match box / prefix letter / current cell' },
    { tone: 'done', label: 'prefix copy of the box / finished cell' },
    { tone: 'found', label: 'equal letters / finished array' },
    { tone: 'miss', label: 'letters differ' },
  ],
  goals: [
    { text: 'Know what z[i] means', step: 2 },
    { text: 'Copy a mirror’s answer instead of comparing', step: 4 },
    { text: 'Follow every comparison, copy and new box', step: 11 },
    { text: 'See why the clip by right − i is needed', step: 37 },
  ],
  steps: [
    {
      chapter: 'problem',
      short: 'The brief',
      title: 'Z-array of "abacaba"',
      body: 'Picture a wallpaper that repeats its first emblem. For every door `i` down the hall, how many symbols in a row match the **start** of the wallpaper?\n\nLine 1 takes the string (`a = 1 … z = 26`) and returns `z`, where `z[i]` is how long `s[i:]` matches a prefix of `s`. Here: `[0, 0, 1, 0, 3, 0, 1]`.',
      code: { view: 'signature', lines: [1] },
      metrics: startMetrics,
      scene: { entities: story({ note: 's = "abacaba"\nanswer: z = [0, 0, 1, 0, 3, 0, 1]' }) },
    },
    {
      chapter: 'idea',
      short: 'Meaning',
      title: 'z[4] = 3: "aba" at index 4 is the prefix "aba"',
      body: 'Compare `s[4:]` = `"aba"` with the start of `s`: all 3 letters agree, so `z[4] = 3`. At `i = 3`, `"c"` already differs from `"a"`, so `z[3] = 0`.\n\nA pattern search uses this: join `pattern + "$" + text` and every `z[i]` equal to the pattern length is a match.',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: { entities: story({ z: [...Z], left: 4, right: 7, note: 'z[4] = 3\n"aba" at 4 = prefix "aba"' }).filter((e) => e.id !== 'i') },
    },
    {
      chapter: 'idea',
      short: 'Restart',
      title: 'The obvious way: compare from zero at every index',
      body: 'Lines 5–6 start a fresh comparison at each `i`. A string like `"aaaa…"` makes every position re-compare almost everything: **`O(n²)`**.\n\nBut positions inside a long match already know a lot about each other.',
      code: { view: 'snapshot', id: 'brute', lines: [5, 6] },
      metrics: startMetrics,
      scene: { entities: story({ note: 'each i compares up to n letters\n"aaaa…" → O(n²)', noteTone: 'miss' }) },
    },
    {
      chapter: 'idea',
      short: 'The box',
      title: 'Inside a match, copy from the mirror',
      body: 'Say `s[4:7]` equals the prefix `s[0:3]`: that is the **box**, `left = 4`, `right = 7`. For `i = 5`, the text there looks like the prefix at index `5 − 4 = 1`, so `z[5]` starts at `z[1]`.\n\nOnly `right − i` letters are covered by the box, so the copy is clipped: `z[i] = min(right − i, z[i − left])`. Beyond `right`, nothing is known and we compare letters.',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: { entities: story({ z: [0, 0, 1, 0, 3, 0, 1], i: 5, left: 4, right: 7, mirror: 1, note: 'z[5] = min(7 − 5, z[5 − 4])\n      = min(2, z[1] = 0) = 0\nno letters compared at all' }) },
    },
    {
      chapter: 'build',
      short: 'Array',
      title: 'Lines 2–3: one slot per position',
      body: 'Line 2 measures the string. Line 3 starts every answer at 0, which is right for positions that match nothing.',
      code: { view: 'reveal', reveal: [1, 2, 3], lines: [2, 3] },
      metrics: startMetrics,
      changes: ['n = len(s)', 'z = [0] * n'],
      scene: runScene(0),
    },
    {
      chapter: 'build',
      short: 'The box',
      title: 'Line 4: left and right, an empty box',
      body: 'Line 4 remembers the match that reaches **furthest right** so far, as the slice `s[left:right]`. It starts empty.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4], lines: [4] },
      metrics: startMetrics,
      changes: ['left = right = 0'],
      scene: runScene(1),
    },
    {
      chapter: 'build',
      short: 'Copy',
      title: 'Lines 6–8: inside the box, copy first',
      body: 'Line 6 visits every index from 1. Line 7 asks whether `i` is inside the box. If so, line 8 starts `z[i]` at the mirror’s answer `z[i − left]`, clipped to what the box covers.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 6, 7, 8], lines: [6, 7, 8] },
      metrics: startMetrics,
      changes: ['for i in range(1, n)', 'if i < right', 'z[i] = min(right - i, z[i - left])'],
      scene: runScene(18),
    },
    {
      chapter: 'build',
      short: 'Extend',
      title: 'Lines 9–10: keep comparing letters',
      body: 'Whatever was copied is a lower bound. Line 9 checks the next letter: the prefix letter `s[z[i]]` against `s[i + z[i]]`, staying inside the string. While they agree, line 10 grows the match.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 6, 7, 8, 9, 10], lines: [9, 10] },
      metrics: startMetrics,
      changes: ['while i + z[i] < n and s[z[i]] == s[i + z[i]]', 'z[i] += 1'],
      scene: runScene(13),
    },
    {
      chapter: 'build',
      short: 'New box',
      title: 'Lines 11–12: the match that goes furthest becomes the box',
      body: 'If `i + z[i]` reaches past `right`, this match is the new rightmost one: line 12 moves the box to `s[i : i + z[i]]`. Later positions then copy from it.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 6, 7, 8, 9, 10, 11, 12], lines: [11, 12] },
      metrics: startMetrics,
      changes: ['if i + z[i] > right', 'left, right = i, i + z[i]'],
      scene: runScene(17),
    },
    {
      chapter: 'build',
      short: 'Return',
      title: 'Line 13: return the Z-array',
      body: 'After the last index, line 13 returns `z`.\n\nThat’s the whole function. Now let’s run it.',
      code: { view: 'final', lines: [13] },
      metrics: startMetrics,
      changes: ['return z'],
      scene: { entities: story({ showVars: true, z: [...Z], left: 4, right: 7, done: true }) },
    },
    ...RUN,
    {
      chapter: 'why',
      short: 'Recap',
      title: 'Linear time: right only moves forward',
      body: 'A letter comparison only happens at or past `right`. Each successful one pushes `right` forward, and `right` never moves back, so there are at most `n` successful comparisons plus one failure per index: **`O(n)` time**. The array costs **`O(n)` space**.\n\nFor a search, build `pattern + "$" + text` first: **`O(n + m)`** time.',
      code: { view: 'final', lines: [8, 9, 11] },
      metrics: FINAL_METRICS,
      scene: { entities: story({ showVars: true, z: [...Z], left: 4, right: 7, done: true, note: 'compares only at or past right\nright never moves back\n→ O(n) time, O(n) space', noteTone: 'found' }) },
    },
    {
      chapter: 'why',
      short: 'Clip',
      title: 'Why the copy is clipped at right − i',
      body: 'The mirror’s answer `z[i − left]` may be longer than the box. Past `right` we know nothing, so copying all of it could claim letters we never checked.\n\nThat is the key decision on line 8: `min(right − i, z[i − left])`. The copy is trusted up to the box edge, and line 9 compares honestly from there.',
      code: { view: 'final', lines: [8, 9] },
      values: { 8: 'trust the copy only inside the box', 9: 'compare honestly beyond it' },
      metrics: FINAL_METRICS,
      scene: { entities: story({ showVars: true, z: [...Z], i: 5, left: 4, right: 7, mirror: 1, note: 'copy: trusted up to right\nbeyond right: compare letters\nso the answer is always exact', noteTone: 'found' }) },
    },
  ],
  trace: {
    title: 'Build the Z-array for your own string',
    inputs: [{ name: 's', label: 'Letters as numbers (1 = a … 26 = z)', kind: 'numbers', default: '1, 2, 1, 3, 1, 2, 1' }],
    presets: [
      { label: 'abacaba', values: { s: '1, 2, 1, 3, 1, 2, 1' } },
      { label: 'aaaaa (all match)', values: { s: '1, 1, 1, 1, 1' } },
      { label: 'abcde (no match)', values: { s: '1, 2, 3, 4, 5' } },
      { label: 'abcabcab (repeats)', values: { s: '1, 2, 3, 1, 2, 3, 1, 2' } },
      { label: 'One letter', values: { s: '1' } },
    ],
    maxItems: 10,
    run: (values) => {
      const input = values['s'];
      if (!Array.isArray(input) || input.length === 0) throw new Error('Enter at least one letter.');
      if (input.some((v) => !Number.isInteger(v) || v < 1 || v > 26)) throw new Error('Use whole numbers from 1 (a) to 26 (z).');
      return traceZ(input);
    },
  },
});
