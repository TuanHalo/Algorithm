---
title: "Prim's Minimum Spanning Tree"
topic: "graph"
order: 14
difficulty: "advanced"
timeComplexity: "O((V + E) log V)"
spaceComplexity: "O(V)"
visualizer: "/visualizers/graph/prim-mst.html"
diagram: "/diagrams/graph/prim-mst-flow.html"
tags: ["graph", "mst", "prim", "heap"]
---

## What is Prim's minimum spanning tree?

Picture powering a dark neighborhood from one substation: at every step, you string cable along the single cheapest wire connecting a lit house to an unlit neighbor.

Prim's algorithm grows a single minimum spanning tree outward from one start vertex using a min-heap of crossing edges.

## Core idea

Pop the cheapest edge `(w, u)` from the min-heap; if `u` is not yet in the MST, add `w` to the total and push `u`'s unvisited neighbor edges onto the heap.

## Python code

```python
import heapq


def prim_mst(
    adj: dict[str, list[tuple[str, int]]],
    start: str,
) -> int:
    visited: set[str] = set()
    heap: list[tuple[int, str]] = [(0, start)]
    total = 0

    while heap:
        w, u = heapq.heappop(heap)
        if u in visited:
            continue
        visited.add(u)
        total += w
        for v, edge_w in adj[u]:
            if v not in visited:
                heapq.heappush(heap, (edge_w, v))
    return total
```

## Complexity

| Case | Time | Space | Why? |
|---|---|---|---|
| Average / Worst | `O((V + E) log V)` | `O(V + E)` | Every edge is pushed at most once when its endpoint joins the tree |

## When to use

| Great for | Avoid for |
|---|---|
| Dense connected graphs already stored as an adjacency list or matrix | Disconnected graphs unless you wrap it in an outer loop over all vertices |
| Streaming MST growth from a specific root vertex | Edge-list inputs where sorting once for Kruskal's is cleaner |
