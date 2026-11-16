---
title: "Fibonacci (Memo vs. Tabulation)"
topic: "dynamic-programming"
order: 2
difficulty: "beginner"
timeComplexity: "O(n)"
spaceComplexity: "O(1)"
visualizer: "/visualizers/dynamic-programming/fibonacci-dp.html"
diagram: "/diagrams/dynamic-programming/fibonacci-dp-flow.html"
tags: ["dynamic-programming", "memoization", "tabulation", "1d-dp"]
---

## What is Fibonacci DP?

Imagine solving a math riddle where someone keeps asking you what `5 + 8` equals every two minutes. Instead of counting on your fingers every time, you jot `13` on a sticky note and read it back instantly.

Plain recursive Fibonacci repeats the same subproblems exponentially (`O(2ⁿ)`), while Dynamic Programming saves each `F(i)` once—either top-down in a cache (memoization) or bottom-up in a loop (tabulation).

## Core idea

Compute each `F(i)` only once by caching recursive answers (`memo[n]`) or rolling two variables (`prev2, prev1 = prev1, prev2 + prev1`) from `2` up to `n`.

## Python code

```python
def fib_dp(n: int) -> int:
    if n <= 1:
        return n
    prev2, prev1 = 0, 1  # Only last two values are needed to roll forward
    for _ in range(2, n + 1):
        prev2, prev1 = prev1, prev2 + prev1
    return prev1
```

## Complexity

| Approach | Time | Space | Why? |
|---|---|---|---|
| Naive recursion | `O(2ⁿ)` | `O(n)` | Recomputes the same `F(k)` branches exponentially many times |
| Top-down memoization | `O(n)` | `O(n)` | Each state `0..n` computes once; recursion stack + `memo` store `n` entries |
| Bottom-up rolling vars | `O(n)` | `O(1)` | Single loop keeps only `prev2` and `prev1` in memory |

## When to use

| Great for | Avoid for |
|---|---|
| Spotting overlapping subproblems and choosing memoization vs. tabulation | Huge indices (`n > 10⁷`) where matrix exponentiation runs in `O(log n)` |
| Teaching how state compression shrinks an `O(n)` table down to `O(1)` | Problems whose subproblems never overlap (plain divide-and-conquer works) |
