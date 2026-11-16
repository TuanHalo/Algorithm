---
title: "Connected Components"
topic: "graph"
order: 4
difficulty: "beginner"
timeComplexity: "O(V + E)"
spaceComplexity: "O(V)"
visualizer: "/visualizers/graph/connected-components.html"
diagram: "/diagrams/graph/connected-components-flow.html"
tags: ["graph", "connected-components", "dfs", "islands"]
---

## What are connected components?

Picture a map of islands linked by footbridges: you can walk between any two towns on the same island, while towns on separate islands never meet.

In an undirected graph, each maximal group of mutually reachable vertices is a connected component.

## Core idea

Loop through every vertex in the graph; whenever you meet an unvisited node, launch a DFS or BFS to collect its entire component into one group.

## Python code

```python
def count_components(
    nodes: list[str],
    adj: dict[str, list[str]],
) -> list[list[str]]:
    visited: set[str] = set()
    groups: list[list[str]] = []
    for start in nodes:
        if start in visited:
            continue
        comp, stack = [], [start]
        visited.add(start)
        while stack:
            u = stack.pop()
            comp.append(u)
            for v in adj[u]:
                if v not in visited:
                    visited.add(v)
                    stack.append(v)
        groups.append(comp)
    return groups
```

## Complexity

| Case | Time | Space | Why? |
|---|---|---|---|
| Best / Average / Worst | `O(V + E)` | `O(V)` | Sharing one `visited` set across the outer loop guarantees every vertex and edge runs once |

## When to use

| Great for | Avoid for |
|---|---|
| Counting islands on a grid, friend circles, and disconnected network clusters | Directed reachability (use Kosaraju's or Tarjan's SCC instead) |
| Checking if all nodes are connected in a single static snapshot | Graphs where new edges stream in dynamically (use Union-Find for faster updates) |
