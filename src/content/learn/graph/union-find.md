---
title: "Union-Find (Disjoint Set)"
topic: "graph"
order: 8
difficulty: "intermediate"
timeComplexity: "O(α(V))"
spaceComplexity: "O(V)"
visualizer: "/visualizers/graph/union-find.html"
diagram: "/diagrams/graph/union-find-flow.html"
tags: ["graph", "union-find", "disjoint-set", "connectivity"]
---

## What is Union-Find?

Imagine merging friend circles at a party: each circle picks one leader, and whenever two people shake hands, their two circles combine under one leader.

Union-Find (Disjoint Set Union) tracks which elements share a group, supporting fast `find` (which group?) and `union` (merge two groups) operations.

## Core idea

Point visited nodes straight to the root during `find` (path compression) and attach the shorter tree under the taller root during `union` (union by rank).

## Python code

```python
class UnionFind:
    def __init__(self, nodes: list[str]) -> None:
        self.parent = {u: u for u in nodes}
        self.rank = {u: 0 for u in nodes}

    def find(self, x: str) -> str:
        if self.parent[x] != x:
            # Flatten the lookup chain so future finds jump straight to root
            self.parent[x] = self.find(self.parent[x])
        return self.parent[x]

    def union(self, a: str, b: str) -> bool:
        ra, rb = self.find(a), self.find(b)
        if ra == rb:
            return False
        if self.rank[ra] < self.rank[rb]:
            ra, rb = rb, ra
        self.parent[rb] = ra
        if self.rank[ra] == self.rank[rb]:
            self.rank[ra] += 1
        return True
```

## Complexity

| Operation | Time | Space | Why? |
|---|---|---|---|
| Initialization | `O(V)` | `O(V)` | Stores one `parent` and one `rank` entry per element |
| `find` / `union` (amortized) | `O(α(V))` | `O(1)` | Inverse Ackermann `α(V)` grows so slowly it stays `<= 4` for all practical inputs |

## When to use

| Great for | Avoid for |
|---|---|
| Streaming edge merges, cycle checks in undirected graphs, and Kruskal's MST | Graphs that frequently delete edges (standard Union-Find only merges) |
| Dynamic connectivity queries between pairs of vertices | Shortest path queries or directed reachability |
