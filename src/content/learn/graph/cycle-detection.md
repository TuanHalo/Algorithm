---
title: "Cycle Detection in Graphs"
topic: "graph"
order: 5
difficulty: "intermediate"
timeComplexity: "O(V + E)"
spaceComplexity: "O(V)"
visualizer: "/visualizers/graph/cycle-detection.html"
diagram: "/diagrams/graph/cycle-detection-flow.html"
tags: ["graph", "cycle-detection", "dfs", "three-color"]
---

## What is cycle detection?

If task A waits on task B and task B waits on task A, both stall forever because the dependency chain loops back onto itself.

Cycle detection uses DFS to spot any edge that circles back to an ancestor, using a `parent` check for undirected graphs and three visit states (`0`, `1`, `2`) for directed graphs.

## Core idea

In a directed graph, mark active recursion nodes as `1` (visiting) and finished nodes as `2` (done); hitting a state `1` neighbor means you found a cycle.

## Python code

```python
def has_cycle_directed(
    nodes: list[str],
    adj: dict[str, list[str]],
) -> bool:
    # 0 = unvisited, 1 = on current path, 2 = completely explored
    state = {u: 0 for u in nodes}

    def dfs(u: str) -> bool:
        state[u] = 1
        for v in adj[u]:
            if state[v] == 1 or (state[v] == 0 and dfs(v)):
                return True
        state[u] = 2
        return False

    return any(state[u] == 0 and dfs(u) for u in nodes)
```

## Complexity

| Case | Time | Space | Why? |
|---|---|---|---|
| Best (early cycle) | `O(1)` to `O(V)` | `O(V)` | Stops on the first back-edge to an active ancestor |
| Average / Worst | `O(V + E)` | `O(V)` | Visits every vertex and edge at most once across all components |

## When to use

| Great for | Avoid for |
|---|---|
| Validating build graphs, spreadsheet formulas, and deadlock dependencies | Undirected graphs unless you pass `parent` to ignore the edge back to the caller |
| Checking whether a directed graph is a DAG before running DP | Linked lists where `O(1)` extra memory is required (use Floyd's tortoise and hare) |
