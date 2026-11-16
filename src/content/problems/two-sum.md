---
title: "Two Sum"
platform: "leetcode"
problemUrl: "https://leetcode.com/problems/two-sum/"
difficulty: "easy"
topics: ["hashing", "array"]
dateCompleted: "2026-11-16"
timeComplexity: "O(n)"
spaceComplexity: "O(n)"
diagram: "/diagrams/problems/two-sum-flow.html"
approaches:
  - name: "Hash Map (One Pass)"
    timeComplexity: "O(n)"
    spaceComplexity: "O(n)"
    isOptimal: true
    summary: "Store numbers in a hash map as we iterate to check for the complement in constant time."
    tags:
      - label: "Hash Map"
        topic: "hashing"
        slug: "hash-map"
  - name: "Brute Force"
    timeComplexity: "O(n²)"
    spaceComplexity: "O(1)"
    isOptimal: false
    summary: "Check every pair of elements using nested loops."
    tags:
      - label: "Array"
---

## Problem

Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.

You may assume that each input would have **exactly one solution**, and you may not use the same element twice.

You can return the answer in any order.

### Example 1
```
Input: nums = [2,7,11,15], target = 9
Output: [0,1]
Explanation: Because nums[0] + nums[1] == 9, we return [0, 1].
```

## My approach

Instead of checking every pair with nested loops, maintain a hash map (`seen`) of numbers already visited mapped to their index. At each number `num`, check if `target - num` is already in `seen`. If it is, return the pair of indices.

## My solution

```python
def two_sum(nums: list[int], target: int) -> list[int]:
    seen: dict[int, int] = {}
    for idx, num in enumerate(nums):
        complement = target - num
        if complement in seen:
            return [seen[complement], idx]
        # Store after checking so the same index isn't paired with itself
        seen[num] = idx
    return []
```

## AI feedback

### Strengths
- Checking `seen` before inserting solves the problem in a single $O(n)$ pass.
- Storing `seen[num] = idx` after the complement check avoids pairing an index with itself, which handles cases like `nums = [3, 3], target = 6` and `nums = [3, 2, 4], target = 6`.
- Using `enumerate()` and descriptive names (`complement`, `seen`) keeps the code readable.

### Improvements
- Returning `[]` when no pair is found is a safe fallback, though raising a `ValueError("No two sum solution")` makes unexpected inputs loud during testing.

### Edge cases
- Duplicate values (`[3, 3]`, target `6`): works because `seen[3] = 0` is stored at index `0` and matched at index `1`.
- Negative numbers or zeros (`[-3, 4, 3, 90]`, target `0`): works because hash maps accept any integer keys.

### Alternative approaches
- **Brute force** ($O(n^2)$ time, $O(1)$ space): two nested loops check every pair. Simple and uses no extra memory, but slow on large arrays.
- **Sort with two pointers** ($O(n \log n)$ time, $O(n)$ space to keep original indices): useful when you only need the values and not the original indices.
