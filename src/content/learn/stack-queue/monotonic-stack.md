---
title: "Monotonic Stack"
topic: "stack-queue"
order: 6
difficulty: "intermediate"
timeComplexity: "O(n)"
spaceComplexity: "O(n)"
tags: ["stack-queue", "monotonic-stack", "next-greater", "amortized"]
---

## Complexity

| Case | Time | Space | Why? |
|------|------|-------|------|
| Best (strictly decreasing) | `O(n)` | `O(n)` | No value ever pops another; every index is pushed once and waits to the end |
| Average | `O(n)` | `O(n)` | The inner `while` can pop several times, but each index is pushed once and popped at most once |
| Worst (strictly increasing) | `O(n)` | `O(n)` | Each newcomer pops exactly the one before it: at most `2n` stack operations in total |

## When to use

| Great for | Avoid for |
|---|---|
| Next Greater / Next Smaller Element, Daily Temperatures (store `idx − waiting_idx` instead of the value), Stock Span | The overall maximum or minimum (one running variable, `O(1)` space) |
| Largest Rectangle in Histogram and Trapping Rain Water (pop to find each bar’s nearest smaller / taller neighbour) | The k-th largest value rather than the nearest bigger one (use a heap) |
| Any “look left or right until bigger” inner scan that would make the code `O(n²)` | Relationships that don’t depend on left-to-right order |
