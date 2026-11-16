---
title: "Permutations"
topic: "backtracking"
order: 2
difficulty: "beginner"
timeComplexity: "O(n · n!)"
spaceComplexity: "O(n)"
visualizer: "/visualizers/backtracking/permutations.html"
diagram: "/diagrams/backtracking/permutations-flow.html"
tags: ["backtracking", "permutations", "recursion", "ordering"]
---

## What is a permutation search?

Think of seating three friends in three numbered chairs. Once someone sits in chair 1, only the remaining two people can take chair 2, and whoever is left takes chair 3.

Permutations list every possible ordering of a collection of distinct items, so `[1, 2]` and `[2, 1]` count as separate results.

## Core idea

Loop over all elements at each recursion depth, skip any index where `used[i]` is `True`, mark `used[i] = True` while recursing, and reset both `path` and `used[i]` on return.

## Python code

```python
def permute(nums: list[int]) -> list[list[int]]:
    result: list[list[int]] = []
    used = [False] * len(nums)
    path: list[int] = []

    def backtrack() -> None:
        if len(path) == len(nums):
            result.append(path.copy())
            return
        for i, val in enumerate(nums):
            if used[i]:
                continue
            used[i] = True
            path.append(val)
            backtrack()
            path.pop()
            used[i] = False

    backtrack()
    return result
```

## Complexity

| Case | Time | Space | Why? |
|---|---|---|---|
| Best / Average / Worst | `O(n · n!)` | `O(n)` | Produces `n!` complete orderings and spends `O(n)` copying each leaf; recursion depth and `used` take `O(n)` |

## When to use

| Great for | Avoid for |
|---|---|
| Generating all arrangements when element order changes the answer | Inputs larger than `n = 10` (`10! = 3,628,800` leaves) |
| Scheduling or routing problems on small sets of tasks or stops | Problems that only need unordered groups (use subsets or combinations instead) |
