---
title: "Hash Functions & Load Factor"
topic: "hashing"
order: 1
difficulty: "beginner"
timeComplexity: "O(k)"
spaceComplexity: "O(m)"
tags: ["hashing", "hash-function", "load-factor", "fundamentals"]
---

## Complexity

| Case | Time | Space | Why? |
|------|------|-------|------|
| Best (one digit) | `O(1)` | `O(1)` | A single multiply, add and `% capacity` |
| Average | `O(k)` | `O(1)` | One mixing step per digit of a `k`-digit key; only `total` is stored |
| Worst (resize) | `O(n + m)` | `O(m)` | A resize builds a `2x` array and re-hashes all `n` keys |

## When to use

| Great for | Avoid for |
|---|---|
| Turning IDs and text into fast array positions (strings hash the same way, one character at a time with `ord(ch)`) | Passwords or security checks (use `hashlib.sha256`, not modulo math) |
| Keeping hash tables fast by resizing before `n / m` passes `0.75` | Range searches like "all scores between 10 and 50", because hashing scrambles order |
| Spreading keys evenly across buckets | Lists or dicts as keys, since keys must not change after insertion |
