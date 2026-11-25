---
title: "Graph Representations"
topic: "graph"
order: 1
difficulty: "beginner"
timeComplexity: "O(V + E)"
spaceComplexity: "O(V + E)"
diagram: "/diagrams/graph/graph-representations-flow.html"
tags: ["graph", "adjacency-list", "adjacency-matrix", "fundamentals"]
---

## Complexity

| Case | Time | Space | Why? |
|---|---|---|---|
| Best | `O(V + E)` | `O(V + E)` | A sparse graph as adjacency lists: one card per vertex, each edge on two cards |
| Average | `O(VÂ²)` | `O(VÂ²)` | The matrix writes all `VÂ²` cells first, however few edges there are |
| Worst | `O(VÂ²)` | `O(VÂ²)` | A dense graph (`E` near `VÂ²/2`) makes both forms about `VÂ²` entries |

## When to use

| Great for | Avoid for |
|---|---|
| Adjacency lists for sparse graphs, BFS, DFS and Dijkstra: neighbours in `O(deg(u))` | A matrix when `V > 10,000`: `VÂ²` cells exhaust memory |
| A matrix for small dense graphs, Floyd-Warshall, and `O(1)` "is uâ€“v an edge?" checks | Lists when you run thousands of edge checks on high-degree hubs |
| Directed graphs: store each edge once (skip lines 8â€“9) | Mirroring a directed graph: it invents reverse edges that don't exist |
