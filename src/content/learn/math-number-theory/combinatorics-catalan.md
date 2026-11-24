---
title: "Combinatorics & Catalan Numbers"
topic: "math-number-theory"
order: 4
difficulty: "advanced"
timeComplexity: "O(n²)"
spaceComplexity: "O(n)"
tags: ["math", "combinatorics", "catalan-numbers", "n-choose-k", "permutations", "dyck-paths"]
---

## Complexity

| Case | Time | Space | Why? |
|------|------|-------|------|
| Best (`n = 0`) | `O(1)` | `O(1)` | The loop is empty and the table is `[1]` |
| Average | `O(n²)` | `O(n)` | Cell `i` adds `i` products, `n(n+1)/2` in all; one list of `n + 1` counts |
| Worst | `O(n²)` | `O(n)` | The work depends only on `n`, not on the values |

## When to use

| Great for | Avoid for |
|---|---|
| Counting balanced brackets, binary tree shapes, polygon triangulations, monotone grid paths under the diagonal and non-crossing handshakes (Unique Binary Search Trees, Generate Parentheses) | Listing the objects themselves: there are about `4ⁿ / (n^1.5 √π)` of them |
| Every `C₀ … Cₙ` at once for modest `n` (about 5000) | One huge `Cₙ` modulo a prime: use `C(2n, n) / (n + 1)` with factorial and inverse-factorial tables (`O(n)` setup, `O(1)` per query; the inverse comes from Fermat's little theorem) |
| Spotting the split-on-the-first-element pattern in interval and tree DP | A non-prime modulus, where those inverses fail: use prime factorization or Lucas' theorem |
