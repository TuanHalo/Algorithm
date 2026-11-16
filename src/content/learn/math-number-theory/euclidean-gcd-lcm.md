---
title: "Euclidean GCD & Extended Euclidean Algorithm"
topic: "math-number-theory"
order: 1
difficulty: "beginner"
timeComplexity: "O(log(min(a, b)))"
spaceComplexity: "O(1)"
tags: ["math", "number-theory", "gcd", "lcm", "euclidean", "bezout"]
---

## Intuition & Analogy

Imagine tiling a rectangular bathroom floor of size $48 \times 18$ meters using only identical square ceramic tiles, with zero cuts or overlaps.
What is the largest possible square tile you can buy?
You lay down two $18 \times 18$ tiles, which cover a $36 \times 18$ area, leaving an uncovered strip of $12 \times 18$.
Any tile that perfectly tiles the whole room must also perfectly tile this leftover $12 \times 18$ strip!
Now lay a $12 \times 12$ tile inside that strip, leaving a leftover of $6 \times 12$.
Next, two $6 \times 6$ tiles fit into the $6 \times 12$ strip with **zero leftover**.
The largest square tile is **$6 \times 6$** meters. That number is the **Greatest Common Divisor (GCD)**.

## Core Concept

### 1. The Euclidean Algorithm
The Euclidean algorithm relies on the theorem:
$$\gcd(a, b) = \gcd(b, a \bmod b) \quad \text{with base case } \gcd(a, 0) = a$$
Because the remainder $a \bmod b < b$, at least one parameter shrinks by more than half every two iterations. By **Lamé's Theorem**, the algorithm terminates in at most $5 \log_{10}(\min(a, b))$ steps—virtually instantaneous even for 100-digit numbers!

### 2. Least Common Multiple (LCM)
The smallest positive integer divisible by both $a$ and $b$ satisfies:
$$\operatorname{lcm}(a, b) = \frac{|a \times b|}{\gcd(a, b)}$$
To prevent integer overflow in languages with fixed-width integers, compute `(a // gcd(a, b)) * b`.

### 3. Extended Euclidean Algorithm (Bézout's Identity)
For any non-zero integers $a$ and $b$, there exist integers $x$ and $y$ such that:
$$a \cdot x + b \cdot y = \gcd(a, b)$$
The Extended Euclidean algorithm computes not only $\gcd(a, b)$ but also the coefficients $x$ and $y$, which is the foundation for solving linear Diophantine equations and finding modular multiplicative inverses.

## Step-by-Step Walkthrough

Compute $\gcd(48, 18)$:

1. $48 = 18 \times 2 + 12 \implies \gcd(48, 18) = \gcd(18, 12)$
2. $18 = 12 \times 1 + 6 \implies \gcd(18, 12) = \gcd(12, 6)$
3. $12 = 6 \times 2 + 0 \implies \gcd(12, 6) = \gcd(6, 0)$
4. Remainder is 0 $\implies$ Return **6**!

## Python Code

```python
def gcd(a: int, b: int) -> int:
    """Calculates Greatest Common Divisor in O(log(min(a, b))) time."""
    while b != 0:
        a, b = b, a % b
    return abs(a)


def lcm(a: int, b: int) -> int:
    """Calculates Least Common Multiple using GCD."""
    if a == 0 or b == 0:
        return 0
    return abs(a // gcd(a, b) * b)


def extended_gcd(a: int, b: int) -> tuple[int, int, int]:
    """Computes (gcd, x, y) such that a*x + b*y = gcd(a, b)."""
    if b == 0:
        return a, 1, 0

    gcd_val, x1, y1 = extended_gcd(b, a % b)
    # Update x and y using results of recursive call
    x = y1
    y = x1 - (a // b) * y1

    return gcd_val, x, y
```

## Complexity Table

| Algorithm | Time Complexity | Space Complexity | Worst-Case Inputs |
|---|---|---|---|
| Euclidean GCD | $O(\log(\min(a, b)))$ | $O(1)$ | Consecutive Fibonacci numbers $F_k, F_{k-1}$ |
| LCM | $O(\log(\min(a, b)))$ | $O(1)$ | Same as GCD |
| Extended GCD | $O(\log(\min(a, b)))$ | $O(\log(\min(a, b)))$ stack | Same as GCD |

## When to Use and Avoid

| When to Use | When to Avoid |
|---|---|
| Simplifying fractions to lowest terms | Testing prime numbers (use Miller-Rabin or Sieve of Eratosthenes) |
| Finding modular multiplicative inverses ($a \cdot x \equiv 1 \pmod m$) | Large systems of linear equations (use Gaussian Elimination) |
| Determining periodic collision alignments in simulation games | Non-integer real numbers or vectors |
