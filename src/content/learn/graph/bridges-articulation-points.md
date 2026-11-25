---
title: "Bridges & Articulation Points"
topic: "graph"
order: 16
difficulty: "advanced"
timeComplexity: "O(V + E)"
spaceComplexity: "O(V)"
tags: ["graph", "tarjan", "bridges", "articulation-points"]
---

## Complexity

| Case | Time | Space | Why? |
|---|---|---|---|
| Best | `O(V + E)` | `O(V)` | Every vertex is stamped and every edge looked at, even when nothing is critical |
| Average | `O(V + E)` | `O(V)` | One DFS; each edge is seen from both ends with constant work |
| Worst | `O(V + E)` | `O(V)` | A long chain makes the call stack `V` deep (and every edge a bridge) |

## When to use

| Great for | Avoid for |
|---|---|
| Single points of failure in networks, power grids and road systems | Directed graphs: use Kosaraju's or Tarjan's SCC for directed reachability |
| Splitting an undirected graph into 2-edge-connected or biconnected pieces | Graphs that keep changing: each new edge means rerunning the DFS |
