/**
 * Server-side registry of every walkthrough under `src/walkthroughs/`.
 * Each module is validated when first imported, so a bad walkthrough fails
 * `astro build` / `astro dev` instead of breaking in the browser.
 */
import { validateWalkthrough } from './schema';
import type { Walkthrough } from './types';

const modules = import.meta.glob<{ default: unknown }>('../../walkthroughs/**/*.ts', { eager: true });

const PREFIX = '../../walkthroughs/';

function toId(path: string): string {
  return path.slice(PREFIX.length).replace(/\.ts$/, '');
}

const registry: ReadonlyMap<string, Walkthrough> = new Map(
  Object.entries(modules).map(([path, mod]) => {
    const id = toId(path);
    return [id, validateWalkthrough(mod.default, id)];
  }),
);

/** Ids look like `problems/two-sum` or `learn/searching/binary-search`. */
export function getWalkthrough(id: string): Walkthrough | undefined {
  return registry.get(id);
}

export function listWalkthroughIds(): readonly string[] {
  return [...registry.keys()].sort();
}

export function problemWalkthroughId(slug: string): string {
  return `problems/${slug}`;
}

export function lessonWalkthroughId(topic: string, slug: string): string {
  return `learn/${topic}/${slug}`;
}
