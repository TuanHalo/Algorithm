---
title: "Depth-First Search (DFS)"
topic: "graph"
order: 3
difficulty: "beginner"
timeComplexity: "O(V + E)"
spaceComplexity: "O(V)"
visualizer: "/visualizers/graph/dfs.html"
diagram: "/diagrams/graph/dfs-flow.html"
tags: ["graph", "dfs", "recursion", "traversal"]
---

## What is depth-first search?

When walking a hedge maze, you follow one corridor as far as it goes, and only turn back at a dead end to try the last fork you passed.

DFS dives straight down each unvisited branch via recursion or a LIFO stack before backtracking to earlier vertices.

## Core idea

Mark the current node visited, recurse into each unvisited neighbor in turn, and return only after every node reachable from that branch has finished.

## Python code

```python
def dfs(
    adj: dict[str, list[str]],
    node: str,
    visited: set[str],
    order: list[str],
) -> None:
    visited.add(node)
    order.append(node)
    for neighbor in adj[node]:
        if neighbor not in visited:
            dfs(adj, neighbor, visited, order)
```

## Complexity

| Case | Time | Space | Why? |
|---|---|---|---|
| Best / Average / Worst | `O(V + E)` | `O(V)` | Visits each vertex once and checks every outgoing edge once; call stack reaches depth `V` on a long chain |

## When to use

| Great for | Avoid for |
|---|---|
| Exploring full components, finding cycles, and topological or SCC passes | Shortest paths in unweighted graphs (DFS can take a long detour first) |
| Path existence queries and maze backtracking | Very deep chains (`10,000+` nodes) with recursion, unless rewritten with an explicit stack |
