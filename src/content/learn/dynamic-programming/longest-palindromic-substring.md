---
title: "Longest Palindromic Substring (Interval DP)"
topic: "dynamic-programming"
order: 9
difficulty: "advanced"
timeComplexity: "O(n²)"
spaceComplexity: "O(n²)"
visualizer: "/visualizers/dynamic-programming/longest-palindromic-substring.html"
diagram: "/diagrams/dynamic-programming/longest-palindromic-substring-flow.html"
tags: ["dynamic-programming", "interval-dp", "palindrome", "string-dp"]
---

## What is Interval DP?

A word is a palindrome only if its first and last letters match **and** everything tucked inside them is already a palindrome. Interval DP checks every span `[left, right]` from shortest to longest so the inner span `[left + 1, right - 1]` is always ready before we ask about it.

Filling the table diagonal by diagonal (length `1 → n`) unlocks broader interval problems like Burst Balloons and Matrix Chain Multiplication.

## Core idea

Loop `length` from `1` to `n`, marking `dp[left][right] = True` whenever `s[left] == s[right]` and either `length <= 2` or `dp[left + 1][right - 1]` is `True`.

## Python code

```python
def longest_palindrome(s: str) -> str:
    n = len(s)
    dp = [[False] * n for _ in range(n)]
    best = (0, 0)
    for length in range(1, n + 1):  # Short spans must finish before longer ones
        for left in range(n - length + 1):
            right = left + length - 1
            if s[left] == s[right] and (length <= 2 or dp[left + 1][right - 1]):
                dp[left][right] = True
                best = (left, right)
    return s[best[0] : best[1] + 1]
```

## Complexity

| Approach | Time | Space | Why? |
|---|---|---|---|
| Interval DP (`dp[l][r]`) | `O(n²)` | `O(n²)` | Checks all `n(n + 1)/2` intervals `[l, r]` once |
| Expand around center | `O(n²)` | `O(1)` | Checks each center outward without storing an `n × n` boolean grid |

## When to use

| Great for | Avoid for |
|---|---|
| Interval problems where `[l, r]` depends on `[l + 1, r - 1]` or splitting `[l, k]` + `[k + 1, r]` | Tight memory budgets on palindromes only (expand-around-center uses `O(1)` space) |
| Answering many `O(1)` "is `s[l..r]` a palindrome?" queries after preprocessing | Massive strings (`n > 10⁵`) needing linear-time Manacher's algorithm |
