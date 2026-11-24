import { arr, defineWalkthrough, link, note, ptr, range, vars } from '../../../lib/walkthrough/helpers';
import { tableBesideArray } from '../../../lib/walkthrough/layout';
import type { Entity, Step, Tone } from '../../../lib/walkthrough/types';

const P_Y = 130;
const RESULT_Y = 260;

/** Letters travel as numbers so the trace can take them: 1 = a, 2 = b, …, 26 = z. */
const letter = (code: number): string => String.fromCharCode(96 + code);
/** How a cell of `t` is drawn: 0 is a divider, -1 and -2 are the guards at both ends. */
const sym = (v: number): string => (v === 0 ? '#' : v === -1 ? '^' : v === -2 ? '$' : letter(v));
const word = (codes: readonly number[]): string => `"${codes.map(letter).join('')}"`;
const show = (values: readonly number[]): string => `[${values.join(', ')}]`;
const spell = (t: readonly number[]): string => t.map(sym).join(' ');

/** Builds `t` exactly as lines 2–5 do: a divider between and around the letters, guards at both ends. */
function transform(s: readonly number[]): number[] {
  const t = [-1, 0];
  for (const ch of s) t.push(ch, 0);
  t.push(-2);
  return t;
}

interface ManState {
  readonly t: readonly number[];
  /** The radius array as Python holds it right now; omitted before line 7 runs. */
  readonly p?: readonly number[];
  readonly i?: number;
  readonly c?: number;
  readonly r?: number;
  /** A comparison on line 13: the cells `t[i + 1 + p[i]]` and `t[i - 1 - p[i]]`. */
  readonly cmp?: { readonly left: number; readonly right: number; readonly ok: boolean };
  /** Line 12 copied from this mirror index. */
  readonly mirror?: number;
  readonly writing?: boolean;
  /** Final answer: the chosen centre and radius, and the returned letters. */
  readonly best?: { readonly center: number; readonly radius: number };
  readonly result?: readonly number[];
  readonly showVars?: boolean;
  readonly note?: string;
  readonly noteTone?: Tone;
}

