---
title: "Modular Arithmetic & Modular Multiplicative Inverse"
topic: "math-number-theory"
order: 3
difficulty: "intermediate"
timeComplexity: "O(log M)"
spaceComplexity: "O(1)"
tags: ["math", "modular-arithmetic", "fermat-little-theorem", "inverse", "combinatorics"]
---

## Complexity

| Case | Time | Space | Why? |
|------|------|-------|------|
| Best (`b` is a multiple of `M`, or `M = 2`) | `O(1)` | `O(1)` | The guard raises at once, or the exponent `M − 2` is 0 and the loop never runs |
| Average | `O(log M)` | `O(1)` | One turn per bit of `M − 2`, with one or two modular multiplications each |
| Worst (every bit of `M − 2` is 1) | `O(log M)` | `O(1)` | Two multiplications per turn, about `2 · log₂ M` in all |

## When to use

| Great for | Avoid for |
|---|---|
| Dividing under a prime modulus such as `10⁹ + 7`: `a / b` is `a * mod_inverse(b, M) % M`, as in `nCr` and counting problems | A composite modulus: Fermat needs a prime, so use the Extended Euclidean algorithm (works whenever `gcd(b, M) = 1`) |
| Inverses of many numbers `1 … n` at once: `inv[i] = (M - (M // i) * inv[M % i] % M) % M` in `O(n)` | A `b` that shares a factor with `M`: no inverse exists |
| RSA-style and signature arithmetic, and keeping counts inside 64 bits | Subtraction under a modulus without adding `M` first (`(a - b + M) % M` in C++ and Java) |
