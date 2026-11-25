---
title: "Longest Palindromic Substring (Interval DP)"
topic: "dynamic-programming"
order: 9
difficulty: "advanced"
timeComplexity: "O(n²)"
spaceComplexity: "O(n²)"
tags: ["dynamic-programming", "interval-dp", "palindrome", "string-dp"]
---

## Complexity

| Case | Time | Space | Why? |
|------|------|-------|------|
| Best | `O(n²)` | `O(n²)` | Every span is still checked, even when no letter repeats |
| Average | `O(n²)` | `O(n²)` | `n(n + 1)/2` spans, one comparison and one table read each |
| Worst | `O(n²)` | `O(n²)` | Same table; expanding around each centre needs only `O(1)` space, testing every substring directly is `O(n³)` |

## When to use

| Great for | Avoid for |
|---|---|
| Interval DP, where `[left, right]` depends on shorter spans inside it: Palindromic Substrings (count the `True` cells), Longest Palindromic Subsequence, Burst Balloons, Matrix Chain Multiplication | Only the longest palindrome under tight memory: expand around each of the `2n − 1` centres, `O(n²)` time and `O(1)` space |
| Many “is `s[l..r]` a palindrome?” questions after one `O(n²)` pass, as in Palindrome Partitioning | Very long strings (`n > 10⁵`): Manacher’s algorithm is `O(n)` |
