---
title: "Union-Find (Disjoint Set)"
topic: "graph"
order: 8
difficulty: "intermediate"
timeComplexity: "O(α(V))"
spaceComplexity: "O(V)"
tags: ["graph", "union-find", "disjoint-set", "connectivity"]
---

## Complexity

| Case | Time | Space | Why? |
|---|---|---|---|
| Best | `O(1)` | `O(n)` | `find` on a root or a direct child of one, right after compression |
| Average | `O(Î±(n))` | `O(n)` | Amortized over any sequence: rank keeps trees short and compression flattens every chain walked; `Î±(n) â‰¤ 4` in practice |
| Worst | `O(log n)` | `O(n)` | One `find` before any compression: union by rank caps the height at `logâ‚‚ n` |

## When to use

| Great for | Avoid for |
|---|---|
| Edges arriving one by one: "are these connected yet?", Kruskal's MST, cycle checks in undirected graphs | Deleting edges or splitting sets: standard Union-Find only merges |
| Grouping equal items (accounts, equations like `a == b`), counting islands as they appear | Shortest paths or directed reachability: it only knows "same set or not" |
