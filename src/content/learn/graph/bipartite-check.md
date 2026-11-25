---
title: "Bipartite Graph Check (2-Coloring)"
topic: "graph"
order: 6
difficulty: "intermediate"
timeComplexity: "O(V + E)"
spaceComplexity: "O(V)"
tags: ["graph", "bipartite", "2-coloring", "bfs"]
---

## Complexity

| Case | Time | Space | Why? |
|---|---|---|---|
| Best | `O(1)` to `O(V)` | `O(V)` | Stops at the first same-color edge, e.g. a triangle next to the start |
| Average | `O(V + E)` | `O(V)` | Each vertex is colored and queued once; each edge is checked from both ends |
| Worst | `O(V + E)` | `O(V)` | A bipartite graph has no clash, so every vertex and edge is visited |

## When to use

| Great for | Avoid for |
|---|---|
| Splitting into two conflict-free groups: teams, schedules, matching problems | Three or more groups: graph coloring with `k â‰¥ 3` colors is NP-complete |
| Detecting an odd-length cycle in an undirected graph | Directed graphs, unless you first ignore the edge directions |
