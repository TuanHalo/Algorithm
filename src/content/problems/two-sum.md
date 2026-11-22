---
title: "Two Sum"
platform: "leetcode"
problemUrl: "https://leetcode.com/problems/two-sum/"
difficulty: "easy"
topics: ["hashing", "array"]
dateCompleted: "2026-11-16"
timeComplexity: "O(n)"
spaceComplexity: "O(n)"
verified: "2026-11-22"
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

## AI feedback

### Strengths
- Checking `seen` before inserting solves the problem in a single $O(n)$ pass.
- Storing `seen[num] = idx` after the complement check avoids pairing an index with itself, which handles cases like `nums = [3, 3], target = 6` and `nums = [3, 2, 4], target = 6`.
- Using `enumerate()` and descriptive names (`complement`, `seen`) keeps the code readable.

### Improvements
- Returning `[]` when no pair is found is a safe fallback, though raising a `ValueError("No two sum solution")` makes unexpected inputs loud during testing.

### Alternative approaches
- **Sort with two pointers** ($O(n \log n)$ time, $O(n)$ space to keep original indices): useful when you only need the values and not the original indices.
