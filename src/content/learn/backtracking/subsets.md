---
title: "Subsets (Power Set)"
topic: "backtracking"
order: 1
difficulty: "beginner"
timeComplexity: "O(n · 2^n)"
spaceComplexity: "O(n)"
visualizer: "/visualizers/backtracking/subsets.html"
diagram: "/diagrams/backtracking/subsets-flow.html"
tags: ["backtracking", "subsets", "power-set", "recursion"]
---

## What is a subsets search?

Suppose you are packing a bag and look at each item on your bed once: either drop it in the bag or leave it out. Checking every possible bag comes down to making that same two-way choice for each item.

Generating subsets (the power set) returns every possible combination of elements from a distinct list, including the empty list and the full list.

## Core idea

At each index `idx`, append `nums[idx]` to `path`, recurse to `idx + 1`, pop `nums[idx]` back off to undo the choice, and recurse to `idx + 1` without it.

## Python code

```python
def subsets(nums: list[int]) -> list[list[int]]:
    result: list[list[int]] = []
    path: list[int] = []

    def backtrack(idx: int) -> None:
        if idx == len(nums):
            # Copy path because later pop() calls mutate it in place
            result.append(path.copy())
            return
        path.append(nums[idx])
        backtrack(idx + 1)
        path.pop()
        backtrack(idx + 1)

    backtrack(0)
    return result
```

## Complexity

| Case | Time | Space | Why? |
|---|---|---|---|
| Best / Average / Worst | `O(n · 2^n)` | `O(n)` | Explores `2^n` leaves and copies up to `n` items per subset; call stack and `path` reach depth `n` |

## When to use

| Great for | Avoid for |
|---|---|
| Listing all combinations of any size from small distinct inputs (`n <= 20`) | Large arrays (`n > 25`), where `2^n` outputs exceed time and memory limits |
| Learning the choose, explore, unchoose pattern shared by recursive solvers | Inputs with duplicate numbers unless you sort and skip repeated branches |