/** Scene: `t` on top with the centre band, the radii `p` under it, variables on the right. */
function scene(s: ManState): Entity[] {
  const n = s.t.length;
  const entities: Entity[] = [];
  const tTones: Record<number, Tone> = {};
  if (s.cmp) {
    tTones[s.cmp.left] = s.cmp.ok ? 'compare' : 'miss';
    tTones[s.cmp.right] = s.cmp.ok ? 'active' : 'miss';
  }
  if (s.mirror !== undefined) tTones[s.mirror] = 'compare';
  entities.push(arr('t', 0, 0, s.t.map(sym), { label: 't', tones: tTones, codeVar: 't' }));

  if (s.best) {
    entities.push(range('box', 't', s.best.center - s.best.radius, s.best.center + s.best.radius, 'found'));
  } else if (s.c !== undefined && s.r !== undefined && s.r > s.c) {
    entities.push(range('box', 't', 2 * s.c - s.r, s.r, 'compare'));
    entities.push(ptr('c', 't', s.c, 'c', { side: 'bottom', tone: 'done', codeVar: 'c' }));
  }
  if (s.i !== undefined && !s.best) {
    entities.push(ptr('i', 't', s.i, 'i', { side: 'top', tone: 'compare', codeVar: 'i' }));
    const pi = s.p?.[s.i] ?? 0;
    if (pi > 0) entities.push(range('grown', 't', s.i - pi, s.i + pi, 'done'));
  }
  if (s.cmp && s.i !== undefined) {
    const from = { entity: 't', index: s.cmp.left, side: 'bottom' as const };
    const to = { entity: 't', index: s.cmp.right, side: 'bottom' as const };
    const a = sym(s.t[s.cmp.left] ?? 0);
    const b = sym(s.t[s.cmp.right] ?? 0);
    if (s.cmp.ok) entities.push(link('look', from, to, { label: `${a} = ${b}`, tone: 'found', flow: true }));
    else entities.push(link('look', from, to, { label: `${a} ≠ ${b}`, tone: 'miss', dashed: true }));
  } else if (s.mirror !== undefined && s.i !== undefined) {
    entities.push(link('look', { entity: 't', index: s.i, side: 'bottom' }, { entity: 't', index: s.mirror, side: 'bottom' }, { label: `p[${s.mirror}] = ${s.p?.[s.mirror] ?? 0}`, tone: 'compare' }));
  }
  if (s.p) {
    const tones: Record<number, Tone> = {};
    const filled = s.best ? n : (s.i ?? 0);
    for (let k = 0; k < filled; k += 1) tones[k] = s.best ? 'done' : 'done';
    if (s.best) tones[s.best.center] = 'found';
    else if (s.i !== undefined) tones[s.i] = s.writing ? 'active' : 'compare';
    entities.push(arr('p', 0, P_Y, s.p, { label: 'p', tones, codeVar: 'p' }));
  }
  if (s.result) entities.push(arr('result', 0, RESULT_Y, s.result.map(letter), { label: 'returned slice of s', tones: Object.fromEntries(s.result.map((_, k) => [k, 'found' as Tone])) }));
  if (s.showVars) {
    const dash = (v: number | undefined): number | string => v ?? '—';
    const live = s.i !== undefined && !s.best;
    entities.push(
      vars(
        'vals',
        tableBesideArray(n, 4),
        0,
        [
          { name: 'i', value: live ? dash(s.i) : '—', tone: live ? 'default' : 'muted' },
          { name: 'c', value: dash(s.c), tone: s.c === undefined ? 'muted' : 'default' },
          { name: 'r', value: dash(s.r), tone: s.r === undefined ? 'muted' : 'default' },
          { name: 'p[i]', value: live ? (s.p?.[s.i as number] ?? '—') : '—', tone: live ? 'default' : 'muted' },
        ],
        { label: 'variables', width: 180 },
      ),
    );
  }
  if (s.note) entities.push(note('note', 0, s.result ? 380 : RESULT_Y, s.note, { tone: s.noteTone ?? 'note' }));
  return entities;
}

