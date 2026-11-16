---
title: "Combination Sum"
topic: "backtracking"
order: 3
difficulty: "intermediate"
timeComplexity: "O(N^(T/M + 1))"
spaceComplexity: "O(T / M)"
visualizer: "/visualizers/backtracking/combination-sum.html"
diagram: "/diagrams/backtracking/combination-sum-flow.html"
tags: ["backtracking", "combinations", "pruning", "target-sum"]
---

## What is combination sum?

Suppose you are making exact change using unlimited coins of fixed values like `2`, `3`, `6`, and `7` to reach `7`. Order does not matter (`2 + 2 + 3` is the same set of coins as `3 + 2 + 2`), and once your total passes `7`, adding more coins cannot help.

Combination Sum finds every unique multiset of positive candidates that adds up to `target`, allowing each candidate to be picked multiple times.

## Core idea

Sort `candidates`, loop from `start` so earlier choices are never re-picked out of order, break as soon as `candidates[i] > rem`, and pass `i` (instead of `i + 1`) to allow reuse.

## Python code

```python
def combination_sum(candidates: list[int], target: int) -> list[list[int]]:
    candidates.sort()
    result: list[list[int]] = []
    path: list[int] = []

    def backtrack(start: int, rem: int) -> None:
        if rem == 0:
            result.append(path.copy())
            return
        for i in range(start, len(candidates)):
            # Sorted order means all remaining candidates also exceed rem
            if candidates[i] > rem:
                break
            path.append(candidates[i])
            backtrack(i, rem - candidates[i])
            path.pop()

    backtrack(0, target)
    return result
```

## Complexity

| Case | Time | Space | Why? |
|---|---|---|---|
| Best (early pruning) | `O(N log N)` | `O(1)` | Sorting finishes quickly and the first branch breaks right away if all candidates exceed `target` |
| Worst | `O(N^(T/M + 1))` | `O(T / M)` | With `N` candidates and smallest value `M`, tree depth reaches `T / M` |

## When to use

| Great for | Avoid for |
|---|---|
| Finding all combinations that hit an exact sum when you need the actual lists | Counting how many combinations exist without listing them (use 1D DP instead) |
| Showing how sorting turns dead-end checks into an early `break` | Inputs that allow negative numbers or zero, which can loop infinitely |
