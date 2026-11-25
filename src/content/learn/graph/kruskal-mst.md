---
title: "Kruskal's Minimum Spanning Tree"
topic: "graph"
order: 13
difficulty: "advanced"
timeComplexity: "O(E log E)"
spaceComplexity: "O(V)"
tags: ["graph", "mst", "kruskal", "union-find"]
---

## Complexity

| Case | Time | Space | Why? |
|---|---|---|---|
| Best | `O(E log E)` | `O(V + E)` | The sort runs in full even if the first `V âˆ’ 1` edges already form the tree |
| Average | `O(E log E)` | `O(V + E)` | Sorting dominates; each edge then costs two nearly-constant `find`s |
| Worst | `O(E log E)` | `O(V + E)` | Every edge is tried; `parent` holds `V` entries and the sorted copy `E` |

## When to use

| Great for | Avoid for |
|---|---|
| Sparse undirected graphs given as an edge list | Directed graphs: a minimum spanning arborescence needs Edmonds' algorithm |
| Graphs that may be disconnected: it returns a minimum spanning forest | Dense graphs given as an adjacency matrix: Prim's avoids sorting `VÂ²` edges |
