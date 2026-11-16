---
title: "Fast Powering & Binary Exponentiation"
topic: "recursion-divide-conquer"
order: 5
difficulty: "intermediate"
timeComplexity: "O(log n)"
spaceComplexity: "O(1) iterative / O(log n) recursive"
tags: ["divide-and-conquer", "binary-exponentiation", "math", "fast-power", "modular-arithmetic"]
---

## Intuition & Analogy

Imagine building a 64-layer puff pastry dough.
If a baker placed 64 individual dough sheets on top of each other one by one, it would require 64 tedious manual operations.
Instead, a master baker takes one sheet, folds it in half (2 layers), folds it again (4 layers), folds it again (8), then 16, 32, and 64! Just **6 quick folds** produce 64 layers because each step squares the thickness.

**Binary Exponentiation** (also called exponentiation by squaring) calculates $a^n$ in $O(\log n)$ operations rather than doing $n$ naive multiplications.

## Core Concept

The property relies on dividing the exponent $n$ in half at each step:

$$a^n = \begin{cases} 
1 & \text{if } n = 0 \\
\left(a^{\frac{n}{2}}\right)^2 & \text{if } n \text{ is even} \\
a \times a^{n - 1} = a \times \left(a^{\frac{n - 1}{2}}\right)^2 & \text{if } n \text{ is odd}
\end{cases}$$

Because $n$ is halved at every even step (and made even on every odd step), the exponent reaches zero in at most $2 \lfloor \log_2 n \rfloor$ multiplications.

### Modular Exponentiation
In cryptography (RSA, Diffie-Hellman) and competitive programming, numbers like $a^n$ exceed millions of digits. Using the modular multiplication property:
$$(x \times y) \bmod M = ((x \bmod M) \times (y \bmod M)) \bmod M$$
we apply `% mod` after every multiplication, keeping numbers within standard integer registers at zero extra cost.

## Step-by-Step Walkthrough

Compute $3^{13} \pmod{1000}$:
The binary representation of $13$ is $1101_2 = 8 + 4 + 1$.
So $3^{13} = 3^8 \times 3^4 \times 3^1$.

| Step | Current Base $a$ | Exponent bit of 13 | Multiplied into Result? | Current Result |
|---|---|---|---|---|
| Bit 0 | $3^1 = 3$ | 1 (odd) | Yes $\implies 1 \times 3$ | $3$ |
| Bit 1 | $3^2 = 9$ | 0 (even) | No (skip) | $3$ |
| Bit 2 | $3^4 = 81$ | 1 (odd) | Yes $\implies 3 \times 81$ | $243$ |
| Bit 3 | $3^8 = 6561 \equiv 561$ | 1 (odd) | Yes $\implies 243 \times 561 \pmod{1000}$ | $323$ |

Total multiplications: 4 squarings and 3 combines = 7 operations instead of 13.
For an exponent of $10^{18}$, this executes in ~60 operations instead of 1,000,000,000,000,000,000!

## Python Code

```python
def power_recursive(base: int, exp: int) -> int:
    """Calculates base^exp in O(log exp) using recursive divide-and-conquer."""
    if exp < 0:
        raise ValueError("Negative exponents require floating point handling.")
    if exp == 0:
        return 1

    half = power_recursive(base, exp // 2)

    if exp % 2 == 0:
        return half * half
    else:
        return base * half * half


def power_mod_iterative(base: int, exp: int, mod: int) -> int:
    """Calculates (base^exp) % mod in O(log exp) time and O(1) space."""
    if mod == 1:
        return 0

    result = 1
    base = base % mod

    while exp > 0:
        # If exp is odd, multiply base into accumulated result
        if exp & 1:
            result = (result * base) % mod

        # Square the base and halve the exponent
        base = (base * base) % mod
        exp >>= 1

    return result
```

## Complexity Table

| Method | Time Complexity | Auxiliary Space | Handles $n = 10^{18}$? |
|---|---|---|---|
| Naive Loop ($n$ multiplications) | $O(n)$ | $O(1)$ | No (billions of seconds) |
| Recursive Binary Exponentiation | $O(\log n)$ | $O(\log n)$ call stack | Yes ($< 1$ millisecond) |
| Iterative Binary Exponentiation | $O(\log n)$ | $O(1)$ | Yes ($< 1$ millisecond) |

## When to Use and Avoid

| When to Use | When to Avoid |
|---|---|
| Computing large integer powers $a^b \pmod M$ in cryptography and number theory | Extremely small exponents ($b \le 3$) where direct multiplication `a * a * a` avoids loop overhead |
| Matrix exponentiation (e.g. computing the $n$-th Fibonacci number in $O(k^3 \log n)$ time) | Floating-point bases where repeated squarings amplify numerical precision drift |
| Fermat's Little Theorem modular inverse ($a^{M - 2} \pmod M$) | Fractional or irrational exponents (use Taylor series or logarithm identities) |
