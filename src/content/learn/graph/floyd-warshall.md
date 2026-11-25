---
title: "Floyd-Warshall All-Pairs Shortest Path"
topic: "graph"
order: 12
difficulty: "advanced"
timeComplexity: "O(V³)"
spaceComplexity: "O(V²)"
tags: ["graph", "floyd-warshall", "all-pairs", "dynamic-programming"]
---

## Complexity

| Case | Time | Space | Why? |
|---|---|---|---|
| Best | `O(VÂ³)` | `O(VÂ²)` | The three loops always run `n Ã— n Ã— n` times, even if nothing improves |
| Average | `O(VÂ³)` | `O(VÂ²)` | One addition and one comparison per `(k, i, j)`; the table is updated in place |
| Worst | `O(VÂ³)` | `O(VÂ²)` | Same loops: the work never depends on the weights |

## When to use

| Great for | Avoid for |
|---|---|
| All-pairs shortest paths on small dense graphs (`V â‰¤ 400`), negative edges allowed | `V > 1,000`: `VÂ³` means billions of steps |
| Negative-cycle checks (`dist[i][i] < 0` at the end) and transitive closure ("can i reach j?") | One start only: a single Dijkstra or BFS is much faster |
