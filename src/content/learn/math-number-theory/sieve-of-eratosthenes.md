---
title: "Sieve of Eratosthenes & Prime Factorization"
topic: "math-number-theory"
order: 2
difficulty: "intermediate"
timeComplexity: "O(n log log n) sieve, O(log x) factorization"
spaceComplexity: "O(n)"
tags: ["math", "number-theory", "primes", "sieve", "factorization", "spf"]
---

## Intuition & Analogy

Imagine a kitchen sifter containing numbered marbles from 2 to 100.
You pull out marble #2 and keep it in your prime collection. Then you activate a magnetic pulse that eliminates all multiples of 2 ($4, 6, 8, \dots$).
The next surviving marble in the sifter is #3. Keep it as prime, and magnetically vaporize all multiples of 3 ($9, 15, 21, \dots$).
The next survivor is #5; keep it and vaporize its multiples ($25, 35, \dots$).
What remains resting in the bowl are exclusively the **prime numbers**.

Instead of testing each number individually with trial division ($O(n \sqrt{n})$), the **Sieve of Eratosthenes** crosses out composite multiples in bulk in near-linear **$O(n \log \log n)$** time.

## Core Concept

### 1. Classical Sieve Mechanics
1. Initialize a boolean array `is_prime` of size $n + 1$, set to `True`. Set indices 0 and 1 to `False`.
2. For each number $p$ from 2 up to $\lfloor\sqrt{n}\rfloor$:
   - If `is_prime[p]` is `True`:
     - Cross out all multiples of $p$ starting from $p^2$ in increments of $p$:
       $$p^2, \, p^2 + p, \, p^2 + 2p, \dots \le n$$
       *(Multiples smaller than $p^2$, like $2p$ or $3p$, were already eliminated by earlier primes like 2 and 3!)*

### 2. Time Complexity Proof: $O(n \log \log n)$
The number of operations is:
$$n \sum_{p \le n} \frac{1}{p}$$
By Mertens' Second Theorem, the sum of reciprocals of primes up to $n$ grows asymptotically as $\ln(\ln n)$. For $n = 10^7$, $\log(\log n) \approx 2.77$—practically linear!

### 3. Smallest Prime Factor (SPF) Array
By storing the **Smallest Prime Factor** for every number rather than just a boolean:
$$\text{SPF}[x] = \text{smallest prime dividing } x$$
we can prime-factorize any query number $x \le n$ in strictly **$O(\log x)$ time** by repeatedly dividing $x$ by $\text{SPF}[x]$.

## Step-by-Step Walkthrough

Find primes up to $n = 16$:
- Numbers: `[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]`
- $p = 2 \le \sqrt{16} = 4$: Mark multiples starting at $2^2 = 4$:
  Eliminate `4, 6, 8, 10, 12, 14, 16`.
- $p = 3 \le 4$: Mark multiples starting at $3^2 = 9$:
  Eliminate `9, 12` (already gone), `15`.
- Outer loop terminates because $4 > \sqrt{16}$.
- Surviving primes: `[2, 3, 5, 7, 11, 13]`.

## Python Code

```python
def sieve_of_eratosthenes(n: int) -> list[int]:
    """Generates all prime numbers up to n in O(n log log n) time."""
    if n < 2:
        return []

    is_prime = [True] * (n + 1)
    is_prime[0] = is_prime[1] = False

    p = 2
    while p * p <= n:
        if is_prime[p]:
            # Start marking multiples from p * p
            for multiple in range(p * p, n + 1, p):
                is_prime[multiple] = False
        p += 1

    return [i for i, prime in enumerate(is_prime) if prime]


def build_spf(n: int) -> list[int]:
    """Computes Smallest Prime Factor (SPF) for all numbers up to n."""
    spf = list(range(n + 1))

    for p in range(2, int(n**0.5) + 1):
        if spf[p] == p:  # p is prime
            for multiple in range(p * p, n + 1, p):
                if spf[multiple] == multiple:
                    spf[multiple] = p

    return spf


def factorize_with_spf(x: int, spf: list[int]) -> list[int]:
    """Returns prime factors of x in O(log x) time using precomputed SPF array."""
    factors: list[int] = []
    while x > 1:
        factors.append(spf[x])
        x //= spf[x]
    return factors
```

## Complexity Table

| Approach | Precomputation | Single Query Primality | Prime Factorization of $x$ |
|---|---|---|---|
| Trial Division | $O(1)$ | $O(\sqrt{x})$ | $O(\sqrt{x})$ |
| Sieve of Eratosthenes | $O(n \log \log n)$ time, $O(n)$ space | $O(1)$ array lookup | $O(\sqrt{x})$ |
| SPF (Smallest Prime Factor) Sieve | $O(n \log \log n)$ | $O(1)$ | $O(\log x)$ |

## When to Use and Avoid

| When to Use | When to Avoid |
|---|---|
| When you need all primes or many primality queries up to $N \le 10^7$ | Testing primality of a single massive number ($N > 10^{12}$ — use the Miller-Rabin test instead) |
| Multiple fast prime factorizations of numbers up to $10^7$ | When memory is severely constrained ($N = 10^9$ requires 1GB RAM) |
| Counting divisors or Euler's Totient function values in bulk | Ranges $[L, R]$ where $L$ is huge but $R - L$ is small (use Segmented Sieve) |
