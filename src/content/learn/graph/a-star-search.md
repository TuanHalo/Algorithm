---
title: "A* Search Algorithm"
topic: "graph"
order: 17
difficulty: "advanced"
timeComplexity: "O(E) to O(b^d)"
spaceComplexity: "O(V)"
tags: ["graph", "a-star", "heuristic", "shortest-path", "search"]
---

## What is A* Search?

Imagine driving from Paris to Rome.
Dijkstra's algorithm acts like water spilling from a cup: it expands uniformly in every single direction—exploring London, Madrid, Berlin, and Amsterdam—before eventually stumbling into Rome.
While mathematically guaranteed to find the shortest path, it wastes immense computational effort exploring cities in the opposite direction.

Now imagine driving with both an **odometer** (measuring how far you've traveled) and a **compass pointing directly at Rome**.
You would naturally prioritize highways pointing southeast.

This is **A* Search**: an informed best-first search algorithm that combines the exact path cost from the start with an estimated distance to the goal, steering the search directly toward the target.

## Core Concept

A* selects the next node to expand by evaluating a scoring function $f(n)$:
$$f(n) = g(n) + h(n)$$

Where:
1. **$g(n)$ (Exact Cost)**: The shortest known distance from the starting node to node $n$ (just like Dijkstra).
2. **$h(n)$ (Heuristic Estimate)**: An estimated cost from node $n$ to the goal.
3. **$f(n)$ (Estimated Total Cost)**: The total estimated cost of the cheapest path passing through $n$.

### The Golden Rule: Admissibility and Consistency
- **Admissible Heuristic**: $h(n) \le h^*(n)$ (never overestimates the true remaining distance to the goal).
  *If $h$ is admissible on trees/DAGs, A* is mathematically guaranteed to return the optimal shortest path.*
- **Consistent (Monotonic) Heuristic**: $h(u) \le \text{cost}(u, v) + h(v)$ (satisfies the triangle inequality).
  *If $h$ is consistent, the first time a node is popped from the priority queue, its path cost $g(n)$ is already optimal—no reopening or reprocessing needed.*

Common heuristics for grids:
- **Manhattan Distance**: $h(x, y) = |x - x_g| + |y - y_g|$ (for 4-directional grid movement).
- **Euclidean Distance**: $h(x, y) = \sqrt{(x - x_g)^2 + (y - y_g)^2}$ (for any-angle or 8-directional continuous space).

## Walkthrough

Consider finding a path on a 2D grid from `Start (0, 0)` to `Goal (2, 2)` with an obstacle at `(1, 1)`:

```
Grid:
  S  .  .      (0,0)  (0,1)  (0,2)
  .  #  .  ->  (1,0)  [wall] (1,2)
  .  .  G      (2,0)  (2,1)  (2,2)

Heuristic: Manhattan distance h(x,y) = |x - 2| + |y - 2|
h(0,0) = 4, h(0,1) = 3, h(1,0) = 3, h(0,2) = 2, h(2,0) = 2, h(2,2) = 0

Step 1:
  Push Start (0,0): g=0, h=4, f=4
  Pop (0,0). Neighbors:
    (0,1): g=1, h=3, f=4
    (1,0): g=1, h=3, f=4

Step 2:
  Pop (0,1) with f=4. Neighbors:
    (0,2): g=2, h=2, f=4
    (1,1) is wall! Skip.

Step 3:
  Pop (0,2) with f=4. Neighbors:
    (1,2): g=3, h=1, f=4

Step 4:
  Pop (1,2) with f=4. Neighbors:
    (2,2) Goal!: g=4, h=0, f=4

Step 5:
  Pop Goal (2,2) with f=4.
  Target reached! Optimal path: (0,0) -> (0,1) -> (0,2) -> (1,2) -> (2,2).
  Notice nodes like (2,0) were never even expanded!
```

## Python Code

```python
import heapq


def a_star_grid(
    grid: list[list[int]], start: tuple[int, int], goal: tuple[int, int]
) -> list[tuple[int, int]] | None:
    """Finds the shortest path on a 2D grid (0 = open, 1 = obstacle) using A* search."""
    rows, cols = len(grid), len(grid[0])

    def heuristic(r: int, c: int) -> int:
        # Manhattan distance to goal
        return abs(r - goal[0]) + abs(c - goal[1])

    # Priority queue stores tuples of: (f_score, g_score, (row, col))
    open_set: list[tuple[int, int, tuple[int, int]]] = []
    start_h = heuristic(start[0], start[1])
    heapq.heappush(open_set, (start_h, 0, start))

    g_score: dict[tuple[int, int], int] = {start: 0}
    came_from: dict[tuple[int, int], tuple[int, int]] = {}

    while open_set:
        f, g, current = heapq.heappop(open_set)

        if current == goal:
            # Reconstruct path from goal back to start
            path = [current]
            while current in came_from:
                current = came_from[current]
                path.append(current)
            return path[::-1]

        # Stale priority queue entry check
        if g > g_score.get(current, float("inf")):
            continue

        r, c = current
        for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            nr, nc = r + dr, c + dc
            neighbor = (nr, nc)

            if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == 0:
                tentative_g = g + 1
                if tentative_g < g_score.get(neighbor, float("inf")):
                    g_score[neighbor] = tentative_g
                    f_score = tentative_g + heuristic(nr, nc)
                    came_from[neighbor] = current
                    heapq.heappush(open_set, (f_score, tentative_g, neighbor))

    return None  # No path exists
```

## Complexity

| Metric | Complexity | Why? |
|---|---|---|
| Time (Ideal Heuristic) | `O(L)` | With a perfect heuristic ($h = h^*$), A* traces the exact optimal path with zero deviations ($L = \text{path length}$) |
| Time (Worst Case) | `O(E · log V)` or `O(b^d)` | If $h(n) = 0$ everywhere, A* degrades precisely into Dijkstra's algorithm; $b$ is branching factor, $d$ is depth |
| Space | `O(V)` | Must store all visited and open boundary nodes in memory |

## When to Use

| Great for | Avoid for |
|---|---|
| Pathfinding on maps, GPS navigation, and video game AI (moving units across terrain) | Graphs with negative edge weights (heuristics cannot guarantee optimality) |
| Large state-space puzzle solving (e.g. 15-puzzle, Rubik's cube, Sokoban) | All-pairs shortest path queries (use Floyd-Warshall) |
| Environments with spatial coordinates where Euclidean/Manhattan distance is easily calculated | Memory-critical systems where storing the $O(V)$ open set exhausts RAM (use IDA* - Iterative Deepening A*) |
