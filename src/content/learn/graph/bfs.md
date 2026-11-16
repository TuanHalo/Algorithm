---
title: "Breadth-First Search (BFS)"
topic: "graph"
order: 2
difficulty: "beginner"
timeComplexity: "O(V + E)"
spaceComplexity: "O(V)"
visualizer: "/visualizers/graph/bfs.html"
diagram: "/diagrams/graph/bfs-flow.html"
tags: ["graph", "bfs", "queue", "shortest-path"]
---

## What is breadth-first search?

Drop a pebble into a pond and watch the ripples spread: the ring 1 step away forms first, then the ring 2 steps away, then 3.

BFS explores a graph in expanding distance layers from a starting vertex, so the first time it touches a node is guaranteed to be along a path with the fewest edges.

## Core idea

Keep a FIFO `deque` and a `visited` set, mark each neighbor visited before pushing it to the queue, and pop from the front until the queue empties.

## Python code

```python
from collections import deque


def bfs(adj: dict[str, list[str]], start: str) -> list[str]:
    visited = {start}
    queue = deque([start])
    order: list[str] = []

    while queue:
        node = queue.popleft()
        order.append(node)
        for neighbor in adj[node]:
            if neighbor not in visited:
                # Mark on enqueue so the same node is never queued twice
                visited.add(neighbor)
                queue.append(neighbor)
    return order
```

## Complexity

| Case | Time | Space | Why? |
|---|---|---|---|
| Best (target at start) | `O(1)` | `O(1)` | Finds the start vertex immediately if stopping on a target |
| Average / Worst | `O(V + E)` | `O(V)` | Enqueues each reachable vertex once and scans each incident edge once (or twice if undirected) |

## When to use

| Great for | Avoid for |
|---|---|
| Finding the shortest path in an unweighted graph or grid | Weighted graphs with varying edge costs (use 0-1 BFS or Dijkstra) |
| Level-order scans, minimum moves in puzzles, and multi-source spreading | Exploring all possible paths or backtracking problems where DFS fits better |
