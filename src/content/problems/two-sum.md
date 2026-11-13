---
title: "Two Sum"
platform: "leetcode"
problemUrl: "https://leetcode.com/problems/two-sum/"
difficulty: "easy"
topics: ["hashing", "array"]
dateCompleted: "2026-11-11"
timeComplexity: "O(n)"
spaceComplexity: "O(n)"
diagram: "/diagrams/problems/two-sum-flow.html"
---

## 🔗 Problem

Given a list of integers `nums` and a `target` sum, return the **indices** of two numbers that add up to `target`. You may assume each input has exactly one solution, and you cannot reuse the same index twice.

## 💡 My Approach

Instead of checking every pair with nested loops, I keep a hash map (`seen`) of numbers I've already visited mapped to their index. At each number `num`, I check if `target - num` is already in `seen` — if yes, I found my pair immediately!

## 🐍 My Solution

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

## 🤖 AI Feedback

### ✅ Strengths
- **Optimal one-pass lookup** — checking `seen` before inserting solves it in a single `O(n)` pass.
- **Self-pairing bug avoided** — storing `seen[num] = idx` *after* the complement check cleanly handles cases like `nums = [3, 3], target = 6` or `nums = [3, 2, 4], target = 6`.
- **Clean Python style** — `enumerate()` and descriptive names (`complement`, `seen`) make the intent crystal clear.

### 🔧 Improvements
- Returning `[]` when no pair is found is a safe fallback, though raising a `ValueError("No two sum solution")` makes unexpected inputs loud during testing.

### 🧪 Edge Cases
- **Duplicate values** (`[3, 3]`, target `6`) → works because `seen[3] = 0` is stored on index `0` and matched at index `1`.
- **Negative numbers or zeros** (`[-3, 4, 3, 90]`, target `0`) → works because hash maps handle any integer keys.

### 🔄 Alternative Approaches
- **Brute Force (`O(n²)` time, `O(1)` space):** Two nested loops checking every pair — simple, uses zero extra memory, but slow for big arrays.
- **Sort + Two Pointers (`O(n log n)` time, `O(n)` space to keep original indices):** Useful when you only need the *values* rather than original indices.

