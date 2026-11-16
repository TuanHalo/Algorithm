---
title: "Longest Increasing Subsequence"
topic: "dynamic-programming"
order: 4
difficulty: "intermediate"
timeComplexity: "O(n log n)"
spaceComplexity: "O(n)"
visualizer: "/visualizers/dynamic-programming/longest-increasing-subsequence.html"
diagram: "/diagrams/dynamic-programming/longest-increasing-subsequence-flow.html"
tags: ["dynamic-programming", "subsequence", "binary-search", "lis"]
---

## What is Longest Increasing Subsequence?

Imagine stacking numbered cards into piles from left to right where each card must sit on a strictly larger pile or start a new one. Keeping the smallest possible top card on every pile leaves more room for future cards.

LIS finds the length of the longest subsequence whose elements strictly increase, either by checking all earlier indices in `O(n²)` or maintaining a sorted `tails` array in `O(n log n)`.

## Core idea

Keep `tails[k]` as the smallest ending value of any increasing subsequence of length `k + 1`, and binary-search where each new number fits (`bisect_left`).

## Python code

```python
from bisect import bisect_left


def length_of_lis(nums: list[int]) -> int:
    tails: list[int] = []
    for num in nums:
        idx = bisect_left(tails, num)
        if idx == len(tails):
            tails.append(num)
        else:
            tails[idx] = num  # Lower tail keeps same length, widens future options
    return len(tails)
```

## Complexity

| Approach | Time | Space | Why? |
|---|---|---|---|
| `O(n²)` Subsequence DP | `O(n²)` | `O(n)` | Checks every earlier `j < i` to compute `dp[i]` |
| Patience Binary Search | `O(n log n)` | `O(n)` | Performs one `bisect_left` over `tails` per element |

## When to use

| Great for | Avoid for |
|---|---|
| Finding the longest strictly increasing chain (or non-decreasing via `bisect_right`) | Contiguous subarrays, which only need a simple `O(n)` single pass |
| 2D box/envelope stacking after sorting by width | Directly printing the sequence from `tails` without storing parent links |
