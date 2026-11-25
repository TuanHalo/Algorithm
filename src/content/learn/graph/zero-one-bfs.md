---
title: "0-1 BFS"
topic: "graph"
order: 9
difficulty: "intermediate"
timeComplexity: "O(V + E)"
spaceComplexity: "O(V)"
tags: ["graph", "0-1-bfs", "deque", "shortest-path"]
---

## Complexity

| Case | Time | Space | Why? |
|---|---|---|---|
| Best | `O(V + E)` | `O(V)` | Every reachable vertex is popped and its edges tried at least once |
| Average | `O(V + E)` | `O(V)` | The deque stays sorted with two levels, so no heap and no `log V` |
| Worst | `O(V + E)` | `O(V)` | A vertex is re-pushed only when its distance drops, which happens a bounded number of times with weights 0 and 1 |

## When to use

| Great for | Avoid for |
|---|---|
| Grids where moving straight is free and turning or breaking a wall costs 1 | Any other weights like 2, 5 or 12: use Dijkstra |
| Graphs mixing free transfers with unit-cost hops | Negative weights: use Bellman-Ford |
