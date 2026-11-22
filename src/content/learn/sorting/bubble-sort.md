---
title: "Bubble Sort"
topic: "sorting"
order: 1
difficulty: "beginner"
timeComplexity: "O(n²)"
spaceComplexity: "O(1)"
verified: "2026-11-22"
tags: ["sorting", "comparison", "in-place", "stable"]
---

## Complexity

| Case | Time | Space | Why? |
|------|------|-------|------|
| Best (already sorted) | `O(n)` | `O(1)` | One pass checks every pair, sees zero swaps, stops early |
| Average | `O(n²)` | `O(1)` | Nested loops compare pairs across multiple passes |
| Worst (reversed) | `O(n²)` | `O(1)` | Every single pair has to swap on every pass |

## When to use

| Great for | Avoid for |
|---|---|
| Small arrays (`n ≤ 10,000`, fits within ~10⁸ operations) | Large datasets (`n > 10,000`, becomes very slow) |
| Nearly sorted lists (stops in 1 pass with early exit!) | Real-world software & apps (use built-ins like Python's `sorted()`) |
| Learning and visualizing how sorting works step by step | Time-critical or performance-sensitive systems |
