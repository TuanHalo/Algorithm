/**
 * Browser-side lazy loader. Each walkthrough becomes its own small chunk, so a
 * page only downloads the one it shows.
 */
import type { Walkthrough } from './types';

const loaders = import.meta.glob<{ default: Walkthrough }>('../../walkthroughs/**/*.ts');

export async function loadWalkthrough(id: string): Promise<Walkthrough> {
  const load = loaders[`../../walkthroughs/${id}.ts`];
  if (!load) throw new Error(`Unknown walkthrough "${id}"`);
  const mod = await load();
  return mod.default;
}
