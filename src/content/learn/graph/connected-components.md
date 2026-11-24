---
title: "Connected Components"
topic: "graph"
order: 4
difficulty: "beginner"
timeComplexity: "O(V + E)"
spaceComplexity: "O(V)"
tags: ["graph", "connected-components", "dfs", "islands"]
---

## Complexity

| Case | Time | Space | Why? |
|---|---|---|---|
| Best | `O(V + E)` | `O(V)` | Even all-isolated vertices are each tried once by the outer loop |
| Average | `O(V + E)` | `O(V)` | One shared `visited` set: every vertex is pushed and popped once, every edge checked from both ends |
| Worst | `O(V + E)` | `O(V)` | One big island: the stack and `comp` can hold all `V` vertices |

## When to use

| Great for | Avoid for |
|---|---|
| Counting islands on a grid, friend circles, and clusters in a network | Directed reachability: use Kosaraju's or Tarjan's strongly connected components |
| "Is the whole graph connected?" on one fixed snapshot (one group means yes) | Edges that keep arriving: Union-Find merges groups without re-flooding |
