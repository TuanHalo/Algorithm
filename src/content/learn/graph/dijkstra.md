---
title: "Dijkstra's Shortest Path"
topic: "graph"
order: 10
difficulty: "intermediate"
timeComplexity: "O((V + E) log V)"
spaceComplexity: "O(V + E)"
tags: ["graph", "dijkstra", "shortest-path", "heap"]
---

## Complexity

| Case | Time | Space | Why? |
|---|---|---|---|
| Best | `O((V + E) log V)` | `O(V)` | Every reachable vertex still goes through the heap once |
| Average | `O((V + E) log V)` | `O(V + E)` | Each improvement pushes one entry; each push and pop costs `O(log V)` |
| Worst | `O((V + E) log V)` | `O(V + E)` | Many improvements leave outdated entries: up to `E` of them wait in the heap |

## When to use

| Great for | Avoid for |
|---|---|
| Road maps, network routing, any graph whose weights are all `â‰¥ 0` | Any negative weight: a settled vertex could still get cheaper (use Bellman-Ford) |
| One start to many targets; stop early when the target pops if you only need one | Unweighted or `{0, 1}` graphs: BFS or 0-1 BFS do it in linear time without a heap |
