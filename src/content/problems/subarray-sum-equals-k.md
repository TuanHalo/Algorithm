---
title: "Subarray Sum Equals K"
platform: "leetcode"
problemUrl: "https://leetcode.com/problems/subarray-sum-equals-k/"
difficulty: "medium"
topics: ["hashing", "array", "prefix-sum"]
dateCompleted: "2026-11-16"
timeComplexity: "O(n)"
spaceComplexity: "O(n)"
diagram: "/diagrams/hashing/prefix-sum-hashing-flow.html"
approaches:
  - name: "Prefix Sum + Hash Map"
    timeComplexity: "O(n)"
    spaceComplexity: "O(n)"
    isOptimal: true
    summary: "Store prefix sum frequencies in a hash map to find matching prefix_sum - k in O(1)."
    tags:
      - label: "Prefix Sum"
        topic: "hashing"
        slug: "hash-map"
  - name: "Brute Force"
    timeComplexity: "O(n²)"
    spaceComplexity: "O(1)"
    isOptimal: false
    summary: "Check sum of every subarray using nested loops."
    tags:
      - label: "Array"
---

## Problem

Given an array of integers `nums` and an integer `k`, return *the total number of subarrays whose sum equals to `k`*.

A subarray is a contiguous **non-empty** sequence of elements within an array.

### Example 1
```
Input: nums = [1,1,1], k = 2
Output: 2
Explanation: Subarrays [1,1] at index (0,1) and index (1,2) each sum to 2.
```

### Example 2
```
Input: nums = [1,2,3], k = 3
Output: 2
Explanation: Subarrays [1,2] and [3] each sum to 3.
```

## My approach

1. **Prefix sum principle**:
   - The sum of any subarray `nums[i..j]` can be expressed as:
     $$\text{sum}(i, j) = \text{prefix}[j] - \text{prefix}[i - 1]$$
   - Setting $\text{sum}(i, j) = k$ gives:
     $$\text{prefix}[j] - k = \text{prefix}[i - 1]$$
2. **Hash map frequency tracking**:
   - As we scan from left to right, we maintain `prefix_sum`, the cumulative sum up to the current index $j$.
   - Any previous prefix sum equal to `prefix_sum - k` corresponds to a valid subarray ending at index $j$ whose sum is $k$.
   - Maintain a frequency dictionary `seen` where `seen[s]` is the number of times prefix sum `s` has occurred so far.
3. **Base case `{0: 1}`**:
   - Initialize `seen = {0: 1}` to account for subarrays starting at index 0 where `prefix_sum == k`.

## My solution

```python
def subarray_sum(nums: list[int], k: int) -> int:
    seen: dict[int, int] = {0: 1}  # Empty prefix handles subarrays starting at index 0
    prefix_sum = 0
    count = 0

    for num in nums:
        prefix_sum += num
        need = prefix_sum - k
        if need in seen:
            count += seen[need]
        seen[prefix_sum] = seen.get(prefix_sum, 0) + 1

    return count
```

## AI feedback

### Strengths
- Reduces quadratic $O(n^2)$ subarray search to an optimal single-pass $O(n)$ algorithm.
- Correctly handles negative numbers, zeros, and multiple overlapping subarrays.
- Initializing `{0: 1}` handles the boundary condition without special branches inside the loop.

### Improvements
- `collections.defaultdict(int)` can be used to write `seen[prefix_sum] += 1` more idiomatically in Python.
- Checking `need in seen` before updating `seen[prefix_sum]` prevents counting the current prefix itself unless $k == 0$ and it occurred earlier.

### Edge cases
- Negative numbers (`nums = [1, -1, 0], k = 0`): Prefix sums can increase and decrease, creating multiple matches.
- All zeros (`nums = [0, 0, 0], k = 0`): Correctly counts all 6 subarrays ($1 + 2 + 3$).
- Single element equal to $k$: Immediately matches `seen[0] = 1`.

### Alternative approaches
- **Sliding Window (Two Pointers)**: Only works if all numbers in `nums` are strictly non-negative ($nums[i] \ge 0$). Fails when negative numbers are present because the prefix sum is not monotonic.
- **Brute Force**: Compute sums of all $O(n^2)$ subarrays, taking $O(n^2)$ time and $O(1)$ space.
