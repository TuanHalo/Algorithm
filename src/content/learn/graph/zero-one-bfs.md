---
title: "0-1 BFS"
topic: "graph"
order: 9
difficulty: "intermediate"
timeComplexity: "O(V + E)"
spaceComplexity: "O(V)"
visualizer: "/visualizers/graph/zero-one-bfs.html"
diagram: "/diagrams/graph/zero-one-bfs-flow.html"
tags: ["graph", "0-1-bfs", "deque", "shortest-path"]
---

## What is 0-1 BFS?

Imagine a transit pass where walking between adjacent corridors is free (`0` cost), while passing through a turnstile costs `1` token.

0-1 BFS finds shortest paths on graphs whose edge weights are only `0` or `1` in `O(V + E)` time by using a double-ended queue instead of a heap.

## Core idea

Pop from the front of a `deque`: push neighbors reached across `0`-weight edges to the front (`appendleft`), and push neighbors reached across `1`-weight edges to the back (`append`).

## Python code

```python
from collections import deque


def zero_one_bfs(
    nodes: list[str],
    adj: dict[str, list[tuple[str, int]]],
    start: str,
) -> dict[str, float]:
    dist: dict[str, float] = {u: float("inf") for u in nodes}
    dist[start] = 0
    dq = deque([start])

    while dq:
        u = dq.popleft()
        for v, w in adj[u]:
            if dist[u] + w < dist[v]:
                dist[v] = dist[u] + w
                if w == 0:
                    # Same distance stays at the front to keep deque sorted
                    dq.appendleft(v)
                else:
                    dq.append(v)
    return dist
```

## Complexity

| Case | Time | Space | Why? |
|---|---|---|---|
| Best / Average / Worst | `O(V + E)` | `O(V)` | Every vertex enters the front or back at most once per distance improvement, avoiding `O(log V)` heap work |

## When to use

| Great for | Avoid for |
|---|---|
| Grid games where moving straight costs `0` and turning or breaking a wall costs `1` | Graphs with arbitrary edge weights like `2`, `5`, or `12` (use Dijkstra) |
| Graphs with free transfers and unit-cost hops | Negative edge weights (use Bellman-Ford) |
