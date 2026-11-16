---
title: "Partition Equal Subset Sum"
platform: "leetcode"
problemUrl: "https://leetcode.com/problems/partition-equal-subset-sum/"
difficulty: "medium"
topics: ["dynamic-programming", "array"]
dateCompleted: "2026-11-16"
timeComplexity: "O(n · S)"
spaceComplexity: "O(S)"
diagram: "/diagrams/dynamic-programming/partition-equal-subset-sum-flow.html"
approaches:
  - name: "0/1 Knapsack DP (1D Space-Optimized)"
    timeComplexity: "O(n · S)"
    spaceComplexity: "O(S)"
    isOptimal: true
    summary: "Reduce to subset sum targeting total // 2; update boolean DP array in reverse."
    tags:
      - label: "0/1 Knapsack"
        topic: "dynamic-programming"
        slug: "01-knapsack"
---

## Problem

Given an integer array `nums`, return `true` *if you can partition the array into two subsets such that the sum of the elements in both subsets is equal or* `false` *otherwise*.

### Example 1
```
Input: nums = [1,5,11,5]
Output: true
Explanation: The array can be partitioned as [1, 5, 5] and [11].
```

### Example 2
```
Input: nums = [1,2,3,5]
Output: false
Explanation: The array cannot be partitioned into equal sum subsets.
```

## My approach

1. **Mathematical reduction**:
   - Let `total = sum(nums)`.
   - If `total` is odd, it is impossible to divide into two equal integer halves, so immediately return `False`.
   - If `total` is even, the problem reduces to finding whether any subset of `nums` sums to `target = total // 2` (the standard 0/1 Knapsack decision problem).
2. **Dynamic programming formulation**:
   - Define boolean array `dp[s]`: `True` if a subset with sum `s` can be formed using a subset of numbers processed so far.
   - Base case: `dp[0] = True` (empty subset sums to 0).
3. **Space optimization (1D array)**:
   - For each number `num` in `nums`:
     - Iterate `s` backwards from `target` down to `num`:
       $$dp[s] = dp[s] \lor dp[s - num]$$
     - Iterating backwards ensures each `num` is used at most once per subset (preventing unbounded reuse of the same element).

## My solution

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
        if dp[target]:
            return True

    return dp[target]
```

## AI feedback

### Strengths
- Early parity check (`total % 2 == 1`) dismisses half of all arbitrary inputs in $O(n)$ time without allocating the DP array.
- 1D reverse sweep cuts space complexity from $O(n \cdot S)$ to $O(S)$ where $S = \text{total} // 2$.
- Early-exit check `if dp[target]: return True` terminates as soon as the target sum is reachable.

### Improvements
- **Bitset optimization**: In languages like C++ (`std::bitset`) or Python integers (where bitwise operations act as arbitrary-precision bitsets), the transition can be computed in $O(1)$ CPU operations: `bits |= bits << num`.
- If $\max(\text{nums}) > \text{target}$, return `False` immediately.

### Edge cases
- `len(nums) < 2`: Cannot form two non-empty subsets, though loop handles naturally.
- Single large element `nums = [100, 1, 2, 3]`: `100 > target`, so `dp[target]` remains `False`.

### Alternative approaches
- **Bitwise DP**: `bits = 1; for num in nums: bits |= bits << num; return bool((bits >> target) & 1)`. Extremely fast in Python due to C-level big-integer arithmetic.
- **Backtracking / Meet-in-the-Middle**: When $S$ is very large but $n \le 40$, split the array into two halves of size $n/2$ and use binary search.
