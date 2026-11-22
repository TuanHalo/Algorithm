# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

Algorithm Hub: an Astro 5 static site with two halves.
- **Learn** (`/learn/<topic>/<slug>/`): algorithm lessons grouped by topic.
- **Problems** (`/problems/<slug>/`): the owner's solutions to LeetCode-style problems, each with AI feedback.

It deploys to GitHub Pages under the base path `/Algorithm`.

**`.ai-contract.md` is the authoritative content contract.** Read it before writing or editing a lesson, problem, walkthrough or diagram. It defines:
- required frontmatter and section order
- the writing tone and the AI-feedback rules
- the Claymorphism design tokens and topic colours
- walkthrough authoring rules
- Archify settings

Follow it rather than inventing new formats.

**`.migration-contract.md` governs the ongoing migration** from the old page layout to a single 3D story per page. The story always runs problem → idea → build (code grows) → run → why. For any page being migrated or already migrated, it overrides `.ai-contract.md`. It defines:
- the target page anatomy
- the five story chapters
- the code-view rules (`signature` / `snapshot` / `reveal` / `final`)
- the 3D style rules
- the schema v2 changes and the migration phases
- a per-page definition-of-done checklist

Check which phase it's in before starting migration work. Phase 0 (engine v2) must land before pages are converted.

## Commands

Package manager is **pnpm**.

```bash
pnpm install
pnpm dev        # http://localhost:4321/Algorithm/  (the bare root "/" returns 404 because of the base path)
pnpm check      # astro check: type-checks .ts and .astro (strict TS)
pnpm build      # static build into dist/; also runs walkthrough validation
pnpm preview
npx tsc --noEmit -p .
```

There is no test suite and no linter. To verify a change:
1. Run `pnpm check`.
2. Run `pnpm build`. For walkthroughs, a successful build is the test, because invalid walkthrough data fails it.
3. Look at the changed page in the dev server.

CI (`.github/workflows/deploy.yml`) builds with `withastro/action` and deploys on every push to `main`.

## Architecture

### Routing and base path
- `astro.config.mjs` sets `base: '/Algorithm'` and `output: 'static'`.
- Every internal link and asset URL must go through `withBase()` from `src/utils/url.ts`. Hard-coded `/learn/...` links break on GitHub Pages.

### Content
- Collections live in `src/content/` and use the legacy `type: 'content'` API. Their Zod schemas are in `src/content/config.ts`.
- **Lesson routes** come from two places:
  - the frontmatter `topic`
  - the **last segment** of the file slug (`src/content/learn/<topic>/<slug>.md` → `/learn/<topic>/<slug>/`)
- Lessons are ordered within a topic by the frontmatter `order` field.
- The optional frontmatter field `verified: "YYYY-MM-DD"` (lessons and problems) marks a page the owner has reviewed. `VerifiedBadge.astro` shows "✓ Verified" or "Not verified" in the page header and on lesson and problem cards. Only the owner's review sets it (`.migration-contract.md` §10), so never add it yourself.
- Topic metadata (name, icon, colour, order, preview list) is hard-coded in `TOPICS` in `src/utils/topics.ts`. The per-topic `_meta.json` files are not read by any site code.
- Topic index pages (`src/pages/learn/[topic]/index.astro`) render per-topic comparison tables from `src/components/*Matrix.astro`. Their data is hard-coded inside each component.

### The three visual systems
Lesson pages can embed up to three kinds of visual, in this order: walkthrough, then visualizer, then Archify diagram. Problem pages show only the walkthrough; their markdown holds just the AI feedback.

