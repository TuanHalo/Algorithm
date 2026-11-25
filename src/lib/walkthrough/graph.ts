/**
 * Graph drawing for the graph lessons, composed only from existing entities
 * (`.migration-contract.md` §5.1): every vertex is a one-cell array laid out in
 * screen space and converted to floor coordinates (as heap sort draws its
 * tree), and every edge is a `link`. An undirected edge is two opposite links
 * on the same arc, so it reads as one double-headed edge; a directed edge is
 * one link. Weights ride on the edge as its label.
 *
 * Also parses the numeric "Try your own" inputs every graph lesson shares:
 * a node count and parallel `from` / `to` (/ `weight`) lists.
 */
import { arr, link } from './helpers';
import { CELL } from './layout';
import type { ArrayEntity, Entity, ScalarValue, Tone, TraceInput, TraceValues } from './types';

const COS30 = Math.cos(Math.PI / 6);

export interface Edge {
  readonly u: number;
  readonly v: number;
  readonly w?: number;
}

export interface Graph {
  /** Vertices are 0 … n − 1. */
  readonly n: number;
  readonly edges: readonly Edge[];
  readonly directed: boolean;
}

export interface Point {
  readonly x: number;
  readonly y: number;
}

/** Most vertices a lesson graph may have: more no longer fits beside its tables. */
export const MAX_NODES = 7;

/** Screen centre of the graph drawing: left of the tables, which start at floor (0, 0). */
const GRAPH_SX = -540;
const GRAPH_SY = 150;

/** Spreads the layouts below, so edge labels stay clear of the blocks. */
const SPREAD = 1.25;

/**
 * Screen offsets (from the graph centre) for n vertices: flowing left to
 * right from vertex 0, so a search from 0 reads like ripples moving right.
 */
const LAYOUTS: Readonly<Record<number, readonly (readonly [number, number])[]>> = {
  1: [[0, 0]],
  2: [[-90, 0], [90, 0]],
  3: [[-110, 50], [0, -70], [110, 50]],
  4: [[-130, 0], [0, -95], [0, 95], [130, 0]],
  5: [[-170, 0], [-55, -95], [-55, 95], [70, 0], [185, 0]],
  6: [[-180, 0], [-65, -95], [-65, 95], [65, -95], [65, 95], [180, 0]],
  7: [[-200, 0], [-90, -100], [-90, 100], [20, 0], [130, -100], [130, 100], [240, 0]],
};

/** The floor corner whose cell centre projects to screen point (sx, sy): screen = ((x − y)·cos30°, (x + y)/2). */
export function screenToFloor(sx: number, sy: number): Point {
  const a = sx / COS30;
  const b = 2 * sy - CELL;
  return { x: Math.round((a + b) / 2), y: Math.round((b - a) / 2) };
}

/** Floor positions of the vertices of an n-vertex graph. */
export function layoutNodes(n: number): Point[] {
  const offsets = LAYOUTS[n] ?? LAYOUTS[MAX_NODES] ?? [];
  return offsets.slice(0, n).map(([dx, dy]) => screenToFloor(GRAPH_SX + dx * SPREAD, GRAPH_SY + dy * SPREAD));
}

export const nodeId = (k: number): string => `node-${k}`;
/** Stable id of edge i in the input list (ids survive tone and label changes). */
export const edgeId = (i: number): string => `edge-${i}`;

export interface NodeLook {
  readonly tone?: Tone;
  /** Small text under the block, e.g. a distance; nothing when omitted. */
  readonly sub?: string;
}

export interface EdgeLook {
  readonly tone?: Tone;
  /** Shown on the edge; defaults to the weight on a weighted graph. */
  readonly label?: string;
  readonly dashed?: boolean;
  /** Moving packet along the edge (success path only); runs from `from` to the other end. */
  readonly flow?: boolean;
  /** For an undirected edge in flow: the vertex the packet leaves from. */
  readonly from?: number;
  /** Hide the edge (e.g. the build chapter before edges exist). */
  readonly hidden?: boolean;
}

export interface DrawOptions {
  readonly node?: (k: number) => NodeLook;
  readonly edge?: (i: number, e: Edge) => EdgeLook;
  /** Text on each vertex block (default: the vertex number). */
  readonly values?: (k: number) => string | number;
  /** Code identifier the vertex blocks stand for (e.g. \`adj\`), linked to its tokens. */
  readonly codeVar?: string;
}

