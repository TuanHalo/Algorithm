---
title: "Fibonacci (Memo vs. Tabulation)"
topic: "dynamic-programming"
order: 2
difficulty: "beginner"
timeComplexity: "O(n)"
spaceComplexity: "O(1)"
tags: ["dynamic-programming", "memoization", "tabulation", "1d-dp"]
---

## Complexity

| Case | Time | Space | Why? |
|------|------|-------|------|
| Best | `O(1)` | `O(1)` | `n` is 0 or 1: line 3 returns it with no loop |
| Average | `O(n)` | `O(1)` | One addition per value from F(2) to F(n), holding only the last two |
| Worst | `O(n)` | `O(1)` | Never more than `n − 1` additions; plain recursion makes about `2·F(n)` calls (`O(2ⁿ)`), a memo dictionary needs `O(n)` space |

## When to use

| Great for | Avoid for |
|---|---|
| Any recurrence that only looks a fixed number of steps back: Climbing Stairs, Tribonacci, House Robber (`max(prev1, prev2 + x)`) | Huge `n` (`> 10⁷`) or `F(n) mod m`: matrix exponentiation or fast doubling runs in `O(log n)` |
| Top-down memoization (`@cache` on the recursive version) when only a few of the states are ever reached, or the order is hard to plan | Problems whose subproblems never repeat: plain divide and conquer already does each one once |
| Learning to shrink a table: keep a full `dp` list when you need to read old values back, roll two variables when you don’t | Needing every F(i) afterwards: keep the whole list instead of rolling two variables |
