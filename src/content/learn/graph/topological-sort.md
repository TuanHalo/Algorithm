---
title: "Topological Sort (Kahn's Algorithm)"
topic: "graph"
order: 7
difficulty: "intermediate"
timeComplexity: "O(V + E)"
spaceComplexity: "O(V)"
tags: ["graph", "topological-sort", "dag", "kahn"]
---

## Complexity

| Case | Time | Space | Why? |
|---|---|---|---|
| Best | `O(V + E)` | `O(V)` | Every edge is still counted once, even if the graph is one straight chain |
| Average | `O(V + E)` | `O(V)` | Each edge is counted once and crossed off once; each vertex is queued and placed once |
| Worst | `O(V + E)` | `O(V)` | Many vertices free at once only grow the queue, up to `V` |

## When to use

| Great for | Avoid for |
|---|---|
| Course prerequisites, build pipelines and task scheduling with dependencies | Undirected graphs: an edge has no "before" and "after" |
| Detecting a cycle in a directed graph (`len(order) < V`) and DP on a DAG (longest or shortest path) | Getting the one "right" order: any vertex at in-degree 0 may go first, so many orders are valid |
