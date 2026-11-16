---
title: "Kosaraju's Strongly Connected Components"
topic: "graph"
order: 15
difficulty: "advanced"
timeComplexity: "O(V + E)"
spaceComplexity: "O(V + E)"
visualizer: "/visualizers/graph/kosaraju-scc.html"
diagram: "/diagrams/graph/kosaraju-scc-flow.html"
tags: ["graph", "scc", "kosaraju", "directed"]
---

## What is Kosaraju's algorithm?

In a city of one-way streets, a district is strongly connected if you can drive from any intersection in the district to any other and back again.

Kosaraju's algorithm splits any directed graph into its maximal strongly connected components (SCCs) in two linear DFS passes.

## Core idea

Run DFS on the original graph to push vertices onto a finish-order stack, reverse every directed edge (`Gᵀ`), and run DFS in reverse stack order to peel off one SCC at a time.

## Python code

```python
def kosaraju_scc(
    nodes: list[str],
    adj: dict[str, list[str]],
    rev: dict[str, list[str]],
) -> list[list[str]]:
    seen: set[str] = set()
    order: list[str] = []

    def dfs(u: str, graph: dict[str, list[str]], out: list[str]) -> None:
        seen.add(u)
        for v in graph[u]:
            if v not in seen:
                dfs(v, graph, out)
        out.append(u)

    for u in nodes:
        if u not in seen:
            dfs(u, adj, order)

    seen.clear()
    sccs: list[list[str]] = []
    for u in reversed(order):
        if u not in seen:
            comp: list[str] = []
            dfs(u, rev, comp)
            sccs.append(comp)
    return sccs
```

## Complexity

| Case | Time | Space | Why? |
|---|---|---|---|
| Best / Average / Worst | `O(V + E)` | `O(V + E)` | Runs two linear DFS passes and stores the transposed adjacency list `rev` |

## When to use

| Great for | Avoid for |
|---|---|
| Collapsing directed cycles into a condensation DAG or solving 2-SAT | Undirected graphs (a standard connected-components pass is half the work) |
| Finding mutual reachability clusters in call graphs or road networks | Memory-tight environments where storing the reversed graph `rev` is costly (use Tarjan's single-pass SCC) |
