---
title: "Master Theorem & Recurrence Relations"
topic: "recursion-divide-conquer"
order: 4
difficulty: "intermediate"
timeComplexity: "O(1) evaluation"
spaceComplexity: "O(1)"
tags: ["math", "complexity", "master-theorem", "recurrence", "asymptotics", "divide-and-conquer"]
---

## Complexity

| Case | Time | Space | Why? |
|------|------|-------|------|
| `c < log_b a` (leaves win) | `Θ(n^(log_b a))` | `O(1)` to evaluate | The `n^(log_b a)` leaves cost more than the root's `n^c`: Strassen (`a=7, b=2, c=2`) gives `Θ(n^2.81)` |
| `c = log_b a` (every level equal) | `Θ(n^c · log n)` | `O(1)` to evaluate | Each of the `log n` levels does the same work: merge sort (`a=2, b=2, c=1`) gives `Θ(n log n)` |
| `c > log_b a` (root wins) | `Θ(n^c)` | `O(1)` to evaluate | Each level costs less than the one above, so the root's combine decides it |

## When to use

| Great for | Avoid for |
|---|---|
| Recurrences `T(n) = a·T(n/b) + n^c` with equal-sized subproblems: merge sort, binary search, Karatsuba, Strassen | Unequal splits such as `T(n) = T(n/3) + T(2n/3) + n` (use the recursion tree or the Akra-Bazzi method) |
| Quick complexity proofs in interviews and when checking a new divide-and-conquer design | Decrement-by-one recurrences like `T(n) = T(n − 1) + 1` (sum the series instead) |
| Seeing at a glance whether splitting, combining or the leaves dominate | A combine cost that is not a polynomial `n^c`, such as `2^n` (it breaks the theorem's gap condition) |
