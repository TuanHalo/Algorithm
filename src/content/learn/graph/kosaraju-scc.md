---
title: "Kosaraju's Strongly Connected Components"
topic: "graph"
order: 15
difficulty: "advanced"
timeComplexity: "O(V + E)"
spaceComplexity: "O(V + E)"
tags: ["graph", "scc", "kosaraju", "directed"]
---

## Complexity

| Case | Time | Space | Why? |
|---|---|---|---|
| Best | `O(V + E)` | `O(V + E)` | Both passes visit every vertex and read every arrow, whatever the shape |
| Average | `O(V + E)` | `O(V + E)` | Two linear DFS passes; `rev` stores every arrow a second time |
| Worst | `O(V + E)` | `O(V + E)` | A long chain makes the call stack `V` deep in each pass |

## When to use

| Great for | Avoid for |
|---|---|
| Collapsing directed cycles into a DAG of components (the condensation), 2-SAT | Undirected graphs: plain connected components do it in one pass |
| Finding groups that can all reach each other: call graphs, road networks, web links | Tight memory: building `rev` doubles the graph (Tarjan's SCC needs one pass and no `rev`) |
