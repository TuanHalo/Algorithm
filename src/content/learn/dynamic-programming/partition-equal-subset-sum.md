---
title: "Partition Equal Subset Sum"
topic: "dynamic-programming"
order: 7
difficulty: "intermediate"
timeComplexity: "O(n · S)"
spaceComplexity: "O(S)"
visualizer: "/visualizers/dynamic-programming/partition-equal-subset-sum.html"
diagram: "/diagrams/dynamic-programming/partition-equal-subset-sum-flow.html"
tags: ["dynamic-programming", "subset-sum", "knapsack", "boolean-dp"]
---

## What is Partition Equal Subset Sum?

Suppose you and a friend want to split a pile of snack bags so both halves have the exact same total calories without opening any bag. If the grand total is odd, an equal split is immediately impossible; otherwise, finding any subset that hits half the total solves the whole split.

This problem reduces a two-way partition into a boolean 0/1 Subset Sum check up to `target = sum(nums) // 2`.

## Core idea

Reject odd totals immediately, seed `dp[0] = True`, and sweep `s` backward from `target` down to `num` updating `dp[s] = dp[s] or dp[s - num]`.

## Python code

```python
def can_partition(nums: list[int]) -> bool:
    total = sum(nums)
    if total % 2 == 1:
        return False
    target = total // 2
    dp = [True] + [False] * target
    for num in nums:
        for s in range(target, num - 1, -1):  # Reverse avoids counting num twice
            dp[s] = dp[s] or dp[s - num]
    return dp[target]
```

## Complexity

| Case | Time | Space | Why? |
|---|---|---|---|
| Odd total early exit | `O(n)` | `O(1)` | Computing `sum(nums)` catches odd totals without allocating a table |
| General even total | `O(n · S)` | `O(S)` | Checks up to `S = total // 2` reachable sums for each of the `n` numbers |

## When to use

| Great for | Avoid for |
|---|---|
| Yes/no reachability checks for exact subset sums (`target`, `k`-partition) | Negative numbers in the input without shifting offsets or using a hash set |
| Turning a two-group split into a single `0/1` capacity check | Very large numbers (`S > 10⁷`) where backtracking with pruning or meet-in-the-middle is faster |
