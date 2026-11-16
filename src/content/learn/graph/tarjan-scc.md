---
title: "Tarjan's Strongly Connected Components"
topic: "graph"
order: 18
difficulty: "advanced"
timeComplexity: "O(V + E)"
spaceComplexity: "O(V)"
tags: ["graph", "tarjan", "scc", "dfs", "directed"]
---

## What is Tarjan's SCC Algorithm?

In a sprawling subway system where certain trains run along strict one-way tracks, a group of stations forms a **Strongly Connected Component (SCC)** if you can depart from any station in the group and reach any other station in that same group without getting trapped.

Kosaraju's algorithm finds SCCs by running two full DFS sweeps and constructing a transposed (reversed) graph.
Robert Tarjan discovered something much more elegant: you can identify **every SCC in a single DFS pass**, without reversing edges, using discovery timestamps and a simple stack!

## Core Concept

Tarjan's algorithm uses depth-first search while maintaining two integers for every vertex $u$:
1. **`disc[u]` (Discovery Time)**: The tick of a global counter when node $u$ was first visited.
2. **`low[u]` (Low-Link Value)**: The smallest discovery time reachable from $u$ through its DFS subtree, including at most one back-edge to a node currently on the stack.

### Key Invariant & Root Identification
- As DFS explores forward edges, `low[u] = min(low[u], low[v])`.
- When encountering a back-edge to an active node $v$ still on the stack, `low[u] = min(low[u], disc[v])`.
- **Root Condition**: A vertex $u$ is the **root of an SCC** if and only if:
  $$\text{disc}[u] == \text{low}[u]$$
  This means no node in the subtree rooted at $u$ has a back-link to any ancestor of $u$. Thus, $u$ and every node stacked above it form an isolated maximal SCC. Pop elements from the stack down to and including $u$!

## Walkthrough

Consider a directed graph with 5 vertices:
Edges: `0 -> 1`, `1 -> 2`, `2 -> 0`, `1 -> 3`, `3 -> 4`

```
DFS Trace:
1. Start at 0: disc[0] = low[0] = 0. Stack: [0]
2. Move 0 -> 1: disc[1] = low[1] = 1. Stack: [0, 1]
3. Move 1 -> 2: disc[2] = low[2] = 2. Stack: [0, 1, 2]
4. Move 2 -> 0: Node 0 is already on the stack!
   Back-edge found: low[2] = min(low[2], disc[0]) = min(2, 0) = 0.
5. Backtrack to 1: low[1] = min(low[1], low[2]) = min(1, 0) = 0.
6. From 1, branch to 3: disc[3] = low[3] = 3. Stack: [0, 1, 2, 3]
7. Move 3 -> 4: disc[4] = low[4] = 4. Stack: [0, 1, 2, 3, 4]
8. Node 4 has no outgoing edges.
   Check root condition: disc[4] == low[4] (4 == 4) -> Root of SCC!
   Pop stack until 4: SCC #1 = [4]. Stack: [0, 1, 2, 3]
9. Backtrack to 3: low[3] = min(low[3], low[4]) = 3.
   Check root condition: disc[3] == low[3] (3 == 3) -> Root of SCC!
   Pop stack until 3: SCC #2 = [3]. Stack: [0, 1, 2]
10. Backtrack to 1: already explored.
11. Backtrack to 0:
    Check root condition: disc[0] == low[0] (0 == 0) -> Root of SCC!
    Pop stack until 0: SCC #3 = [2, 1, 0]. Stack: []

Identified 3 SCCs: [4], [3], [2, 1, 0] in a single linear pass!
```

## Python Code

```python
def tarjan_scc(n: int, adj: list[list[int]]) -> list[list[int]]:
    """Finds all Strongly Connected Components in an n-vertex directed graph (0 to n - 1)."""
    disc = [-1] * n
    low = [-1] * n
    on_stack = [False] * n
    stack: list[int] = []
    sccs: list[list[int]] = []
    timer = 0

    def dfs(u: int) -> None:
        nonlocal timer
        disc[u] = low[u] = timer
        timer += 1
        stack.append(u)
        on_stack[u] = True

        for v in adj[u]:
            if disc[v] == -1:
                # Tree edge: v not yet visited
                dfs(v)
                low[u] = min(low[u], low[v])
            elif on_stack[v]:
                # Back-edge: v is in the current DFS path / SCC under construction
                low[u] = min(low[u], disc[v])

        # If u is the root of an SCC, pop all component members
        if disc[u] == low[u]:
            component: list[int] = []
            while True:
                w = stack.pop()
                on_stack[w] = False
                component.append(w)
                if w == u:
                    break
            sccs.append(component)

    for i in range(n):
        if disc[i] == -1:
            dfs(i)

    return sccs
```

## Complexity

| Metric | Complexity | Why? |
|---|---|---|
| Time | `O(V + E)` | Every vertex and edge is visited exactly once in a single DFS pass |
| Space | `O(V)` | Recursion call stack, `disc`, `low`, and `on_stack` arrays of size $V$ |

*Comparison with Kosaraju's*: Tarjan's algorithm runs in roughly half the wall-clock time of Kosaraju's because it performs **one DFS pass instead of two** and does not require allocating or building the reversed adjacency graph.

## When to Use

| Great for | Avoid for |
|---|---|
| Condensing directed cyclic graphs into Directed Acyclic Graphs (DAGs) | Undirected graphs (use standard BFS/DFS or Tarjan's Bridge detection) |
| Solving 2-SAT (Boolean Satisfiability) problems in linear time | Memory models where recursion stack depth $> 10^5$ may trigger stack overflows (use iterative version or Kosaraju) |
| Detecting circular dependencies in compilers, build tools, and package managers | Finding simple cycles without grouping into maximal equivalence classes |
