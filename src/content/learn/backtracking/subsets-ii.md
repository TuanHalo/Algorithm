---
title: "Subsets II (Duplicate Pruning)"
topic: "backtracking"
order: 4
difficulty: "intermediate"
timeComplexity: "O(n · 2^n)"
spaceComplexity: "O(n)"
visualizer: "/visualizers/backtracking/subsets-ii.html"
diagram: "/diagrams/backtracking/subsets-ii-flow.html"
tags: ["backtracking", "subsets", "duplicates", "pruning"]
---

## What is duplicate pruning in subsets?

If your tray holds `[1, 2, 2]`, picking the first `2` and skipping the second produces `[1, 2]`, and skipping the first `2` to pick the second produces `[1, 2]` again. You still want `[1, 2, 2]` in the output, so you cannot throw away duplicate values upfront.

Subsets II returns every distinct subset from an array that may contain repeated numbers without building duplicate subtrees or hashing every result.

## Core idea

Sort `nums` so equal values sit next to each other, record `path.copy()` at every call, and skip `nums[i]` when `i > start` and `nums[i] == nums[i - 1]`.

## Python code

```python
def subsets_with_dup(nums: list[int]) -> list[list[int]]:
    nums.sort()
    result: list[list[int]] = []
    path: list[int] = []

    def backtrack(start: int) -> None:
        result.append(path.copy())
        for i in range(start, len(nums)):
            # Skip same-depth repeats while keeping deeper picks (i == start)
            if i > start and nums[i] == nums[i - 1]:
                continue
            path.append(nums[i])
            backtrack(i + 1)
            path.pop()

    backtrack(0)
    return result
```

## Complexity

| Case | Time | Space | Why? |
|---|---|---|---|
| Best (all values identical) | `O(n^2)` | `O(n)` | Only `n + 1` unique subsets exist and same-depth repeats are skipped right away |
| Worst (all distinct) | `O(n · 2^n)` | `O(n)` | Every subset is distinct, generating `2^n` copies of length up to `n` |

## When to use

| Great for | Avoid for |
|---|---|
| Generating unique subsets or combinations from inputs with repeated values | Inputs guaranteed to have unique elements (skip sorting overhead) |
| Avoiding `set(tuple(...))` post-filtering that wastes time on twin branches | Problems where duplicate elements represent distinct labeled items |
