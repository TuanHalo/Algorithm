---
title: "Kadane's Algorithm (Maximum Subarray)"
topic: "arrays-two-pointers"
order: 7
difficulty: "intermediate"
timeComplexity: "O(n)"
spaceComplexity: "O(1)"
tags: ["arrays", "dynamic-programming", "greedy", "maximum-subarray", "kadane"]
---

## Intuition & Analogy

Imagine playing an arcade game where every step either grants you points or fines you tickets.
You want to identify a single uninterrupted winning streak that nets you the highest overall score.
If your running total ever drops below zero, continuing that streak is an active liability—carrying negative baggage into the next round will only drag down future earnings. The smartest strategy is to instantly "cut your losses", reset your running streak to 0, and start fresh from the next positive opportunity.

That simple insight is the core of **Kadane's Algorithm**.

## Core Concept

Given an array of numbers containing both positive and negative values, find the contiguous subarray with the largest sum.

### The Recurrence
Let `current_sum` be the maximum subarray sum ending at the current index $i$:
$$\text{current\_sum} = \max(\text{arr}[i],\, \text{current\_sum} + \text{arr}[i])$$

At each index, you make a local decision:
1. **Extend** the existing subarray by adding `arr[i]`.
2. **Restart** a brand-new subarray starting at `arr[i]` (whenever `current_sum` before adding was negative).

The global answer is simply the maximum `current_sum` observed across all indices:
$$\text{max\_sum} = \max_{0 \le i < n}(\text{current\_sum}_i)$$

## Step-by-Step Walkthrough

Consider `nums = [-2, 1, -3, 4, -1, 2, 1, -5, 4]`:

| Step $i$ | Element `nums[i]` | Choice: `nums[i]` vs `current_sum + nums[i]` | `current_sum` | `max_sum` |
|---|---|---|---|---|
| Init | — | — | -2 | -2 |
| 1 | 1 | $\max(1, -2 + 1 = -1) \implies 1$ (Restart) | 1 | 1 |
| 2 | -3 | $\max(-3, 1 + -3 = -2) \implies -2$ (Extend) | -2 | 1 |
| 3 | 4 | $\max(4, -2 + 4 = 2) \implies 4$ (Restart) | 4 | 4 |
| 4 | -1 | $\max(-1, 4 + -1 = 3) \implies 3$ (Extend) | 3 | 4 |
| 5 | 2 | $\max(2, 3 + 2 = 5) \implies 5$ (Extend) | 5 | 5 |
| 6 | 1 | $\max(1, 5 + 1 = 6) \implies 6$ (Extend) | 6 | 6 |
| 7 | -5 | $\max(-5, 6 + -5 = 1) \implies 1$ (Extend) | 1 | 6 |
| 8 | 4 | $\max(4, 1 + 4 = 5) \implies 5$ (Extend) | 5 | 6 |

Maximum subarray sum is **6** (corresponding to subarray `[4, -1, 2, 1]`).

## Python Code

```python
def max_sub_array(nums: list[int]) -> int:
    """Finds maximum subarray sum using Kadane's algorithm in O(n) time and O(1) space."""
    if not nums:
        return 0

    current_sum = nums[0]
    max_sum = nums[0]

    for x in nums[1:]:
        # Decide whether to extend existing streak or restart at x
        current_sum = max(x, current_sum + x)
        if current_sum > max_sum:
            max_sum = current_sum

    return max_sum


def max_sub_array_with_indices(nums: list[int]) -> tuple[int, int, int]:
    """Returns (max_sum, start_index, end_index) of the maximum subarray."""
    max_sum = nums[0]
    current_sum = nums[0]

    best_start = best_end = temp_start = 0

    for i in range(1, len(nums)):
        if nums[i] > current_sum + nums[i]:
            current_sum = nums[i]
            temp_start = i
        else:
            current_sum += nums[i]

        if current_sum > max_sum:
            max_sum = current_sum
            best_start = temp_start
            best_end = i

    return max_sum, best_start, best_end
```

## Complexity Table

| Approach | Time Complexity | Space Complexity | Why? |
|---|---|---|---|
| Brute Force (All Subarrays) | $O(n^2)$ | $O(1)$ | Tests every start and end pair |
| Divide and Conquer | $O(n \log n)$ | $O(\log n)$ | Split array into halves, combine crossing sum |
| Kadane's Algorithm | $O(n)$ | $O(1)$ | Single pass with two scalar variables |

## When to Use and Avoid

| When to Use | When to Avoid |
|---|---|
| Finding contiguous subarray with maximum sum in an array with mixed positive/negative values | When negative numbers are absent (if all elements are $\ge 0$, the maximum subarray is trivially the whole array) |
| Circular subarray maximum sum (combine Kadane on normal array with total sum minus inverted Kadane) | Non-contiguous subsequences (maximum subsequence sum is solved by simply picking all positive numbers) |
| Max product subarray (requires tracking both min and max running products due to double negatives) | Multi-dimensional grids without converting 2D rows into 1D Kadane reductions |
