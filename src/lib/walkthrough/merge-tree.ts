/**
 * Helpers shared by the greedy lessons that build a tree with a min-heap
 * (optimal merge patterns, Huffman coding): CPython's `heapq` on a plain
 * array, so the drawn heap order is the real one, and a layout that places
 * every tree node at its *final* slot, so nodes appear in place when created.
 */
import { arr, link } from './helpers';
import { CELL } from './layout';
import type { Entity, ScalarValue, Tone } from './types';

/** `lt(a, b)` is Python's `a < b`. */
type Less<T> = (a: T, b: T) => boolean;

function siftdown<T>(heap: T[], start: number, pos: number, lt: Less<T>): void {
  const item = heap[pos] as T;
  let p = pos;
  while (p > start) {
    const parentPos = (p - 1) >> 1;
    const parent = heap[parentPos] as T;
    if (lt(item, parent)) {
      heap[p] = parent;
      p = parentPos;
      continue;
    }
    break;
  }
  heap[p] = item;
}

function siftup<T>(heap: T[], pos: number, lt: Less<T>): void {
  const end = heap.length;
  const start = pos;
  const item = heap[pos] as T;
  let p = pos;
  let child = 2 * p + 1;
  while (child < end) {
    const right = child + 1;
    if (right < end && !lt(heap[child] as T, heap[right] as T)) child = right;
    heap[p] = heap[child] as T;
    p = child;
    child = 2 * p + 1;
  }
  heap[p] = item;
  siftdown(heap, start, p, lt);
}

/** `heapq.heapify`. */
export function heapify<T>(heap: T[], lt: Less<T>): void {
  for (let i = (heap.length >> 1) - 1; i >= 0; i -= 1) siftup(heap, i, lt);
}

/** `heapq.heappush`. */
export function heappush<T>(heap: T[], item: T, lt: Less<T>): void {
  heap.push(item);
  siftdown(heap, 0, heap.length - 1, lt);
}

/** `heapq.heappop`. */
export function heappop<T>(heap: T[], lt: Less<T>): T {
  const last = heap.pop() as T;
  if (heap.length === 0) return last;
  const top = heap[0] as T;
  heap[0] = last;
  siftup(heap, 0, lt);
  return top;
}

/** A node of the tree being built: leaves have no children. */
export interface TreeShape {
  readonly id: string;
  readonly left?: string;
  readonly right?: string;
}

const COS30 = Math.cos(Math.PI / 6);
/** Screen x of the tree's right edge, the width of one leaf slot, the gap between levels, and the root's screen y. */
const TREE_RIGHT_SX = -60;
const LEAF_SX = 100;
const LEVEL_SY = 95;
const TREE_SY = 40;

/** Floor position of every node of the finished tree (root on top, leaves left to right). */
export function treeSlots(nodes: readonly TreeShape[], rootId: string): ReadonlyMap<string, { x: number; y: number }> {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const screen = new Map<string, { slot: number; depth: number }>();
  let leaves = 0;
  const place = (id: string, depth: number): number => {
    const node = byId.get(id);
    let slot: number;
    if (node?.left === undefined || node.right === undefined) {
      slot = leaves;
      leaves += 1;
    } else {
      slot = (place(node.left, depth + 1) + place(node.right, depth + 1)) / 2;
    }
    screen.set(id, { slot, depth });
    return slot;
  };
  place(rootId, 0);
  const width = leaves * LEAF_SX;
  const out = new Map<string, { x: number; y: number }>();
  for (const [id, { slot, depth }] of screen) {
    const sx = TREE_RIGHT_SX - width + (slot + 0.5) * LEAF_SX;
    const sy = TREE_SY + depth * LEVEL_SY;
    // The floor corner whose cell centre projects to (sx, sy): screen = ((x − y)·cos30°, (x + y)/2).
    const a = sx / COS30;
    const b = 2 * sy - CELL;
    out.set(id, { x: Math.round((a + b) / 2), y: Math.round((b - a) / 2) });
  }
  return out;
}

/** One node to draw: a one-cell block with a caption under it. */
export interface TreeDraw {
  readonly id: string;
  readonly value: ScalarValue;
  readonly caption: ScalarValue;
  readonly tone: Tone;
}

/** An edge from a parent to a child, drawn only when both nodes are. */
export interface TreeEdge {
  readonly from: string;
  readonly to: string;
  readonly tone?: Tone;
  readonly label?: string;
  readonly dashed?: boolean;
}

/** Entities for the nodes and edges given; ids are stable (`node-<id>`, `edge-<from>-<to>`). */
export function treeEntities(
  slots: ReadonlyMap<string, { x: number; y: number }>,
  nodes: readonly TreeDraw[],
  edges: readonly TreeEdge[],
): Entity[] {
  const out: Entity[] = [];
  for (const n of nodes) {
    const pos = slots.get(n.id) ?? { x: 0, y: 0 };
    out.push(arr(`node-${n.id}`, pos.x, pos.y, [n.value], { indexLabels: [n.caption], tones: { 0: n.tone } }));
  }
  for (const e of edges) {
    out.push(link(`edge-${e.from}-${e.to}`, { entity: `node-${e.from}` }, { entity: `node-${e.to}` }, { tone: e.tone ?? 'default', label: e.label, dashed: e.dashed }));
  }
  return out;
}
