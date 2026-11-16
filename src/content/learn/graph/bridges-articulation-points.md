---
title: "Bridges & Articulation Points"
topic: "graph"
order: 16
difficulty: "advanced"
timeComplexity: "O(V + E)"
spaceComplexity: "O(V)"
visualizer: "/visualizers/graph/bridges-articulation-points.html"
diagram: "/diagrams/graph/bridges-articulation-points-flow.html"
tags: ["graph", "tarjan", "bridges", "articulation-points"]
---

## What are bridges and articulation points?

If removing a single highway cuts a country in two, that highway is a bridge; if closing one junction splits the network, that junction is an articulation point.

Tarjan's bridge and articulation-point algorithm locates every single-edge and single-node failure point in one DFS pass.

## Core idea

Track each node's discovery timestamp (`tin[u]`) and the earliest ancestor timestamp reachable from its subtree (`low[u]`); edge `(u, v)` is a bridge whenever `low[v] > tin[u]`.

## Python code

```python
def find_bridges_and_aps(
    nodes: list[str],
    adj: dict[str, list[str]],
) -> tuple[list[tuple[str, str]], set[str]]:
    tin, low, timer = {}, {}, [0]
    bridges: list[tuple[str, str]] = []
    aps: set[str] = set()

    def dfs(u: str, parent: str | None) -> None:
        tin[u] = low[u] = timer[0]
        timer[0] += 1
        children = 0
        for v in adj[u]:
            if v == parent:
                continue
            if v in tin:
                low[u] = min(low[u], tin[v])
            else:
                children += 1
                dfs(v, u)
                low[u] = min(low[u], low[v])
                if low[v] > tin[u]:
                    bridges.append((u, v))
                if parent is not None and low[v] >= tin[u]:
                    aps.add(u)
        if parent is None and children > 1:
            aps.add(u)

    for u in nodes:
        if u not in tin:
            dfs(u, None)
    return bridges, aps
```

## Complexity

| Case | Time | Space | Why? |
|---|---|---|---|
| Best / Average / Worst | `O(V + E)` | `O(V)` | Visits every vertex and undirected edge once while keeping `tin`, `low`, and the recursion stack |

## When to use

| Great for | Avoid for |
|---|---|
| Finding single points of failure in computer networks, power grids, and road systems | Directed graphs (use Kosaraju's or Tarjan's SCC for directed reachability) |
| Decomposing an undirected graph into 2-edge-connected components | Dynamic graphs where edges are added repeatedly after initialization |
