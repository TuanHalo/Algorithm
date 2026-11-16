---
title: "Bipartite Graph Check (2-Coloring)"
topic: "graph"
order: 6
difficulty: "intermediate"
timeComplexity: "O(V + E)"
spaceComplexity: "O(V)"
visualizer: "/visualizers/graph/bipartite-check.html"
diagram: "/diagrams/graph/bipartite-check-flow.html"
tags: ["graph", "bipartite", "2-coloring", "bfs"]
---

## What is a bipartite check?

Suppose you are splitting players into two jersey colors, blue and peach, so that every rivalry edge connects opposite colors.

A graph is bipartite if you can assign every node one of two colors without any edge joining two nodes of the same color, which holds whenever the graph has no odd-length cycles.

## Core idea

Seed each unvisited component with color `0`, run BFS to assign every neighbor `1 - color[u]`, and return `False` if any edge meets a neighbor with the same color.

## Python code

```python
from collections import deque


def is_bipartite(nodes: list[str], adj: dict[str, list[str]]) -> bool:
    color: dict[str, int] = {}
    for start in nodes:
        if start in color:
            continue
        color[start] = 0
        queue = deque([start])
        while queue:
            u = queue.popleft()
            for v in adj[u]:
                if v not in color:
                    color[v] = 1 - color[u]
                    queue.append(v)
                elif color[v] == color[u]:
                    return False
    return True
```

## Complexity

| Case | Time | Space | Why? |
|---|---|---|---|
| Best (early odd cycle) | `O(1)` to `O(V)` | `O(V)` | Exits immediately on the first same-color edge conflict |
| Average / Worst | `O(V + E)` | `O(V)` | Colors each node once and verifies every edge once |

## When to use

| Great for | Avoid for |
|---|---|
| Checking if a graph can be split into two conflict-free groups | Scheduling that needs 3 or more colors (NP-complete graph coloring) |
| Detecting whether an undirected graph contains any odd-length cycle | Directed graphs unless you first ignore edge directions |
