---
title: "Combinatorics & Catalan Numbers"
topic: "math-number-theory"
order: 4
difficulty: "advanced"
timeComplexity: "O(n) precomputation, O(1) query"
spaceComplexity: "O(n)"
tags: ["math", "combinatorics", "catalan-numbers", "n-choose-k", "permutations", "dyck-paths"]
---

## Intuition & Analogy

Imagine walking across a city grid from coordinate $(0, 0)$ to $(n, n)$, taking only steps East (right) or North (up). There is a diagonal river running along $y = x$. You are strictly forbidden from stepping into the water above the diagonal. How many distinct valid paths can you take?

French mathematician Désiré André devised an ingenious visualization called the **Reflection Principle**:
Every invalid path that touches the forbidden line $y = x + 1$ can be mirrored across that line. This creates a perfect one-to-one correspondence between every illegal path and all paths ending at $(n - 1, n + 1)$.
Subtracting these reflected illegal paths from the total possible paths yields the sequence:
$$1, 1, 2, 5, 14, 42, 132, 429, 1430, \dots$$
These are the famous **Catalan Numbers**, one of the most ubiquitous counting sequences in computer science!

## Core Concept

### 1. The Catalan Closed Form
For any integer $n \ge 0$:
$$C_n = \frac{1}{n + 1} \binom{2n}{n} = \frac{(2n)!}{(n + 1)! \, n!} = \binom{2n}{n} - \binom{2n}{n - 1}$$

### 2. The Catalan Recurrence
Catalan numbers also satisfy the recursive convolution:
$$C_0 = 1, \quad C_{n+1} = \sum_{i=0}^{n} C_i \times C_{n - i}$$
This recursive structure directly explains why Catalan numbers count so many recursive computer science objects!

### 3. Classic Isomorphic Problems Counted by $C_n$
1. **Valid Parentheses**: The number of balanced parentheses strings using $n$ pairs of `(` and `)`.
2. **Binary Trees**: The number of structurally unique binary trees with $n$ internal vertices.
3. **Polygon Triangulation**: The number of ways to cut a convex polygon with $n + 2$ vertices into triangles using non-intersecting diagonals.
4. **Stack Permutations**: The number of permutations of $1 \dots n$ that can be generated using a single stack.
5. **Non-crossing Handshakes**: The number of ways $2n$ people sitting around a circular table can shake hands simultaneously without arms crossing.

## Step-by-Step Walkthrough

Calculate $C_3$ (valid combinations of 3 pairs of parentheses):
1. **Using Formula**:
   $$C_3 = \frac{1}{3 + 1} \binom{6}{3} = \frac{1}{4} \times \frac{6 \times 5 \times 4}{3 \times 2 \times 1} = \frac{20}{4} = \mathbf{5}$$
2. **Enumerate the 5 Valid Parentheses**:
   - `((()))`
   - `(()())`
   - `(())()`
   - `()(())`
   - `()()()`
3. **Using Recurrence**:
   $$C_3 = C_0 C_2 + C_1 C_1 + C_2 C_0$$
   $$= (1 \times 2) + (1 \times 1) + (2 \times 1) = 2 + 1 + 2 = \mathbf{5}$$.
Both methods match perfectly!

## Python Code

```python
class Combinatorics:
    """Precomputes factorials and inverse factorials for O(1) nCr and Catalan queries modulo prime."""

    def __init__(self, max_n: int, mod: int = 1_000_000_007) -> None:
        self.mod = mod
        self.fact = [1] * (max_n + 1)
        self.inv = [1] * (max_n + 1)

        # 1. Precompute factorials
        for i in range(1, max_n + 1):
            self.fact[i] = (self.fact[i - 1] * i) % self.mod

        # 2. Precompute inverse of max factorial using Fermat's Little Theorem
        self.inv[max_n] = pow(self.fact[max_n], self.mod - 2, self.mod)

        # 3. Work backwards to compute all inverse factorials in O(n)
        for i in range(max_n - 1, -1, -1):
            self.inv[i] = (self.inv[i + 1] * (i + 1)) % self.mod

    def n_choose_k(self, n: int, k: int) -> int:
        """Computes nCr % mod in O(1) time."""
        if k < 0 or k > n:
            return 0
        return self.fact[n] * self.inv[k] % self.mod * self.inv[n - k] % self.mod

    def catalan(self, n: int) -> int:
        """Computes the n-th Catalan number modulo mod in O(1) time."""
        # C_n = (2n choose n) / (n + 1)
        comb = self.n_choose_k(2 * n, n)
        n_plus_1_inv = pow(n + 1, self.mod - 2, self.mod)
        return (comb * n_plus_1_inv) % self.mod
```

## Complexity Table

| Operation | Precomputation | Per-Query Time | Space Complexity |
|---|---|---|---|
| Naive Dynamic Programming Recurrence | None | $O(n^2)$ | $O(n)$ |
| Closed-Form Factorial Tables | $O(n)$ time | $O(1)$ query | $O(n)$ memory |
| Single Catalan $C_n$ without table | None | $O(n)$ | $O(1)$ |

## When to Use and Avoid

| When to Use | When to Avoid |
|---|---|
| Counting valid bracketings, monotonic grid paths, or BST topologies | Generating or printing actual sequences (enumeration takes $\Omega(C_n)$ which grows exponentially: $\sim \frac{4^n}{n^{1.5} \sqrt{\pi}}$) |
| Multiple fast $\binom{n}{k}$ queries in competitive programming with prime modulus | Non-prime modulus (cannot use Fermat's Little Theorem for inverse factorials; use Prime Factorization or Lucas' Theorem) |
| Detecting combinatorial isomorphism in grammar parsing and compiler AST generation | Unconstrained permutations where ordering is unrestricted (use simple $n!$) |
