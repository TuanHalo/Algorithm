---
title: "Tarjan's Strongly Connected Components"
topic: "graph"
order: 18
difficulty: "advanced"
timeComplexity: "O(V + E)"
spaceComplexity: "O(V)"
tags: ["graph", "tarjan", "scc", "dfs", "directed"]
---

## Complexity

| Case | Time | Space | Why? |
|---|---|---|---|
| Best | `O(V + E)` | `O(V)` | Every vertex is entered once and every arrow read once, whatever the shape |
| Average | `O(V + E)` | `O(V)` | One DFS; each vertex is pushed and popped exactly once |
| Worst | `O(V + E)` | `O(V)` | A long chain makes the call stack and the vertex stack `V` deep |

## When to use

| Great for | Avoid for |
|---|---|
| Strongly connected components in one pass, without building the reversed graph (Kosaraju needs both) | Undirected graphs: use connected components, or the bridges and articulation-point DFS |
| Condensing a directed graph into a DAG of components, 2-SAT, circular dependencies in build tools | Recursion deeper than about `10^5` in Python: rewrite the DFS with an explicit stack |
