---
title: "Breadth-First Search (BFS)"
topic: "graph"
order: 2
difficulty: "beginner"
timeComplexity: "O(V + E)"
spaceComplexity: "O(V)"
tags: ["graph", "bfs", "queue", "shortest-path"]
---

## Complexity

| Case | Time | Space | Why? |
|---|---|---|---|
| Best | `O(V + E)` | `O(V)` | Even a tiny graph has every reachable vertex queued once and every edge read |
| Average | `O(V + E)` | `O(V)` | Each reachable vertex is popped once; each edge is read once from each end |
| Worst | `O(V + E)` | `O(V)` | A star graph puts `V − 1` vertices in the queue at the same time |

## When to use

| Great for | Avoid for |
|---|---|
| Finding the shortest path in an unweighted graph or grid | Weighted graphs with varying edge costs (use 0-1 BFS or Dijkstra) |
| Level-order scans, minimum moves in puzzles, and multi-source spreading | Exploring all possible paths or backtracking problems where DFS fits better |
