---
title: "Modular Arithmetic & Modular Multiplicative Inverse"
topic: "math-number-theory"
order: 3
difficulty: "intermediate"
timeComplexity: "O(log M) per inverse, O(n) precomputation"
spaceComplexity: "O(1) to O(n)"
tags: ["math", "modular-arithmetic", "fermat-little-theorem", "inverse", "combinatorics"]
---

## Intuition & Analogy

Imagine a standard 12-hour circular clock.
If the time is 9:00 and you add 5 hours, the clock reads 2:00, not 14:00 ($14 \bmod 12 = 2$).
Addition, subtraction, and multiplication work smoothly on a clock face. But what does division mean?
If someone asks you: *"What is 2:00 divided by 2?"*, you might answer 1:00, but on a clock, 2:00 is also 14:00, and $14 / 2 = 7:00$. Both 1:00 and 7:00 multiplied by 2 land on 2:00! Standard division breaks down.

To fix this, mathematicians never "divide" in modular arithmetic. Instead, to divide by $B$, we **multiply by its modular inverse** $B^{-1}$, which is the unique number that cancels $B$ back to 1:
$$B \times B^{-1} \equiv 1 \pmod M$$

## Core Concept

### 1. Fundamental Modular Properties
For integers $A, B$ and positive modulus $M$:
- **Addition**: $(A + B) \bmod M = ((A \bmod M) + (B \bmod M)) \bmod M$
- **Subtraction**: $(A - B) \bmod M = ((A \bmod M) - (B \bmod M) + M) \bmod M$
  *(Always add $+ M$ before modulo to avoid negative remainders!)*
- **Multiplication**: $(A \times B) \bmod M = ((A \bmod M) \times (B \bmod M)) \bmod M$

### 2. Division & The Modular Inverse
Division $\frac{A}{B} \bmod M$ is defined as:
$$\frac{A}{B} \equiv A \times B^{-1} \pmod M$$
The inverse $B^{-1}$ exists if and only if $\gcd(B, M) = 1$ (coprime).

### 3. Fermat's Little Theorem (Prime Modulus)
If $M$ is a prime number (such as $10^9 + 7$ or $998244353$):
$$B^{M - 1} \equiv 1 \pmod M \implies B \times B^{M - 2} \equiv 1 \pmod M$$
Therefore, the modular inverse is simply:
$$B^{-1} \equiv B^{M - 2} \pmod M$$
which we calculate in $O(\log M)$ time using Binary Exponentiation!

### 4. Extended Euclidean Algorithm (General Modulus)
When $M$ is not necessarily prime, solve $B \cdot x + M \cdot y = 1$. The coefficient $x \pmod M$ is the modular inverse.

## Step-by-Step Walkthrough

Find the inverse of $3$ modulo $7$ ($M = 7$ is prime):
1. **Fermat's Formula**:
   $3^{-1} \equiv 3^{7 - 2} = 3^5 \pmod 7$.
2. **Compute $3^5 \pmod 7$**:
   - $3^1 = 3$
   - $3^2 = 9 \equiv 2$
   - $3^4 = (3^2)^2 = 2^2 = 4$
   - $3^5 = 3^4 \times 3^1 = 4 \times 3 = 12 \equiv \mathbf{5} \pmod 7$.
3. **Verify**:
   $$3 \times 5 = 15 = 2 \times 7 + 1 \equiv 1 \pmod 7$$
   It works! Dividing by 3 modulo 7 is mathematically identical to multiplying by 5.

## Python Code

```python
def mod_inverse_fermat(b: int, mod: int) -> int:
    """Computes modular inverse b^(-1) % mod for prime mod in O(log mod) time."""
    if b % mod == 0:
        raise ZeroDivisionError(f"Inverse does not exist for {b} modulo {mod}.")
    # pow(b, mod - 2, mod) uses built-in binary exponentiation
    return pow(b, mod - 2, mod)


def mod_divide(a: int, b: int, mod: int) -> int:
    """Computes (a / b) % mod."""
    return (a * mod_inverse_fermat(b, mod)) % mod


def precompute_inverses(n: int, mod: int) -> list[int]:
    """Precomputes all modular inverses from 1 to n modulo prime mod in O(n) total time."""
    inv = [0] * (n + 1)
    inv[1] = 1
    for i in range(2, n + 1):
        inv[i] = (mod - (mod // i) * inv[mod % i] % mod) % mod
    return inv
```

## Complexity Table

| Method | Applicable When | Time Complexity | Space Complexity |
|---|---|---|---|
| Fermat's Little Theorem (`pow(b, M-2, M)`) | Modulus $M$ is strictly prime | $O(\log M)$ | $O(1)$ |
| Extended Euclidean Algorithm | $\gcd(b, M) = 1$ ($M$ can be composite) | $O(\log(\min(b, M)))$ | $O(1)$ |
| Linear Sieve Precomputation | Need all inverses for $1 \dots n$ with prime $M$ | $O(n)$ | $O(n)$ |

## When to Use and Avoid

| When to Use | When to Avoid |
|---|---|
| Computing combinations $\binom{n}{k} = \frac{n!}{k!(n-k)!} \pmod M$ in competitive programming | When modulus $M$ and divisor $B$ share a common factor $> 1$ ($\gcd(B, M) \ne 1$ means no inverse exists!) |
| Cryptographic algorithms like RSA and elliptic curve signatures | Normal floating-point operations where exact mathematical integer division is required |
| Preventing overflow in counting problems under modulo $10^9 + 7$ | Forgetting to add $+ M$ when subtracting modulo values in Python or C++ |
