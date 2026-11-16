---
title: "Floyd-Warshall All-Pairs Shortest Path"
topic: "graph"
order: 12
difficulty: "advanced"
timeComplexity: "O(V³)"
spaceComplexity: "O(V²)"
visualizer: "/visualizers/graph/floyd-warshall.html"
diagram: "/diagrams/graph/floyd-warshall-flow.html"
tags: ["graph", "floyd-warshall", "all-pairs", "dynamic-programming"]
---

## What is Floyd-Warshall?

Think of the mileage chart printed on the back of a highway atlas showing the shortest drive between every pair of cities.

Floyd-Warshall fills that full `V x V` shortest-distance table in place by testing every vertex as a potential stopover.

## Core idea

Loop over each intermediate node `k` on the outside, and update every pair `(i, j)` whenever routing `i -> k -> j` beats the current `dist[i][j]`.

## Python code

```python
def floyd_warshall(n: int, dist: list[list[float]]) -> list[list[float]]:
    for k in range(n):
        for i in range(n):
            for j in range(n):
                via_k = dist[i][k] + dist[k][j]
                if via_k < dist[i][j]:
                    dist[i][j] = via_k
    return dist
```

## Complexity

| Case | Time | Space | Why? |
|---|---|---|---|
| Best / Average / Worst | `O(V³)` | `O(V²)` | Runs three nested `0..V-1` loops over the `V x V` distance matrix |

## When to use

| Great for | Avoid for |
|---|---|
| All-pairs shortest paths on small dense graphs (`V <= 400`) | Graphs with `V > 1,000`, where `O(V³)` takes billions of steps |
| Checking negative cycles on the diagonal (`dist[i][i] < 0`) or transitive closure | Single-source queries where one Dijkstra or BFS call is much faster |
