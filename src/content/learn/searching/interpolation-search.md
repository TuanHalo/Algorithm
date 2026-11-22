---
title: "Interpolation Search"
topic: "searching"
order: 5
difficulty: "intermediate"
timeComplexity: "O(log log n)"
spaceComplexity: "O(1)"
verified: "2026-11-22"
tags: ["searching", "probing", "uniform-data", "sorted"]
---

## Complexity

| Case | Time | Space | Why? |
|------|------|-------|------|
| Best (accurate first probe) | `O(1)` | `O(1)` | Uniform values let the first linear estimate land right on the target |
| Average (uniform data) | `O(log log n)` | `O(1)` | Each probe shrinks the window size from `n` to roughly `√n` |
| Worst (exponentially skewed) | `O(n)` | `O(1)` | Outliers skew the estimate, shrinking the window by only 1 item per step |

## When to use

| Great for | Avoid for |
|---|---|
| Large, sorted arrays with evenly spaced numeric values (timestamps, IDs, sensor logs), cutting ~20 binary-search probes on millions of keys down to a few | Skewed or clustered distributions (exponential growth degrades to `O(n)`) |
| Datasets where disk or memory probes are expensive and uniform spacing holds | Non-numeric data without an easy distance/interpolation metric |
| | Small arrays (`n < 64`) where Binary Search has simpler arithmetic |
