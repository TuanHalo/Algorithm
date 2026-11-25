---
title: "A* Search Algorithm"
topic: "graph"
order: 17
difficulty: "advanced"
timeComplexity: "O((V + E) log V)"
spaceComplexity: "O(V)"
tags: ["graph", "a-star", "heuristic", "shortest-path", "search"]
---

## Complexity

| Case | Time | Space | Why? |
|---|---|---|---|
| Best | `O(L log V)` | `O(V)` | A perfect `h` walks straight along the answer route of `L` edges |
| Average | Between the two | `O(V)` | The better `h` estimates, the fewer vertices are expanded |
| Worst | `O((V + E) log V)` | `O(V + E)` | With `h = 0` everywhere A* is exactly Dijkstra |

## When to use

| Great for | Avoid for |
|---|---|
| Maps, GPS and game pathfinding toward one known goal (grids: `h` = Manhattan distance; keep a `came_from` map to rebuild the path) | Negative edge weights: the early stop is no longer safe |
| Puzzle search (15-puzzle, Sokoban) where a good lower bound on the remaining moves exists | Distances to every vertex, or all pairs: use Dijkstra or Floyd-Warshall |
| Any Dijkstra use with a single target and a cheap, admissible estimate | An estimate that can overestimate: the answer may not be the cheapest |
