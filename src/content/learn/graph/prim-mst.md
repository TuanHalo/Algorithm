---
title: "Prim's Minimum Spanning Tree"
topic: "graph"
order: 14
difficulty: "advanced"
timeComplexity: "O((V + E) log V)"
spaceComplexity: "O(V)"
tags: ["graph", "mst", "prim", "heap"]
---

## Complexity

| Case | Time | Space | Why? |
|---|---|---|---|
| Best | `O((V + E) log V)` | `O(V + E)` | Every vertex still joins through the heap and offers its edges |
| Average | `O((V + E) log V)` | `O(V + E)` | Each edge is pushed at most once from each end; each push and pop costs `O(log V)` |
| Worst | `O((V + E) log V)` | `O(V + E)` | Dense graphs leave many outdated entries waiting in the heap |

## When to use

| Great for | Avoid for |
|---|---|
| Connected graphs stored as adjacency lists, especially dense ones (no global sort) | Disconnected graphs: it only spans the start's component (loop over unvisited starts for a forest) |
| Growing a tree outward from a chosen root | Edge-list inputs, where sorting once for Kruskal's is simpler |