/** Runs longest_palindrome on any letters and records one step per decision (chapter "run", final code). */
function traceManacher(input: readonly number[]): Step[] {
  const t = transform(input);
  const n = t.length;
  const steps: Step[] = [];
  let compares = 0;
  let copies = 0;
  const metrics = (result: string = '—'): Record<string, string | number> => ({ compares, copies, result });
  const p = new Array<number>(n).fill(0);
  let c = 0;
  let r = 0;
  const base = { t, showVars: true };

  steps.push({
    chapter: 'run',
    short: 'Dividers',
    title: `${word(input)} becomes t = ${spell(t)}`,
    body: `Lines 2–5 put a divider \`#\` (0) before, between and after the letters, plus guards \`^\` (−1) and \`$\` (−2) at the two ends. Every palindrome of \`s\` is now **odd-length** around one cell of \`t\`: a letter for odd ones, a divider for even ones. The guards never equal anything, so scans stop on their own.`,
    code: { view: 'final', lines: [2, 3, 4, 5] },
    values: { 5: `t = ${spell(t)}` },
    metrics: metrics(),
    scene: { entities: scene({ t }) },
  });
  steps.push({
    chapter: 'run',
    short: 'Radii',
    title: `${n} radii, all 0 for now`,
    body: `Line 6: \`n = ${n}\`, the length of \`t\`. Line 7: \`p\` gets ${n} zeros. \`p[i]\` will be how far the palindrome centred at \`t[i]\` reaches to each side, which is also its length in \`s\`.`,
    code: { view: 'final', lines: [6, 7] },
    values: { 6: `n = ${n}`, 7: `p = ${show(p)}` },
    metrics: metrics(),
    scene: { entities: scene({ ...base, p: [...p] }) },
  });
  steps.push({
    chapter: 'run',
    short: 'c = r = 0',
    title: 'No centre yet: c = r = 0',
    body: 'Line 8 remembers the palindrome that reaches furthest right: its centre `c` and its right edge `r`. Before any scan there is none.',
    code: { view: 'final', lines: [8] },
    values: { 8: 'c = 0, r = 0' },
    metrics: metrics(),
    scene: { entities: scene({ ...base, p: [...p], c, r }) },
  });

  for (let i = 1; i < n - 1; i += 1) {
    if (i < r) {
      const mirror = 2 * c - i;
      const copied = Math.min(r - i, p[mirror] ?? 0);
      p[i] = copied;
      copies += 1;
      steps.push({
        chapter: 'run',
        short: `i = ${i} copy`,
        title: `Inside the palindrome: p[${i}] starts at ${copied}`,
        body: `Line 10: \`i = ${i}\`. Line 11: \`${i} < ${r}\`, so \`i\` sits inside the palindrome centred at \`c = ${c}\`. Its mirror image across \`c\` is \`2·${c} − ${i} = ${mirror}\`, where \`p[${mirror}] = ${p[mirror]}\`. Line 12 copies that, clipped to the \`${r} − ${i} = ${r - i}\` cells the palindrome still covers.`,
        code: { view: 'final', lines: [10, 11, 12] },
        values: { 10: `i = ${i}`, 11: `${i} < ${r} → True`, 12: `p[${i}] = min(${r - i}, p[${mirror}] = ${p[mirror]}) = ${copied}` },
        metrics: metrics(),
        scene: { entities: scene({ ...base, p: [...p], i, c, r, mirror, writing: true }) },
      });
    } else {
      steps.push({
        chapter: 'run',
        short: `i = ${i}`,
        title: `i = ${i} is outside the palindrome: scan from scratch`,
        body: `Line 10: \`i = ${i}\`, the cell \`${sym(t[i] ?? 0)}\`. Line 11: \`${i} < ${r}\` is false, so nothing is known about this centre. \`p[${i}]\` starts at 0.`,
        code: { view: 'final', lines: [10, 11] },
        values: { 10: `i = ${i}`, 11: `${i} < ${r} → False` },
        metrics: metrics(),
        scene: { entities: scene({ ...base, p: [...p], i, c, r }) },
      });
    }

    for (;;) {
      const k = p[i] ?? 0;
      const left = i - 1 - k;
      const right = i + 1 + k;
      compares += 1;
      const ok = t[left] === t[right];
      const a = sym(t[left] ?? 0);
      const b = sym(t[right] ?? 0);
      if (!ok) {
        steps.push({
          chapter: 'run',
          short: `${a} ≠ ${b}`,
          title: `${a} vs ${b}: the palindrome stops at ${k}`,
          body: `Line 13: \`t[${right}] = ${b}\` against \`t[${left}] = ${a}\`. They differ, so \`p[${i}]\` is final: ${k}.`,
          code: { view: 'final', lines: [13] },
          values: { 13: `${b} == ${a} → False` },
          metrics: metrics(),
          scene: { entities: scene({ ...base, p: [...p], i, c, r, cmp: { left, right, ok: false } }) },
        });
        break;
      }
      p[i] = k + 1;
      steps.push({
        chapter: 'run',
        short: `${a} = ${b}`,
        title: `${a} = ${b}: p[${i}] grows to ${k + 1}`,
        body: `Line 13: \`t[${right}] = ${b}\` equals \`t[${left}] = ${a}\`, so the palindrome around \`t[${i}]\` is one step wider. Line 14: \`p[${i}] = ${k + 1}\`.`,
        code: { view: 'final', lines: [13, 14] },
        values: { 13: `${b} == ${a} → True`, 14: `p[${i}] = ${k + 1}` },
        metrics: metrics(),
        scene: { entities: scene({ ...base, p: [...p], i, c, r, cmp: { left, right, ok: true }, writing: true }) },
      });
    }

    const reach = i + (p[i] ?? 0);
    if (reach > r) {
      const oldR = r;
      c = i;
      r = reach;
      steps.push({
        chapter: 'run',
        short: 'New centre',
        title: r > c ? `New furthest palindrome: c = ${c}, r = ${r}` : `A new empty centre at ${c}`,
        body: `Line 15: \`${i} + ${p[i]} = ${reach}\` is past \`r = ${oldR}\`. Line 16 makes this the new reference: \`c = ${c}\`, \`r = ${r}\`. ${r > c ? 'It reaches further right, so later cells can mirror across it.' : 'Its radius is 0, so there is nothing to mirror across yet.'}`,
        code: { view: 'final', lines: [15, 16] },
        values: { 15: `${i} + ${p[i]} = ${reach} > ${oldR} → True`, 16: `c, r = ${c}, ${r}` },
        metrics: metrics(),
        scene: { entities: scene({ ...base, p: [...p], i, c, r }) },
      });
    } else {
      steps.push({
        chapter: 'run',
        short: 'Keep centre',
        title: `Keep c = ${c}, r = ${r}`,
        body: `Line 15: \`${i} + ${p[i]} = ${reach}\` doesn’t get past \`r = ${r}\`. The old palindrome still reaches furthest, so line 16 is skipped.`,
        code: { view: 'final', lines: [15] },
        values: { 15: `${i} + ${p[i]} = ${reach} > ${r} → False` },
        metrics: metrics(),
        scene: { entities: scene({ ...base, p: [...p], i, c, r }) },
      });
    }
  }

  // The tuple max of line 18 picks the largest radius and, on ties, the rightmost centre.
  let radius = 0;
  let center = 0;
  p.forEach((v, k) => {
    if (v >= radius) {
      radius = v;
      center = k;
    }
  });
  const start = Math.floor((center - radius) / 2);
  const answer = input.slice(start, start + radius);
  steps.push({
    chapter: 'run',
    short: 'Best radius',
    title: `Largest radius ${radius}, centred at t[${center}]`,
    body: `Line 10 has no index left. Line 18 takes the biggest \`p\`: \`radius = ${radius}\` at \`center = ${center}\`${radius === 1 && input.length > 1 ? ' (every letter ties at 1, and the rightmost wins)' : ''}. A radius in \`t\` is exactly a length in \`s\`.`,
    code: { view: 'final', lines: [10, 18] },
    values: { 10: 'loop done', 18: `radius, center = ${radius}, ${center}` },
    metrics: metrics(),
    scene: { entities: scene({ ...base, p: [...p], best: { center, radius } }) },
  });
  steps.push({
    chapter: 'run',
    short: 'Start',
    title: `Back to s: start = (${center} − ${radius}) // 2 = ${start}`,
    body: `Line 19: \`t\` has two cells (a divider and a letter) for every letter of \`s\`, so halving the distance \`center − radius\` gives the palindrome’s first index in \`s\`.`,
    code: { view: 'final', lines: [19] },
    values: { 19: `start = (${center} − ${radius}) // 2 = ${start}` },
    metrics: metrics(),
    scene: { entities: scene({ ...base, p: [...p], best: { center, radius } }) },
  });
  steps.push({
    chapter: 'run',
    short: 'Return',
    title: `Return ${word(answer)}`,
    body: `Line 20 slices \`s[${start}:${start + radius}]\`: ${radius} letter${radius === 1 ? '' : 's'}, found with ${compares} comparisons and ${copies} copies from a mirror.`,
    code: { view: 'final', lines: [20] },
    values: { 20: `return ${word(answer)}` },
    metrics: metrics(word(answer)),
    scene: { entities: scene({ ...base, p: [...p], best: { center, radius }, result: answer }) },
  });
  return steps;
}

