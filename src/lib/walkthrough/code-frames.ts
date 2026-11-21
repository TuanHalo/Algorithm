/**
 * Build-time precompute for the code panel (server only).
 *
 * Every distinct code view a story uses is highlighted with Shiki and turned
 * into keyed tokens with `@shikijs/magic-move`. Views are committed in story
 * order, so tokens that survive from one view to the next keep their key and
 * slide instead of re-appearing. The browser only ships the small renderer.
 */
import { createMagicMoveMachine, toKeyedTokens } from '@shikijs/magic-move/core';
import type { KeyedTokensInfo } from '@shikijs/magic-move/types';
import { createHighlighter, type Highlighter, type ThemedToken } from 'shiki';
import { resolveView, viewKey, type CodeFrame, type CodeFrames } from './code-view';
import type { CodeView, Entity, Walkthrough } from './types';

const THEME = 'github-light';
const LANG = 'python';
const IDENTIFIER = /^[A-Za-z_]\w*$/;

let highlighter: Promise<Highlighter> | undefined;

function getHighlighter(): Promise<Highlighter> {
  highlighter ??= createHighlighter({ themes: [THEME], langs: [LANG] });
  return highlighter;
}

/**
 * Shiki merges neighbouring same-colour text (" seen[num] "), so split code
 * tokens on identifier boundaries; then each variable is its own token that can
 * be tagged and linked. Comments and strings are left whole.
 */
function splitIdentifiers(lines: ThemedToken[][]): ThemedToken[][] {
  return lines.map((line) =>
    line.flatMap((token) => {
      const trimmed = token.content.trimStart();
      if (trimmed.startsWith('#') || trimmed.startsWith('"') || trimmed.startsWith("'")) return [token];
      let offset = token.offset;
      return token.content
        .split(/([A-Za-z_]\w*)/)
        .filter(Boolean)
        .map((content) => {
          const part: ThemedToken = { ...token, content, offset };
          offset += content.length;
          return part;
        });
    }),
  );
}

function keyedTokens(hl: Highlighter, code: string): KeyedTokensInfo {
  const result = hl.codeToTokens(code, { lang: LANG, theme: THEME });
  return {
    ...toKeyedTokens(code, splitIdentifiers(result.tokens), JSON.stringify([LANG, THEME])),
    bg: result.bg,
    fg: result.fg,
    rootStyle: result.rootStyle,
    themeName: result.themeName,
    lang: LANG,
  };
}

/** Identifiers the scene links to: explicit `codeVar`s plus variable-panel rows named like identifiers. */
function linkedNames(entities: readonly Entity[]): string[] {
  return entities.flatMap((e) => {
    if (e.type === 'vars') return e.rows.map((r) => r.name).filter((name) => IDENTIFIER.test(name));
    return 'codeVar' in e && e.codeVar ? [e.codeVar] : [];
  });
}

/** Precomputes every code frame a walkthrough's story and trace can show. */
export async function buildCodeFrames(wt: Walkthrough): Promise<CodeFrames> {
  const hl = await getHighlighter();

  // Distinct views in story order; trace mode always shows the final code.
  const views = new Map<string, CodeView>();
  for (const step of wt.steps) {
    const key = viewKey(step.code);
    if (!views.has(key)) views.set(key, step.code);
  }
  if (!views.has('final')) views.set('final', { view: 'final' });

  const names = new Set(wt.steps.flatMap((s) => linkedNames(s.scene.entities)));
  const machine = createMagicMoveMachine((code) => keyedTokens(hl, code));
  const frames: Record<string, CodeFrame> = {};
  for (const [key, view] of views) {
    const resolved = resolveView(wt, view);
    const { current } = machine.commit(resolved.code);
    // Copy before tagging: the machine keeps its own reference for the next diff.
    const tokens: KeyedTokensInfo = {
      ...current,
      tokens: current.tokens.map((t) => (names.has(t.content) ? { ...t, htmlClass: `wt-var wt-var--${t.content}` } : { ...t })),
    };
    frames[key] = { key, rows: resolved.rows, tokens };
  }
  return { frames, finalSource: wt.code.source };
}

/** JSON for an inline `<script type="application/json">`, safe against `</script>` breakouts. */
export function framesToJson(data: CodeFrames): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
