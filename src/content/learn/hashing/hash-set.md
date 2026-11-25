---
title: "Hash Set"
topic: "hashing"
order: 3
difficulty: "beginner"
timeComplexity: "O(1)"
spaceComplexity: "O(n)"
tags: ["hashing", "hash-set", "deduplication", "membership"]
---

## Complexity

| Case | Time | Space | Why? |
|------|------|-------|------|
| Best | `O(1)` | `O(1)` extra | The bucket is empty, so `add` and `contains` finish at once |
| Average | `O(1)` | `O(n)` | One `%` finds the bucket, and its list stays short |
| Worst | `O(n)` | `O(n)` | All `n` values hash into the same bucket and every check scans them |

## When to use

| Great for | Avoid for |
|---|---|
| Removing duplicates or checking `"have I seen this before?"` in `O(1)` | Counting how many times each item shows up (use a Hash Map instead) |
| Remembering visited nodes in graph search or cycle checks | Looking up items by position like `arr[i]` |
| Finding common or missing items between two lists (deleting a value is the same walk, then `bucket.remove(key)`) | Keeping elements in sorted order |
