---
title: "Dijkstra's Shortest Path"
topic: "graph"
order: 10
difficulty: "intermediate"
timeComplexity: "O((V + E) log V)"
spaceComplexity: "O(V)"
visualizer: "/visualizers/graph/dijkstra.html"
diagram: "/diagrams/graph/dijkstra-flow.html"
tags: ["graph", "dijkstra", "shortest-path", "heap"]
---

## What is Dijkstra's shortest path?

Think of driving between cities with highway tolls: a two-hop detour with cheap tolls can beat a direct highway with a steep fee.

Dijkstra's algorithm finds the cheapest path from one starting vertex to every reachable vertex in a graph with non-negative edge weights.

## Core idea

Pop the unvisited vertex with the smallest tentative distance from a min-heap, lock in its distance, and push any shorter path found through its outgoing edges.

## Python code

```python
import heapq


def dijkstra(
    nodes: list[str],
    adj: dict[str, list[tuple[str, int]]],
    start: str,
) -> dict[str, float]:
    dist: dict[str, float] = {u: float("inf") for u in nodes}
    dist[start] = 0
    heap: list[tuple[float, str]] = [(0, start)]

    while heap:
        d, u = heapq.heappop(heap)
        if d > dist[u]:
            continue  # Discard outdated entry superseded by a shorter path
        for v, w in adj[u]:
            if d + w < dist[v]:
                dist[v] = d + w
                heapq.heappush(heap, (dist[v], v))
    return dist
```

## Complexity

| Case | Time | Space | Why? |
|---|---|---|---|
| Average / Worst | `O((V + E) log V)` | `O(V + E)` | Each edge relaxation pushes at most one tuple onto the heap; popping takes `O(log V)` |

## When to use

| Great for | Avoid for |
|---|---|
| Road maps, network routing, and weighted graphs where all weights are `>= 0` | Graphs with any negative edge weight, since settled nodes can later drop |
| Positive weighted networks with changing edge tolls | Unweighted or `{0, 1}` graphs, where BFS or 0-1 BFS runs in linear time without heap overhead |
