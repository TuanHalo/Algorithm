---
title: "House Robber"
platform: "leetcode"
problemUrl: "https://leetcode.com/problems/house-robber/"
difficulty: "medium"
topics: ["dynamic-programming", "array"]
dateCompleted: "2026-11-16"
timeComplexity: "O(n)"
spaceComplexity: "O(1)"
diagram: "/diagrams/dynamic-programming/house-robber-flow.html"
approaches:
  - name: "1D DP with Space Optimization"
    timeComplexity: "O(n)"
    spaceComplexity: "O(1)"
    isOptimal: true
    summary: "Maintain two variables for the best loot up to i-2 and i-1, updating at each house."
    tags:
      - label: "Dynamic Programming"
        topic: "dynamic-programming"
        slug: "climbing-stairs"
  - name: "Bottom-Up DP Array"
    timeComplexity: "O(n)"
    spaceComplexity: "O(n)"
    isOptimal: false
    summary: "Standard 1D table where dp[i] = max(dp[i-1], dp[i-2] + nums[i])."
    tags:
      - label: "Dynamic Programming"
        topic: "dynamic-programming"
---

## Problem

You are a professional robber planning to rob houses along a street. Each house has a certain amount of money stashed, the only constraint stopping you from robbing each of them is that adjacent houses have security systems connected and **it will automatically contact the police if two adjacent houses were broken into on the same night**.

Given an integer array `nums` representing the amount of money of each house, return *the maximum amount of money you can rob tonight **without alerting the police***.

### Example 1
```
Input: nums = [1,2,3,1]
Output: 4
Explanation: Rob house 1 (money = 1) and then rob house 3 (money = 3).
Total amount you can rob = 1 + 3 = 4.
```

### Example 2
```
Input: nums = [2,7,9,3,1]
Output: 12
Explanation: Rob house 1 (money = 2), rob house 3 (money = 9) and rob house 5 (money = 1).
Total amount you can rob = 2 + 9 + 1 = 12.
```

## My approach

At each house `i`, we have two mutually exclusive choices:
1. **Rob house `i`**: We gain `nums[i]`, but cannot rob house `i - 1`. Our total is `nums[i] + dp[i - 2]`.
2. **Skip house `i`**: Our total is the maximum loot achievable up to house `i - 1`, which is `dp[i - 1]`.

The recurrence relation is:
$$dp[i] = \max(dp[i - 1], dp[i - 2] + nums[i])$$

Notice that computing $dp[i]$ only depends on the previous two values: $dp[i - 1]$ and $dp[i - 2]$. Thus, we can replace the full $O(n)$ array with two rolling variables: `prev1` (best up to house $i - 1$) and `prev2` (best up to house $i - 2$).

## My solution

```python
def rob(nums: list[int]) -> int:
    prev2, prev1 = 0, 0  # Best loot up to i-2 and i-1

    for val in nums:
        prev2, prev1 = prev1, max(prev1, prev2 + val)

    return prev1
```

## AI feedback

### Strengths
- Compressing the state space from $O(n)$ to $O(1)$ memory eliminates list allocations entirely.
- Clean tuple unpacking (`prev2, prev1 = prev1, max(prev1, prev2 + val)`) eliminates temporary variables.
- Works seamlessly for empty arrays or single-element inputs without extra edge case branching.

### Improvements
- For problems like House Robber II (houses arranged in a circle), running this algorithm twice (`nums[:-1]` and `nums[1:]`) yields the maximum.
- For House Robber III (houses arranged in a binary tree), post-order traversal with a pair `(rob_root, skip_root)` generalizes this logic.

### Edge cases
- `nums` is empty: Returns `0`.
- Single house `[5]`: Returns `5`.
- Two houses `[2, 3]`: Returns `max(2, 3) = 3`.

### Alternative approaches
- **Memoized Recursion (Top-Down)**: Define `solve(i)` as `max(solve(i-1), solve(i-2) + nums[i])` cached with `@functools.cache`. $O(n)$ time and $O(n)$ call stack depth.
- **Tabulation (Bottom-Up)**: Explicit `dp` array of size $n$.
