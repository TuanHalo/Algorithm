---
title: "Job Sequencing with Deadlines"
topic: "greedy"
order: 4
difficulty: "intermediate"
timeComplexity: "O(n log n + n · d)"
spaceComplexity: "O(d)"
tags: ["greedy", "scheduling", "deadlines", "sorting", "disjoint-set"]
---

## Complexity

| Case | Time | Space | Why? |
|------|------|-------|------|
| Best (every job finds its deadline slot free) | `O(n log n + n)` | `O(d)` | Sorting dominates; each job checks one slot |
| Average | `O(n log n + n · d)` | `O(d)` | Each job scans down from its deadline until a slot is free |
| Worst (all deadlines are `d`, slots fill up) | `O(n log n + n · d)` | `O(d)` | Late jobs scan every slot before being dropped; `slots` has `d + 1` entries |

## When to use

| Great for | Avoid for |
|---|---|
| Single-machine scheduling where every task takes one unit of time and has a hard deadline | Jobs with different durations (NP-hard in general) |
| Maximizing reward when tasks expire, such as queued requests with timeouts | Dependencies between jobs (DAG workflows) or several machines |
| Large `d`: keep each slot search near `O(1)` by pointing every filled slot at the slot before it (disjoint-set union), giving `O(n log n + n · α(d))` | Soft deadlines with continuous penalties (use tardiness DP) |
