---
title: "Fast & Slow Pointers (Same Direction)"
topic: "arrays-two-pointers"
order: 4
difficulty: "beginner"
timeComplexity: "O(n)"
spaceComplexity: "O(1)"
tags: ["two-pointers", "fast-slow", "floyd", "cycle-detection", "in-place", "read-write"]
---

## Complexity

| Case | Time | Space | Why? |
|------|------|-------|------|
| Best (all equal) | `O(n)` | `O(1)` | `fast` still reads every value once; nothing is written |
| Average | `O(n)` | `O(1)` | One read per value and at most one write per new value |
| Worst (all unique) | `O(n)` | `O(1)` | Every value is new, so `n − 1` reads and `n − 1` writes; two integers of extra memory |

## When to use

| Great for | Avoid for |
|---|---|
| In-place filtering with `O(1)` memory: remove duplicates, remove a value, Move Zeroes (swap non-zeroes forward) | When the original order or values must stay untouched (build a new list instead) |
| Compacting the values you keep at the front while one pass reads everything | Multi-dimensional grids that need rows and columns shifted together |
| Speed-2 / speed-1 pointers for cycles (Floyd’s algorithm, see Linked List → Cycle Detection) | Storage where each read is slow or sequential-only (e.g. tape or disk streams) |
