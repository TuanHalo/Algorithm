---
title: "What is Dynamic Programming? Foundations & Principles"
topic: "dynamic-programming"
order: 1
difficulty: "beginner"
timeComplexity: "Varies by problem"
spaceComplexity: "Varies by problem"
tags: ["dynamic-programming", "memoization", "tabulation", "optimal-substructure", "subproblems"]
---

## Complexity

For the Climbing Stairs table in the story; in general a DP costs (number of states) × (work per state).

| Case | Time | Space | Why? |
|------|------|-------|------|
| Best | `O(1)` | `O(1)` | `n ≤ 2`: line 3 answers without a table |
| Average | `O(n)` | `O(n)` | One addition per step, one table slot per step |
| Worst | `O(n)` | `O(n)` | Never more than one pass; plain recursion is `O(2ⁿ)`, and rolling two variables brings space to `O(1)` |

## When to use

| Great for | Avoid for |
|---|---|
| Problems with **overlapping subproblems** (the same smaller question asked again) and **optimal substructure** (the best answer is built from best smaller answers): counting ways, shortest / cheapest, longest | Subproblems that never overlap, like merge sort’s halves: plain divide and conquer already solves each once |
| Top-down **memoization** (recursion plus a cache, e.g. `@cache`) when only some states are ever reached or the order is hard to plan | Problems where a proven **greedy** choice works (activity selection, Huffman, Dijkstra): one local decision per step is faster than filling a table |
| Bottom-up **tabulation** (a loop over a table) when every state is needed: no recursion depth limit, and old rows can be dropped to save space | Answers that depend on the whole history, not a small state: use backtracking or branch and bound |