1. **Walkthroughs** (new; preferred for showing how code executes)
   - **Content:** `src/walkthroughs/problems/<slug>.ts` and `src/walkthroughs/learn/<topic>/<slug>.ts`.
   - **Page wiring:** a page renders a walkthrough when a file exists at the path that matches its slug, so there is no frontmatter field. `src/lib/walkthrough/registry.ts` handles the lookup.
   - **Standalone page:** every walkthrough also gets `/embed/<id>/` from `src/pages/embed/[...id].astro`.
   - **Engine:** `src/lib/walkthrough/`.
     - `types.ts`: the data model. A walkthrough is a list of steps, and each step holds a complete `Scene` of entities.
     - `helpers.ts`: authoring helpers such as `arr`, `ptr`, `map`, `vars`, `link` and `note`.
     - `layout.ts`: places entities on a flat floor plane.
     - `stage.ts`: keyed SVG reconciliation. An entity that keeps its `id` animates between steps instead of being redrawn.
     - `iso-stage.ts`: the only renderer, which projects that floor into isometric 3D.
     - `player.ts`: navigation, chapter-grouped step rail, metrics, `#step-N` deep links, scene↔code variable linking, and "Try your own" trace mode.
     - **Code panel (idea → code):**
       - `code-view.ts`, shared by server and browser, turns a step's code view (`signature` / `snapshot` / `reveal` / `final`) into display rows.
       - `code-frames.ts`, server only, highlights every distinct view with Shiki and keys its tokens with `@shikijs/magic-move` at build time. The result is embedded as JSON in the page.
       - `code-panel.ts`, in the browser, animates between those frames and draws a gutter of real line numbers, highlight bars and inline values on a fixed 20px line grid. If you change the code font or line height, change `--wt-code-lh` too.
   - **Server/browser split:**
     - The server side (`registry.ts` → `schema.ts`) eagerly imports and validates every walkthrough with `astro/zod`. It also runs each `trace.run()` once with default inputs. Any problem throws during the build. The v2 story rules (five chapters in order, reveals that only grow, highlighted lines that must be visible) live in `checkStory` / `checkSteps`.
     - The browser side (`client-loader.ts`) lazy-imports only the walkthrough a page needs. Zod never ships to the browser, so walkthrough modules must not import `schema.ts` or `registry.ts`.
   - **Component:** `src/components/Walkthrough.astro` renders the markup the player drives. Its CSS lives in `src/styles/walkthrough.css`. That stylesheet is deliberately global, because the SVG is built at runtime and Astro's scoped styles would not reach it.

2. **Legacy interactive visualizers**
   - Self-contained HTML files in the root `visualizers/<topic>/` folder, not in `public/`. They share `visualizers/shared/visualizer-base.js`, which records steps and plays them back.
   - The custom integration `src/integrations/visualizers.ts` serves this folder during `astro dev` and copies it into `dist/visualizers/` on build.
   - Referenced by the frontmatter field `visualizer:` and embedded in an iframe by `AlgoVisualizer.astro`.

3. **Archify diagrams**
   - Pre-generated HTML in `public/diagrams/<topic>/<slug>-flow.html`, about 850 KB each.
   - Referenced by the frontmatter field `diagram:` and embedded in an iframe by `DiagramEmbed.astro`.
   - Generate them with the `archify` skill, following the settings in `.ai-contract.md` (classic preset, `--quality showcase`). Working candidates go in the gitignored `.archify/` folder.

Direction of travel (see `.migration-contract.md`):
- Walkthroughs are becoming the single 3D story on every page. They replace the legacy visualizers, the duplicated approach and code sections, and the Archify execution diagrams.
- Archify stays only for "big picture" decision, comparison and structure diagrams.

### Math in markdown
- `$…$` and `$$…$$` render with KaTeX (`remark-math` + `rehype-katex` in `astro.config.mjs`; the CSS is imported in `BaseLayout.astro`).
- Keep the `katex` dependency pinned to the **same version `rehype-katex` renders with** (currently 0.16.x). A CSS/HTML version mismatch breaks fractions and superscripts without any build error.
- Put `$$` fences on their own lines for multi-line display math. Inside `\text{}`, write `\#`, `\textdollar` and `\textasciicircum` instead of `#`, `$` and `^`.

### Styling
- Global Claymorphism tokens and classes come from `src/styles/global.css` and `src/styles/clay-theme.css`. They are imported once in `src/layouts/BaseLayout.astro`, and in the embed page.
- Use the existing `--color-<topic>` variables and `.clay-*` classes rather than new colours or one-off components.

## TypeScript conventions

`tsconfig.json` extends `astro/tsconfigs/strict`. In addition:
- Exported functions need explicit return types.
- Use `interface` for data shapes.
- Use `readonly` for data arrays and config.
- Use `unknown` plus narrowing (or Zod) for external data.
