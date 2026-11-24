---
title: "Manacher's Algorithm (Longest Palindromic Substring)"
topic: "strings"
order: 5
difficulty: "advanced"
timeComplexity: "O(n)"
spaceComplexity: "O(n)"
tags: ["strings", "palindrome", "manacher", "linear-time", "symmetry"]
---

## Complexity

| Case | Time | Space | Why? |
|------|------|-------|------|
| Best (no repeats, e.g. `abcd`) | `O(n)` | `O(n)` | One failed comparison per centre and no mirror to reuse |
| Average | `O(n)` | `O(n)` | Comparisons only happen at or past `r`, and `r` never moves back |
| Worst (all letters equal) | `O(n)` | `O(n)` | At most `n` successful comparisons overall; `t` and `p` hold about `2n` cells each |

## When to use

| Great for | Avoid for |
|---|---|
| Longest palindromic substring when `n ≥ 10⁵`, where `O(n²)` approaches time out (brute force is `O(n³)`, the DP table and expand-around-centre are `O(n²)`) | Short strings (`n ≤ 1000`), where expand-around-centre is shorter to write and fast enough |
| Counting every palindromic substring in linear time: sum the radii `p[i]` (rounded up half) | Palindromic subsequences, where letters may be skipped (Interval DP, `O(n²)`) |
| Any task that needs the palindrome radius at every centre | Data that isn't a string or sequence, such as trees |
