---
title: "Linear Search"
topic: "searching"
order: 1
difficulty: "beginner"
timeComplexity: "O(n)"
spaceComplexity: "O(1)"
tags: ["searching", "sequential", "unsorted", "in-place"]
---

## Complexity

| Case | Time | Space | Why? |
|------|------|-------|------|
| Best (first item) | `O(1)` | `O(1)` | Target sits at index `0`, so we stop after 1 comparison |
| Average | `O(n)` | `O(1)` | On average we inspect about half the list (`n / 2` items) |
| Worst (last or missing) | `O(n)` | `O(1)` | Must scan every element before confirming or returning `-1` |

## When to use

| Great for | Avoid for |
|---|---|
| Unsorted lists where sorting first isn't worth the `O(n log n)` cost | Large, frequently queried sorted datasets (use Binary Search instead) |
| Small arrays or one-off lookups (`n` is tiny) | Real-time lookups across millions of records (use a hash map or index) |
| Linked lists or streams without random index access | |