const S = [1, 2, 1] as const;
const RUN = traceManacher(S);
const startMetrics = { compares: 0, copies: 0, result: '—' } as const;
const FINAL_METRICS = RUN.at(-1)?.metrics ?? startMetrics;
const T = transform(S);
const P = [0, 0, 1, 0, 3, 0, 1, 0, 0] as const;
const story = (extra: Partial<ManState> = {}): Entity[] => scene({ t: T, ...extra });
const runScene = (index: number): { entities: readonly Entity[] } => RUN[index]?.scene ?? { entities: story() };

export default defineWalkthrough({
  id: 'learn/strings/manachers-algorithm',
  title: "Manacher's Algorithm, palindromes in linear time",
  summary: 'From the idea to the code: unify odd and even palindromes with dividers, then reuse the mirror image of every palindrome you already found instead of expanding again.',
  minutes: 8,
  code: {
    lang: 'python',
    source: `def longest_palindrome(s: list[int]) -> list[int]:
    t = [-1, 0]  # 0 is a divider; -1 and -2 guard the ends so scans stop on their own
    for ch in s:
        t += [ch, 0]  # Dividers make even palindromes odd-length too
    t.append(-2)
    n = len(t)
    p = [0] * n  # p[i] = radius of the palindrome centred at t[i]
    c = r = 0  # Centre and right edge of the palindrome reaching furthest right

    for i in range(1, n - 1):
        if i < r:
            p[i] = min(r - i, p[2 * c - i])  # Mirror's radius, clipped at r
        while t[i + 1 + p[i]] == t[i - 1 - p[i]]:
            p[i] += 1
        if i + p[i] > r:
            c, r = i, i + p[i]  # Reaches furthest right: new centre

    radius, center = max((v, k) for k, v in enumerate(p))
    start = (center - radius) // 2  # Undo the doubling to get an index in s
    return s[start : start + radius]`,
  },
  snapshots: {
    brute: `def longest_palindrome(s: list[int]) -> list[int]:
    best: list[int] = []
    for centre in range(2 * len(s) - 1):  # Every letter and every gap
        left, right = centre // 2, centre // 2 + centre % 2
        while left >= 0 and right < len(s) and s[left] == s[right]:
            left -= 1  # Expands from scratch for every centre
            right += 1
        if right - left - 1 > len(best):
            best = s[left + 1 : right]
    return best`,
  },
  metrics: [
    { key: 'compares', label: 'Compares' },
    { key: 'copies', label: 'Mirror copies' },
    { key: 'result', label: 'Returns' },
  ],
  legend: [
    { tone: 'active', label: 'matching cell / radius being written' },
    { tone: 'compare', label: 'furthest palindrome / its mirror / left cell' },
    { tone: 'done', label: 'palindrome grown at i / finished radius' },
    { tone: 'found', label: 'equal cells / the answer' },
    { tone: 'miss', label: 'cells differ' },
  ],
  goals: [
    { text: 'See why expanding every centre is slow', step: 2 },
    { text: 'Make every palindrome odd with dividers', step: 3 },
    { text: 'Reuse the mirror image of a palindrome', step: 4 },
    { text: 'Follow every copy, expansion and new centre', step: 12 },
    { text: 'Know why the copy is clipped at r', step: 43 },
  ],
  steps: [
    {
      chapter: 'problem',
      short: 'The brief',
      title: 'Longest palindrome in "aba"',
      body: 'Stand in a hall of mirrors: whatever is painted left of you appears flipped on your right. If a small flower sits at a mirror point, you know its twin exists without measuring it.\n\nLine 1 takes a string (`a = 1 … z = 26`) and returns its longest palindromic slice. Here: `"aba"`.',
      code: { view: 'signature', lines: [1] },
      metrics: startMetrics,
      scene: { entities: story({ note: 's = "aba"\nanswer: "aba"' }) },
    },
    {
      chapter: 'idea',
      short: 'Every centre',
      title: 'The obvious way: expand around every centre',
      body: 'Lines 4–7 try each of the `2n − 1` centres (each letter and each gap) and grow outward from scratch. A string of one repeated letter makes each expansion about `n` long: **`O(n²)`**.\n\nThe expansions throw away a lot: a centre inside a big palindrome is already half-explained by the other half.',
      code: { view: 'snapshot', id: 'brute', lines: [4, 5, 6, 7] },
      metrics: startMetrics,
      scene: { entities: story({ note: '2n − 1 centres, each grown from scratch\n→ O(n²) on "aaaa…"', noteTone: 'miss' }).filter((e) => e.id !== 'i') },
    },
    {
      chapter: 'idea',
      short: 'Dividers',
      title: 'Put a divider between every letter',
      body: 'Odd palindromes (`aba`) centre on a letter, even ones (`abba`) on a gap. To treat both the same, insert a divider `#` everywhere: `"aba"` becomes `# a # b # a #`. Now **every** palindrome has odd length, centred on one cell.\n\nTwo guards, `^` and `$`, sit at the ends and equal nothing, so no scan can run off the edge.',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: { entities: story({ note: '"aba" → ^ # a # b # a # $\nevery palindrome is odd-length now' }) },
    },
    {
      chapter: 'idea',
      short: 'Mirror',
      title: 'Inside a big palindrome, copy from the mirror',
      body: 'Say the palindrome centred at `c = 4` reaches `r = 7`. For `i = 5` inside it, the cell on the other side of `c` is `2c − i = 3`, and `p[3] = 0`, so `p[5]` starts at 0 without a single comparison.\n\nOnly `r − i` cells are covered, so the copy is clipped: `p[i] = min(r − i, p[2c − i])`. Beyond `r` the mirror knows nothing, so we compare cells.',
      code: { view: 'signature' },
      metrics: startMetrics,
      scene: { entities: story({ p: [...P], i: 5, c: 4, r: 7, mirror: 3, note: 'p[5] = min(7 − 5, p[2·4 − 5])\n     = min(2, p[3] = 0) = 0\nno comparison needed' }) },
    },
    {
      chapter: 'build',
      short: 'Dividers',
      title: 'Lines 2–4: add the dividers and guards',
      body: 'Line 2 starts `t` with the left guard `-1` and a divider `0`. Lines 3–4 append each letter followed by a divider.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4], lines: [2, 3, 4] },
      metrics: startMetrics,
      changes: ['t = [-1, 0]', 'for ch in s: t += [ch, 0]'],
      scene: runScene(0),
    },
    {
      chapter: 'build',
      short: 'Right guard',
      title: 'Lines 5–6: close with the right guard, measure t',
      body: 'Line 5 adds the right guard `-2`; line 6 measures the finished `t`. For `"aba"` it has 9 cells.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5, 6], lines: [5, 6] },
      metrics: startMetrics,
      changes: ['t.append(-2)', 'n = len(t)'],
      scene: runScene(0),
    },
    {
      chapter: 'build',
      short: 'Radii',
      title: 'Lines 7–8: the radii and the furthest palindrome',
      body: 'Line 7 gives every centre a radius of 0. Line 8 tracks the palindrome that reaches furthest right, as its centre `c` and right edge `r`: the one worth mirroring across.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5, 6, 7, 8], lines: [7, 8] },
      metrics: startMetrics,
      changes: ['p = [0] * n', 'c = r = 0'],
      scene: runScene(2),
    },
    {
      chapter: 'build',
      short: 'Copy',
      title: 'Lines 10–12: inside r, start from the mirror',
      body: 'Line 10 visits every real cell of `t`, skipping the guards. If `i` is inside the furthest palindrome (line 11), line 12 starts `p[i]` at its mirror’s radius `p[2c − i]`, clipped at `r`.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12], lines: [10, 11, 12] },
      metrics: startMetrics,
      changes: ['for i in range(1, n - 1)', 'if i < r', 'p[i] = min(r - i, p[2 * c - i])'],
      scene: runScene(19),
    },
    {
      chapter: 'build',
      short: 'Expand',
      title: 'Lines 13–14: expand while the sides match',
      body: 'Whatever was copied is a lower bound. Line 13 compares the next cell on each side of `i`; while they agree, line 14 widens the palindrome. The guards guarantee this loop ends.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14], lines: [13, 14] },
      metrics: startMetrics,
      changes: ['while t[i + 1 + p[i]] == t[i - 1 - p[i]]', 'p[i] += 1'],
      scene: runScene(15),
    },
    {
      chapter: 'build',
      short: 'New centre',
      title: 'Lines 15–16: a palindrome that goes further becomes the reference',
      body: 'If this palindrome reaches past `r`, line 16 makes `i` the new centre `c` and sets `r` to its right edge. Later cells then mirror across it.',
      code: { view: 'reveal', reveal: [1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15, 16], lines: [15, 16] },
      metrics: startMetrics,
      changes: ['if i + p[i] > r', 'c, r = i, i + p[i]'],
      scene: runScene(18),
    },
    {
      chapter: 'build',
      short: 'Answer',
      title: 'Lines 18–20: pick the widest and map it back to s',
      body: 'Line 18 finds the largest radius and its centre in `t`. A radius in `t` equals a length in `s`, and line 19 halves the offset to get the start index in `s`. Line 20 slices it out.\n\nThat’s the whole function. Now let’s run it.',
      code: { view: 'final', lines: [18, 19, 20] },
      metrics: startMetrics,
      changes: ['radius, center = max(...)', 'start = (center - radius) // 2', 'return s[start : start + radius]'],
      scene: { entities: story({ showVars: true, p: [...P], best: { center: 4, radius: 3 }, result: [...S] }) },
    },
    ...RUN,
    {
      chapter: 'why',
      short: 'Recap',
      title: 'Linear time: r only moves forward',
      body: 'A comparison only happens at or past `r`. Each successful one pushes `r` right, and `r` never moves back, so there are at most `n` successful comparisons plus one failure per centre: **`O(n)` time**. `t` and `p` are both about `2n` long: **`O(n)` space**.\n\nExpanding around every centre would have been `O(n²)`.',
      code: { view: 'final', lines: [12, 13, 15] },
      metrics: FINAL_METRICS,
      scene: { entities: story({ showVars: true, p: [...P], best: { center: 4, radius: 3 }, result: [...S], note: 'compares only at or past r\nr never moves back\n→ O(n) time, O(n) space', noteTone: 'found' }) },
    },
    {
      chapter: 'why',
      short: 'Clip',
      title: 'Why the copy is clipped at r − i',
      body: 'The mirror’s radius can be larger than what the furthest palindrome covers. Past `r` we have no proof of symmetry, so copying all of it could claim cells nobody checked. Try the "Clipped mirror" preset, where `p[2c − i]` is bigger than `r − i`.\n\nThat is the key decision on line 12: `min(r − i, p[2c − i])`. Trust the mirror up to `r`, and let line 13 compare honestly beyond it.',
      code: { view: 'final', lines: [12, 13] },
      values: { 12: 'trust the mirror only up to r', 13: 'compare honestly beyond r' },
      metrics: FINAL_METRICS,
      scene: { entities: story({ showVars: true, p: [...P], i: 5, c: 4, r: 7, mirror: 3, note: 'mirror: trusted up to r\nbeyond r: compare cells\nso every radius is exact', noteTone: 'found' }) },
    },
  ],
  trace: {
    title: 'Find the longest palindrome in your own string',
    inputs: [{ name: 's', label: 'Letters as numbers (1 = a … 26 = z)', kind: 'numbers', default: '1, 2, 1' }],
    presets: [
      { label: 'aba (odd)', values: { s: '1, 2, 1' } },
      { label: 'abba (even)', values: { s: '1, 2, 2, 1' } },
      { label: 'abcd (no palindrome)', values: { s: '1, 2, 3, 4' } },
      { label: 'aaaa (all same)', values: { s: '1, 1, 1, 1' } },
      { label: 'abab (clipped mirror)', values: { s: '1, 2, 1, 2' } },
      { label: 'One letter', values: { s: '1' } },
    ],
    maxItems: 4,
    run: (values) => {
      const input = values['s'];
      if (!Array.isArray(input) || input.length === 0) throw new Error('Enter at least one letter.');
      if (input.some((v) => !Number.isInteger(v) || v < 1 || v > 26)) throw new Error('Use whole numbers from 1 (a) to 26 (z).');
      return traceManacher(input);
    },
  },
});
