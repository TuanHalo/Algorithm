---
title: "Graph Representations"
topic: "graph"
order: 1
difficulty: "beginner"
timeComplexity: "O(V + E)"
spaceComplexity: "O(V + E)"
visualizer: "/visualizers/graph/graph-representations.html"
diagram: "/diagrams/graph/graph-representations-flow.html"
tags: ["graph", "adjacency-list", "adjacency-matrix", "fundamentals"]
---

## What is a graph representation?

Think of a subway map: you can track connections either by listing each station's direct neighbors on an index card or by filling out a grid with every station along both the rows and columns.

An adjacency list stores only existing edges per vertex, while an adjacency matrix uses a `V x V` grid where cell `(u, v)` records whether an edge exists.

## Core idea

Pick an adjacency list when most pairs of nodes have no direct link (`E << V²`), and pick an adjacency matrix when `V` is small or you need `O(1)` edge checks.

## Python code

```python
def build_graph(
    nodes: list[str],
    edges: list[tuple[str, str]],
    directed: bool = False,
) -> tuple[dict[str, list[str]], list[list[int]]]:
    adj_list: dict[str, list[str]] = {u: [] for u in nodes}
    idx = {u: i for i, u in enumerate(nodes)}
    matrix = [[0] * len(nodes) for _ in range(len(nodes))]
    for u, v in edges:
        adj_list[u].append(v)
        matrix[idx[u]][idx[v]] = 1
        if not directed:
            # Mirror undirected edges so lookups work from either endpoint
            adj_list[v].append(u)
            matrix[idx[v]][idx[u]] = 1
    return adj_list, matrix
```

## Complexity

| Operation / Structure | Time | Space | Why? |
|---|---|---|---|
| Adjacency List build | `O(V + E)` | `O(V + E)` | Allocates one bucket per vertex and appends each edge once (or twice if undirected) |
| Adjacency List neighbor scan | `O(deg(u))` | `O(1)` | Reads only the actual neighbors of `u` |
| Adjacency Matrix edge lookup | `O(1)` | `O(V²)` | Indexes `matrix[u][v]` directly, but stores `V²` slots even when edges are rare |

## When to use

| Great for | Avoid for |
|---|---|
| Adjacency list on sparse graphs, BFS, DFS, and Dijkstra | Adjacency matrix when `V > 10,000`, because `V²` entries exhaust memory |
| Adjacency matrix on dense graphs, Floyd-Warshall, and `O(1)` edge checks | Adjacency list if you run thousands of `is_edge(u, v)` queries on high-degree hubs |
