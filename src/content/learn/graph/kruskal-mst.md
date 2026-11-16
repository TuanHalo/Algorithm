---
title: "Kruskal's Minimum Spanning Tree"
topic: "graph"
order: 13
difficulty: "advanced"
timeComplexity: "O(E log E)"
spaceComplexity: "O(V)"
visualizer: "/visualizers/graph/kruskal-mst.html"
diagram: "/diagrams/graph/kruskal-mst-flow.html"
tags: ["graph", "mst", "kruskal", "union-find"]
---

## What is Kruskal's minimum spanning tree?

Suppose a town wants to link every neighborhood with fiber cable at the lowest total cost, using no redundant loops.

Kruskal's algorithm builds a minimum spanning tree (MST) by sorting all edges cheapest first and keeping each edge that connects two separate components.

## Core idea

Sort every edge by weight ascending, then walk the list and add `(u, v)` to the tree whenever Union-Find reports that `u` and `v` are in different sets.

## Python code

```python
def kruskal_mst(
    nodes: list[str],
    edges: list[tuple[int, str, str]],
) -> list[tuple[str, str, int]]:
    parent = {u: u for u in nodes}

    def find(x: str) -> str:
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    mst: list[tuple[str, str, int]] = []
    for w, u, v in sorted(edges):
        ru, rv = find(u), find(v)
        if ru != rv:
            parent[rv] = ru
            mst.append((u, v, w))
    return mst
```

## Complexity

| Case | Time | Space | Why? |
|---|---|---|---|
| Average / Worst | `O(E log E)` | `O(V + E)` | Sorting the `E` edges dominates; Union-Find checks take `O(E · α(V))` |

## When to use

| Great for | Avoid for |
|---|---|
| Sparse undirected graphs stored as an edge list | Directed graphs (minimum spanning arborescence needs Edmonds' algorithm) |
| Graphs that may have multiple components and need a minimum spanning forest | Very dense graphs given as an adjacency matrix, where Prim's can avoid sorting `V²` edges |