/** Vertices as one-cell blocks and edges as links, ids stable across steps. */
export function drawGraph(g: Graph, options: DrawOptions = {}): Entity[] {
  const pos = layoutNodes(g.n);
  const entities: Entity[] = [];
  for (let k = 0; k < g.n; k += 1) {
    const p = pos[k] ?? { x: 0, y: 0 };
    const look = options.node?.(k) ?? {};
    const value = options.values?.(k) ?? k;
    entities.push(
      arr(nodeId(k), p.x, p.y, [value], {
        tones: { 0: look.tone ?? 'default' },
        ...(options.codeVar ? { codeVar: options.codeVar } : {}),
        ...(look.sub !== undefined ? { indexLabels: [look.sub] } : { showIndex: false }),
      }),
    );
  }
  g.edges.forEach((e, i) => {
    const look = options.edge?.(i, e) ?? {};
    if (look.hidden) return;
    const label = look.label ?? (e.w !== undefined ? String(e.w) : undefined);
    const base = {
      tone: look.tone ?? 'default',
      ...(look.dashed ? { dashed: true } : {}),
    } as const;
    const flowFromV = look.flow === true && !g.directed && look.from === e.v;
    entities.push(
      link(edgeId(i), { entity: nodeId(e.u) }, { entity: nodeId(e.v) }, {
        ...base,
        ...(label !== undefined ? { label } : {}),
        ...(look.flow && !flowFromV ? { flow: true } : {}),
      }),
    );
    // The reverse half of an undirected edge: same arc, arrowhead on the other end.
    if (!g.directed) {
      entities.push(link(`${edgeId(i)}-back`, { entity: nodeId(e.v) }, { entity: nodeId(e.u) }, { ...base, ...(flowFromV ? { flow: true } : {}) }));
    }
  });
  return entities;
}

/**
 * A Python list / queue / stack drawn as a row whose blocks are keyed by
 * vertex, so they slide as items leave the front. Arrays can't be empty, so
 * an empty list shows one muted "—" block.
 */
export function listArr(
  id: string,
  x: number,
  y: number,
  items: readonly ScalarValue[],
  options: { readonly label: string; readonly codeVar?: string; readonly tones?: (item: ScalarValue, i: number) => Tone; readonly keys?: readonly (string | number)[]; readonly showIndex?: boolean },
): ArrayEntity {
  if (items.length === 0) {
    return arr(id, x, y, ['—'], { label: options.label, tones: { 0: 'muted' }, showIndex: false, itemKeys: ['empty'], ...(options.codeVar ? { codeVar: options.codeVar } : {}) });
  }
  return arr(id, x, y, items, {
    label: options.label,
    itemKeys: options.keys ?? items,
    tones: Object.fromEntries(items.map((item, i) => [i, options.tones?.(item, i) ?? 'default'])),
    ...(options.showIndex === false ? { showIndex: false } : {}),
    ...(options.codeVar ? { codeVar: options.codeVar } : {}),
  });
}

/** Adjacency lists in input order: `adj[u]` holds `v` (and `u` in `adj[v]` when undirected). */
export function adjacency(g: Graph): number[][] {
  const adj: number[][] = Array.from({ length: g.n }, () => []);
  for (const e of g.edges) {
    adj[e.u]?.push(e.v);
    if (!g.directed) adj[e.v]?.push(e.u);
  }
  return adj;
}

/** Weighted adjacency lists in input order: `adj[u]` holds `[v, w]` pairs. */
export function weightedAdjacency(g: Graph): [number, number][][] {
  const adj: [number, number][][] = Array.from({ length: g.n }, () => []);
  for (const e of g.edges) {
    adj[e.u]?.push([e.v, e.w ?? 1]);
    if (!g.directed) adj[e.v]?.push([e.u, e.w ?? 1]);
  }
  return adj;
}

/** Index of the input edge that joins u → v (either way round when undirected), or −1. */
export function findEdge(g: Graph, u: number, v: number): number {
  return g.edges.findIndex((e) => (e.u === u && e.v === v) || (!g.directed && e.u === v && e.v === u));
}

/** Python-style list text: `[0, 2, 1]`. */
export const pyList = (xs: readonly (number | string)[]): string => `[${xs.join(', ')}]`;

