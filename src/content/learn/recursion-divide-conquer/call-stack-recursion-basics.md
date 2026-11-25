---
title: "Call Stack & Recursion Basics"
topic: "recursion-divide-conquer"
order: 1
difficulty: "beginner"
timeComplexity: "O(n)"
spaceComplexity: "O(n) call stack frames"
tags: ["recursion", "call-stack", "stack-overflow", "base-case", "frames"]
---

## Complexity

| Case | Time | Space | Why? |
|------|------|-------|------|
| Best (`n ≤ 1`) | `O(1)` | `O(1)` | The base case returns on the first call, so the stack never grows |
| Average | `O(n)` | `O(n)` | `n` calls, each doing one multiplication; `n` frames are on the stack at the deepest point |
| Worst (`n > 1000`) | `O(n)` | `O(n)` | Same cost, but Python stops with a `RecursionError` at about 1,000 frames |

## When to use

| Great for | Avoid for |
|---|---|
| Naturally nested data: trees, graphs, nested JSON, directory trees | Flat loops (counting, scanning an array) where iteration is cleaner and needs `O(1)` space |
| Divide-and-conquer algorithms (merge sort, quick sort, binary search) | Depths beyond about 1,000 in Python (rewrite as a loop or use an explicit stack) |
| Backtracking searches: N-Queens, Sudoku, permutations | Subproblems that repeat exponentially without memoization (Fibonacci: use dynamic programming) |
