---
title: "Cycle Detection in Graphs"
topic: "graph"
order: 5
difficulty: "intermediate"
timeComplexity: "O(V + E)"
spaceComplexity: "O(V)"
diagram: "/diagrams/graph/cycle-detection-flow.html"
tags: ["graph", "cycle-detection", "dfs", "three-color"]
---

## Complexity

| Case | Time | Space | Why? |
|---|---|---|---|
| Best | `O(1)` to `O(V)` | `O(V)` | Stops at the first back edge, e.g. a loop right next to vertex 0 |
| Average | `O(V + E)` | `O(V)` | Each vertex is entered once (only from state 0) and reads its edges once |
| Worst | `O(V + E)` | `O(V)` | A DAG has no back edge, so every vertex and edge is checked; a long chain makes the call stack `V` deep |

## When to use

| Great for | Avoid for |
|---|---|
| Build graphs, spreadsheet formulas and deadlock checks: "is this dependency graph a DAG?" | Undirected graphs as written: every edge points back at its parent. Pass `parent` and ignore that one edge instead |
| A check before DP or topological order on a DAG (Kahn's algorithm also detects cycles: `len(order) < V`) | Linked lists with `O(1)` extra memory: use Floyd's tortoise and hare |
