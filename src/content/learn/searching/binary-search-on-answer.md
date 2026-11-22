---
title: "Binary Search on Answer (Parametric Search)"
topic: "searching"
order: 8
difficulty: "advanced"
timeComplexity: "O(log(range) · f(n))"
spaceComplexity: "O(1)"
verified: "2026-11-22"
tags: ["searching", "binary-search", "parametric-search", "optimization", "monotonicity"]
---

## Complexity

| Case | Time | Space | Why? |
|---|---|---|---|
| Range $\text{sum} - \max$ | `O(n · log(Σw - max(w)))` | `O(1)` | Binary search performs $O(\log(\text{range}))$ iterations, each scanning $n$ elements |
| Generalized | `O(f(n) · log(R))` | `O(1)` | $R$ is candidate answer space $[low, high]$; $f(n)$ is validation predicate cost |

## When to use

| Great for | Avoid for |
|---|---|
| "Minimize the maximum" or "Maximize the minimum" problem statements | Problems where the validation function is non-monotonic |
| Allocating resources, budget thresholds, or dividing contiguous segments | Direct closed-form algebraic solutions (e.g. constant-time formulas) |
| Hard optimization problems where checking an answer is much easier than finding it directly (e.g., Koko Eating Bananas, Split Array Largest Sum, Aggressive Cows) | Small discrete datasets where a simple hash table or prefix sum already answers in $O(1)$ |
