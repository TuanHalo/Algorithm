---
title: "Binary Search Bounds"
topic: "searching"
order: 3
difficulty: "intermediate"
timeComplexity: "O(log n)"
spaceComplexity: "O(1)"
verified: "2026-11-22"
tags: ["searching", "binary-search", "bounds", "duplicates"]
---

## Complexity

| Case | Time | Space | Why? |
|------|------|-------|------|
| Best | `O(log n)` | `O(1)` | Even after a hit, we keep halving until `low > high` to prove no better bound exists |
| Average | `O(log n)` | `O(1)` | Every iteration cuts the remaining search window in half |
| Worst | `O(log n)` | `O(1)` | Runs at most `⌊log₂ n⌋ + 1` iterations regardless of duplicate count |

## When to use

| Great for | Avoid for |
|---|---|
| Counting frequency of a target in a sorted list (`last - first + 1`) | Unsorted arrays (boundaries have no meaning without sorted order) |
| Finding insertion indices or ranges (`bisect_left` / `bisect_right`) | Datasets where any arbitrary matching index is already good enough |
| Problems asking for "minimum valid capacity" or "maximum feasible size" | Tiny arrays (`n < 16`) where a single scan is simpler and equally fast |
