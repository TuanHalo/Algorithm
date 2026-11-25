---
title: "Floyd's Cycle Detection"
topic: "linked-list"
order: 5
difficulty: "intermediate"
timeComplexity: "O(n)"
spaceComplexity: "O(1)"
tags: ["linked-list", "cycle-detection", "floyd", "two-pointers"]
---

## Complexity

| Case | Time | Space | Why? |
|------|------|-------|------|
| Best (empty or one node) | `O(1)` | `O(1)` | The guard fails at once |
| Average | `O(n)` | `O(1)` | No loop: `fast` hits the end in `n / 2` turns. Loop: they meet within one lap |
| Worst | `O(n)` | `O(1)` | Phase 2 adds `a` steps; no `seen` set |

## When to use

| Great for | Avoid for |
|---|---|
| Detecting a cycle and finding where it starts with `O(1)` extra memory | General graphs, where a node has several outgoing edges (use DFS with a `visited` set) |
| Any "follow a function until it repeats" problem: Happy Number, Find the Duplicate Number | Small inputs where a `seen` set is simpler and memory doesn’t matter |
| Guarding against infinite loops before walking an untrusted chain of pointers | Breaking the cycle in place: phase 2 finds the entry, not the tail (track the node before `slow` too) |
