---
title: "Master Theorem & Recurrence Relations"
topic: "recursion-divide-conquer"
order: 4
difficulty: "intermediate"
timeComplexity: "O(1) evaluation"
spaceComplexity: "O(1)"
tags: ["math", "complexity", "master-theorem", "recurrence", "asymptotics", "divide-and-conquer"]
---

## Intuition & Analogy

Imagine a multi-tier corporation. At the top, the CEO splits work among $a$ vice-presidents, each handling a department of size $n/b$, while spending $f(n)$ effort coordinating. Each VP does the same down to frontline workers at the bottom leaves.
Who does the bulk of the actual work in the company?
1. **The Frontline Leaves**: If the number of small tasks grows faster than the coordinator's work, the base-level leaves dominate total company time.
2. **Equilibrium**: If every management layer expends the exact same amount of work, the total time is simply the work per layer multiplied by the number of management tiers ($\log n$).
3. **The Executive Root**: If coordinating and combining at the top is overwhelmingly heavier than the work at lower levels, the CEO's top-level work dominates everything.

The **Master Theorem** provides an instant mathematical cookbook to solve divide-and-conquer recurrences by evaluating this exact tug-of-war.

## Core Concept

The Master Theorem applies to recurrences of the canonical form:
$$T(n) = a \, T\left(\frac{n}{b}\right) + f(n)$$
where:
- $a \ge 1$: The number of recursive subproblems spawned.
- $b > 1$: The factor by which the input size is divided.
- $f(n)$: The cost of dividing the problem and combining the partial solutions.

### The Critical Exponent
The total number of leaves in the recursion tree is:
$$\text{Leaves} = a^{\log_b n} = n^{\log_b a}$$
The critical exponent is $c_{\text{crit}} = \log_b a$.
We compare $f(n)$ with $n^{\log_b a}$:

### The Three Cases
Assume $f(n) = \Theta(n^c)$ (or more generally $\Theta(n^c \log^k n)$):

1. **Case 1 (Leaves Dominate, $c < \log_b a$)**:
   The recursive branching outpaces combination work.
   $$T(n) = \Theta\left(n^{\log_b a}\right)$$

2. **Case 2 (Equilibrium, $c = \log_b a$)**:
   Every level of the recursion tree does asymptotically equal work.
   $$T(n) = \Theta\left(n^{\log_b a} \log n\right)$$
   *(More generally, if $f(n) = \Theta(n^{\log_b a} \log^k n)$, then $T(n) = \Theta(n^{\log_b a} \log^{k+1} n)$).*

3. **Case 3 (Root Dominates, $c > \log_b a$)**:
   The divide/combine work at the top dominates (satisfying regularity condition $a f(n/b) \le k f(n)$ for $k < 1$).
   $$T(n) = \Theta\left(f(n)\right)$$

## Step-by-Step Walkthrough

### Example 1: Merge Sort
Recurrence: $T(n) = 2T(n/2) + O(n)$.
- $a = 2$, $b = 2$, $f(n) = O(n^1) \implies c = 1$.
- $\log_b a = \log_2 2 = 1$.
- Since $c = \log_b a$ ($1 == 1$), this is **Case 2**.
- Result: $T(n) = \Theta(n^1 \log n) = \mathbf{\Theta(n \log n)}$.

### Example 2: Binary Search
Recurrence: $T(n) = 1T(n/2) + O(1)$.
- $a = 1$, $b = 2$, $f(n) = O(n^0) \implies c = 0$.
- $\log_b a = \log_2 1 = 0$.
- Since $c = \log_b a$ ($0 == 0$), this is **Case 2**.
- Result: $T(n) = \Theta(n^0 \log n) = \mathbf{\Theta(\log n)}$.

### Example 3: Strassen's Matrix Multiplication
Recurrence: $T(n) = 7T(n/2) + O(n^2)$.
- $a = 7$, $b = 2$, $f(n) = O(n^2) \implies c = 2$.
- $\log_b a = \log_2 7 \approx 2.807$.
- Since $c < \log_b a$ ($2 < 2.807$), this is **Case 1** (Leaves Dominate).
- Result: $T(n) = \mathbf{\Theta(n^{\log_2 7})} \approx \mathbf{\Theta(n^{2.81})}$.

## Python Code

```python
import math


def solve_master_theorem(
    a: float, b: float, c: float, k: float = 0
) -> tuple[int, str]:
    """Solves recurrence T(n) = a * T(n / b) + Theta(n^c * log^k(n)).

    Returns (case_number, asymptotic_bound_latex).
    """
    if a < 1 or b <= 1:
        raise ValueError("Invalid parameters: requires a >= 1 and b > 1.")

    crit = math.log(a, b)
    eps = 1e-9

    if c < crit - eps:
        # Case 1: Leaves dominate
        return 1, f"Theta(n^{crit:.3f})"
    elif abs(c - crit) <= eps:
        # Case 2: Equilibrium
        return 2, f"Theta(n^{c:.3f} * log^{k + 1}(n))"
    else:
        # Case 3: Root dominates
        return 3, f"Theta(n^{c:.3f} * log^{k}(n))"
```

## Complexity Table

| Algorithm | Recurrence | $a, b, f(n)$ | Master Case | Asymptotic Bound |
|---|---|---|---|---|
| Binary Search | $T(n) = T(n/2) + O(1)$ | $a=1, b=2, c=0$ | Case 2 | $\Theta(\log n)$ |
| Merge Sort | $T(n) = 2T(n/2) + O(n)$ | $a=2, b=2, c=1$ | Case 2 | $\Theta(n \log n)$ |
| Karatsuba Mult. | $T(n) = 3T(n/2) + O(n)$ | $a=3, b=2, c=1$ | Case 1 | $\Theta(n^{\log_2 3}) \approx \Theta(n^{1.585})$ |
| Strassen Mult. | $T(n) = 7T(n/2) + O(n^2)$ | $a=7, b=2, c=2$ | Case 1 | $\Theta(n^{\log_2 7}) \approx \Theta(n^{2.807})$ |
| Quadtree Search | $T(n) = 4T(n/2) + O(n^3)$ | $a=4, b=2, c=3$ | Case 3 | $\Theta(n^3)$ |

## When to Use and Avoid

| When to Use | When to Avoid |
|---|---|
| Standard recurrences where subproblems are divided into equal fractional sizes ($n/b$) | Unequal splits, such as $T(n) = T(n/3) + T(2n/3) + O(n)$ (use the Akra-Bazzi method or recursion tree method) |
| Quick complexity proofs for technical interviews and competitive programming | Decrement-by-constant recurrences like $T(n) = T(n - 1) + O(1)$ (use arithmetic series expansion) |
| Verifying scalability limits of newly designed divide-and-conquer algorithms | Non-polynomial $f(n)$ that violates polynomial gap constraints (e.g. $f(n) = 2^n$) |
