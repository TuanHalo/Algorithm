---
title: "Tail Recursion & Accumulators"
topic: "recursion-divide-conquer"
order: 2
difficulty: "beginner"
timeComplexity: "O(n)"
spaceComplexity: "O(1) with TCO / iterative loop"
tags: ["recursion", "tail-call", "optimization", "accumulator", "call-stack"]
---

## Complexity

| Case | Time | Space | Why? |
|------|------|-------|------|
| Best (`n ≤ 1`) | `O(1)` | `O(1)` | The base case returns the accumulator on the first call |
| Average | `O(n)` | `O(n)` in CPython, `O(1)` with TCO | `n` calls, one multiplication each; CPython keeps every frame, a TCO runtime reuses one |
| Worst (`n > 1000`) | `O(n)` | `O(n)` in CPython | Python raises `RecursionError` near 1,000 frames; rewrite the tail call as a `while` loop |

## When to use

| Great for | Avoid for |
|---|---|
| Functional languages (Haskell, Erlang, Scheme, Scala) where recursion is the loop and tail calls run in constant space | Python code that may recurse past about 1,000 levels (CPython never optimizes tail calls; use a loop) |
| Running totals, sums and products built on the way down (sum a list, count items, reverse a list with an accumulator) | Branching recursion such as visiting both children of a tree, where only one call can be the tail call |
| State machines where each state tail-calls the next handler | Code that needs the frames afterwards: post-order work, backtracking, readable stack traces |
