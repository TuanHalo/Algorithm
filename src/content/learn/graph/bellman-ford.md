---
title: "Bellman-Ford Shortest Path"
topic: "graph"
order: 11
difficulty: "advanced"
timeComplexity: "O(V · E)"
spaceComplexity: "O(V)"
visualizer: "/visualizers/graph/bellman-ford.html"
diagram: "/diagrams/graph/bellman-ford-flow.html"
tags: ["graph", "bellman-ford", "negative-weights", "shortest-path"]
---

## What is Bellman-Ford?

Suppose some roads pay you a rebate (a negative weight) instead of charging a toll, so a path can become cheaper several hops later.

Bellman-Ford computes single-source shortest paths even when edge weights are negative, and flags any reachable negative-weight cycle.

## Core idea

Relax every edge `V - 1` times so improvements ripple across the longest possible simple path, then check one more pass to see if any distance still drops.

## Python code

```python
def bellman_ford(
    nodes: list[str],
    edges: list[tuple[str, str, int]],
    start: str,
) -> dict[str, float] | None:
    dist: dict[str, float] = {u: float("inf") for u in nodes}
    dist[start] = 0

    for _ in range(len(nodes) - 1):
        for u, v, w in edges:
            if dist[u] != float("inf") and dist[u] + w < dist[v]:
                dist[v] = dist[u] + w

    for u, v, w in edges:
        if dist[u] != float("inf") and dist[u] + w < dist[v]:
            # Distance still drops after V - 1 passes, proving a negative cycle
            return None
    return dist
```

## Complexity

| Case | Time | Space | Why? |
|---|---|---|---|
| Best (early exit if unchanged) | `O(E)` | `O(V)` | Stops after one pass with zero relaxations if an early-stop flag is added |
| Average / Worst | `O(V · E)` | `O(V)` | Scans all `E` edges up to `V - 1` times plus one cycle-check pass |

## When to use

| Great for | Avoid for |
|---|---|
| Weighted graphs with negative edges or currency arbitrage detection | Large graphs with non-negative weights (Dijkstra is far faster than `O(V · E)`) |
| Shortest paths capped at `k` stops (run `k` relaxation passes) | All-pairs shortest paths on small graphs where Floyd-Warshall fits directly |
