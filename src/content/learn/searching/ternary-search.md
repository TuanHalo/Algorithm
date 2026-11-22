---
title: "Ternary Search"
topic: "searching"
order: 7
difficulty: "intermediate"
timeComplexity: "O(log₃ n)"
spaceComplexity: "O(1)"
verified: "2026-11-22"
tags: ["searching", "divide-and-conquer", "sorted", "three-way"]
---

## Complexity

| Case | Time | Space | Why? |
|------|------|-------|------|
| Best (`mid1` or `mid2`) | `O(1)` | `O(1)` | First pass hits either the 1/3 or 2/3 divider immediately |
| Average | `O(log₃ n)` | `O(1)` | Drops `2/3` of the array per loop, doing ~`2 · log₃ n ≈ 1.26 · log₂ n` checks |
| Worst (missing or leaf) | `O(log₃ n)` | `O(1)` | Shrinks to a 1-element window after `⌊log₃ n⌋ + 1` iterations |

## When to use

| Great for | Avoid for |
|---|---|
| Finding the maximum or minimum of a unimodal curve (goes up then down) | Plain sorted array lookups (Binary Search uses ~20% fewer comparisons!) |
| Expensive single-variable convex/concave optimization problems | Unsorted lists where comparing against dividers proves nothing |
| | Tiny arrays where simpler linear or binary loops win |
