---
title: "Depth-First Search (DFS)"
topic: "graph"
order: 3
difficulty: "beginner"
timeComplexity: "O(V + E)"
spaceComplexity: "O(V)"
tags: ["graph", "dfs", "recursion", "traversal"]
---

## Complexity

| Case | Time | Space | Why? |
|---|---|---|---|
| Best | `O(V + E)` | `O(V)` | Every reachable vertex still gets its one call and reads its whole list |
| Average | `O(V + E)` | `O(V)` | One call per vertex, each edge read once from each end |
| Worst | `O(V + E)` | `O(V)` | A long chain makes the call stack `V` frames deep |

## When to use

| Great for | Avoid for |
|---|---|
| Exploring whole components, path-exists questions, and maze backtracking | Shortest paths in unweighted graphs: DFS can take a long detour first (use BFS) |
| The building block of cycle detection, topological order, SCCs and bridges | Very deep graphs (`10,000+` levels) with recursion: use an explicit stack |
