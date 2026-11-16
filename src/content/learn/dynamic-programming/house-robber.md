---
title: "House Robber"
topic: "dynamic-programming"
order: 2
difficulty: "beginner"
timeComplexity: "O(n)"
spaceComplexity: "O(1)"
visualizer: "/visualizers/dynamic-programming/house-robber.html"
diagram: "/diagrams/dynamic-programming/house-robber-flow.html"
tags: ["dynamic-programming", "1d-dp", "choice-dp", "space-optimized"]
---

## What is House Robber?

Picture walking down a street of houses where every home has an alarm wired to both of its immediate neighbors. You can collect cash from any houses you want, as long as you never pick two adjacent houses in a row.

House Robber is the classic 1D "take or skip" DP pattern: at each house, you compare skipping it against taking it plus your best haul from two doors back.

## Core idea

Track the best total two steps back (`prev2`) and one step back (`prev1`), then update `curr = max(prev1, prev2 + val)` at every house.

## Python code

```python
def rob(nums: list[int]) -> int:
    prev2, prev1 = 0, 0  # Best loot up to i-2 and i-1
    for val in nums:
        prev2, prev1 = prev1, max(prev1, prev2 + val)
    return prev1
```

## Complexity

| Case | Time | Space | Why? |
|---|---|---|---|
| Full 1D `dp[]` table | `O(n)` | `O(n)` | Reads each house once and stores one best score per prefix |
| Rolling `prev2, prev1` | `O(n)` | `O(1)` | Only the previous two prefix totals affect the current choice |

## When to use

| Great for | Avoid for |
|---|---|
| Linear sequences where picking index `i` forbids picking `i - 1` (or `i - k`) | Circular streets without running twice (`nums[1:]` vs. `nums[:-1]`) |
| Building intuition for how a 1D `dp[]` array compresses to two variables | Choosing items under a weight budget where `0/1 Knapsack` is needed |
