---
title: "Longest Increasing Subsequence"
topic: "dynamic-programming"
order: 4
difficulty: "intermediate"
timeComplexity: "O(n log n)"
spaceComplexity: "O(n)"
tags: ["dynamic-programming", "subsequence", "binary-search", "lis"]
---

## Complexity

| Case | Time | Space | Why? |
|------|------|-------|------|
| Best | `O(n)` | `O(1)` | All values equal (or decreasing): `tails` stays one long, so every search is `O(1)` |
| Average | `O(n log n)` | `O(n)` | One `bisect_left` per value on a sorted `tails` of at most `n` values |
| Worst | `O(n log n)` | `O(n)` | Increasing input makes `tails` grow to `n`; the `dp[i]` version looks back at every earlier value, `O(n²)` |

## When to use

| Great for | Avoid for |
|---|---|
| The longest strictly increasing chain; non-decreasing with `bisect_right` instead | Contiguous runs (longest increasing subarray): a single `O(n)` pass is enough |
| Nested boxes and Russian Doll Envelopes: sort by width, then LIS on the heights | Printing the subsequence straight from `tails`: it holds the best ending per length, not one real run (store parent links) |
| Counting how many LIS there are or weighting values: the `O(n²)` `dp[i] = 1 + max dp[j]` version is easier to extend | Tiny inputs where `O(n²)` `dp[i]` is simpler to write and explain |
