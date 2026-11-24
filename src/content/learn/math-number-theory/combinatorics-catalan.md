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
| Best (n is 0) | `O(1)` | `O(1)` | Empty loop, table is `[1]` |
| Average | `O(n²)` | `O(n)` | About n²/2 products; one list |
| Worst | `O(n²)` | `O(n)` | Depends only on `n` |

## When to use

| Great for | Avoid for |
|---|---|
| Counting balanced brackets, binary tree shapes, polygon triangulations, monotone grid paths under the diagonal and non-crossing handshakes (Unique Binary Search Trees, Generate Parentheses) | Listing the objects themselves: there are about `4ⁿ / (n^1.5 √π)` of them |
| Every `C₀ … Cₙ` at once for modest `n` (about 5000) | One huge `Cₙ` modulo a prime: use `C(2n, n) / (n + 1)` with factorial and inverse-factorial tables (`O(n)` setup, `O(1)` per query; the inverse comes from Fermat's little theorem) |
| Spotting the split-on-the-first-element pattern in interval and tree DP | A non-prime modulus, where those inverses fail: use prime factorization or Lucas' theorem |