/** Trace inputs shared by the graph lessons. */
export function graphInputs(defaults: { n: number; from: string; to: string; weight?: string }, extra: readonly TraceInput[] = []): TraceInput[] {
  const inputs: TraceInput[] = [
    { name: 'n', label: `Vertices n (0 to n − 1, at most ${MAX_NODES})`, kind: 'number', default: String(defaults.n) },
    { name: 'from', label: 'Edges: from', kind: 'numbers', default: defaults.from },
    { name: 'to', label: 'Edges: to (same order)', kind: 'numbers', default: defaults.to },
  ];
  if (defaults.weight !== undefined) inputs.push({ name: 'weight', label: 'Edges: weight (same order)', kind: 'numbers', default: defaults.weight });
  return [...inputs, ...extra];
}

interface ParseOptions {
  readonly directed: boolean;
  readonly weighted?: boolean;
  /** Smallest weight allowed (e.g. 0 for Dijkstra, 0 to 1 for 0-1 BFS). */
  readonly minWeight?: number;
  readonly maxWeight?: number;
  /** Allow a graph with no edges (default true). */
  readonly allowEmpty?: boolean;
}

const numbersOf = (value: number | readonly number[] | undefined): readonly number[] =>
  Array.isArray(value) ? value : typeof value === 'number' ? [value] : [];

/** Reads n and the parallel edge lists from trace values, with a friendly error for anything off. */
export function parseGraph(values: TraceValues, options: ParseOptions): Graph {
  const n = values['n'];
  if (typeof n !== 'number' || !Number.isInteger(n) || n < 1 || n > MAX_NODES) {
    throw new Error(`Vertices n must be a whole number from 1 to ${MAX_NODES}.`);
  }
  const from = numbersOf(values['from']);
  const to = numbersOf(values['to']);
  const weight = numbersOf(values['weight']);
  if (from.length !== to.length) throw new Error(`"from" has ${from.length} numbers but "to" has ${to.length}: each edge needs both ends.`);
  if (options.weighted && weight.length !== from.length) throw new Error(`Give one weight per edge: ${from.length} edges, ${weight.length} weights.`);
  if (options.allowEmpty === false && from.length === 0) throw new Error('Enter at least one edge.');
  const seen = new Set<string>();
  const edges: Edge[] = from.map((u, i) => {
    const v = to[i] ?? 0;
    for (const end of [u, v]) {
      if (!Number.isInteger(end) || end < 0 || end >= n) throw new Error(`Edge ${u} → ${v}: vertices go from 0 to ${n - 1}.`);
    }
    if (u === v) throw new Error(`Edge ${u} → ${v} is a self-loop; leave it out.`);
    const key = options.directed ? `${u}>${v}` : `${Math.min(u, v)}-${Math.max(u, v)}`;
    if (seen.has(key)) throw new Error(`Edge ${u} → ${v} appears twice.`);
    if (options.directed && seen.has(`${v}>${u}`)) throw new Error(`Edges ${v} → ${u} and ${u} → ${v} would share one arc on the stage; keep one of them.`);
    seen.add(key);
    if (!options.weighted) return { u, v };
    const w = weight[i] ?? 0;
    if (options.minWeight !== undefined && w < options.minWeight) throw new Error(`Edge ${u} → ${v} has weight ${w}; this algorithm needs weights of at least ${options.minWeight}.`);
    if (options.maxWeight !== undefined && w > options.maxWeight) throw new Error(`Edge ${u} → ${v} has weight ${w}; this algorithm needs weights of at most ${options.maxWeight}.`);
    return { u, v, w };
  });
  return { n, edges, directed: options.directed };
}

/** Reads a vertex number input (e.g. `start`) and checks it is in range. */
export function parseVertex(values: TraceValues, name: string, n: number, label = name): number {
  const k = values[name];
  if (typeof k !== 'number' || !Number.isInteger(k) || k < 0 || k >= n) throw new Error(`${label} must be a vertex from 0 to ${n - 1}.`);
  return k;
}

/** Inline values for a step, dropping lines whose value is undefined (e.g. a loop check only shown after the first turn). */
export function lineValues(values: Readonly<Record<number, string | undefined>>): Record<number, string> {
  const out: Record<number, string> = {};
  for (const [line, value] of Object.entries(values)) if (value !== undefined) out[Number(line)] = value;
  return out;
}
