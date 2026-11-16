---
title: "Topological Sort (Kahn's Algorithm)"
topic: "graph"
order: 7
difficulty: "intermediate"
timeComplexity: "O(V + E)"
spaceComplexity: "O(V)"
visualizer: "/visualizers/graph/topological-sort.html"
diagram: "/diagrams/graph/topological-sort-flow.html"
tags: ["graph", "topological-sort", "dag", "kahn"]
---

## What is topological sort?

Before putting on your shoes, you put on your socks; before compiling an app, you compile the libraries it imports.

Topological sort arranges the vertices of a directed acyclic graph (DAG) into a linear sequence so every directed edge `u -> v` puts `u` before `v`.

## Core idea

Count incoming edges (`in_deg`) for every node, queue all nodes with `in_deg == 0`, and repeatedly pop a node while decrementing its neighbors' in-degrees.

## Python code

```python
from collections import deque


def topo_sort(nodes: list[str], adj: dict[str, list[str]]) -> list[str]:
    in_deg = {u: 0 for u in nodes}
    for u in nodes:
        for v in adj[u]:
            in_deg[v] += 1

    queue = deque([u for u in nodes if in_deg[u] == 0])
    order: list[str] = []
    while queue:
        u = queue.popleft()
        order.append(u)
        for v in adj[u]:
            in_deg[v] -= 1
            if in_deg[v] == 0:
                queue.append(v)
    # Any node left unscheduled belongs to or depends on a cycle
    return order if len(order) == len(nodes) else []
```

## Complexity

| Case | Time | Space | Why? |
|---|---|---|---|
| Best / Average / Worst | `O(V + E)` | `O(V)` | Computes all in-degrees in one edge pass, then enqueues and pops each DAG vertex at most once |

## When to use

| Great for | Avoid for |
|---|---|
| Course prerequisites, build pipelines, and task scheduling with dependencies | Undirected graphs (edges have no "before/after" direction) |
| Finding the longest or shortest path on a DAG in `O(V + E)` using DP | Graphs that allow cycles unless you want to reject them via `len(order) < V` |
