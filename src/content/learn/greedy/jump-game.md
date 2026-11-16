---
title: "Jump Game (Farthest Reach)"
topic: "greedy"
order: 6
difficulty: "intermediate"
timeComplexity: "O(n)"
spaceComplexity: "O(1)"
visualizer: "/visualizers/greedy/jump-game.html"
diagram: "/diagrams/greedy/jump-game-flow.html"
tags: ["greedy", "array", "reachability", "invariant"]
---

## What is jump game?

Picture stepping stones across a stream where a number painted on each stone tells you the farthest leap forward you can make from there. You do not need to trace every possible sequence of hops; you only need to check whether your maximum reachable stone ever hits the far bank.

Jump game checks whether you can reach the last index of an array starting from index `0`, where `nums[i]` is your maximum jump length from position `i`.

## Core idea

Scan from left to right while maintaining `farthest`, the highest index reachable so far; if the current index ever passes `farthest`, return `False`, and otherwise update `farthest = max(farthest, idx + jump)`.

## Python code

```python
def can_jump(nums: list[int]) -> bool:
    farthest = 0
    goal = len(nums) - 1

    for idx, jump in enumerate(nums):
        if idx > farthest:
            return False  # Current stone is beyond any earlier reach
        farthest = max(farthest, idx + jump)
        if farthest >= goal:
            return True

    return True
```

## Complexity

| Case | Time | Space | Why? |
|---|---|---|---|
| Best (early exit or blocked at `0`) | `O(1)`–`O(k)` | `O(1)` | Stops as soon as `farthest >= goal` or `idx > farthest` |
| Worst | `O(n)` | `O(1)` | Visits each index at most once using two integer variables |

## When to use

| Great for | Avoid for |
|---|---|
| Reachability across contiguous ranges where every intermediate index up to `idx + jump` is valid | Counting minimum jumps when edge weights or jump costs vary arbitrarily (use BFS or DP) |
| Replacing an `O(n²)` DP table or BFS graph with a single `O(n)` scan | Graphs with backward or non-contiguous jumps where reachability does not form a prefix |
