---
title: "Sieve of Eratosthenes & Prime Factorization"
topic: "math-number-theory"
order: 2
difficulty: "intermediate"
timeComplexity: "O(n log log n)"
spaceComplexity: "O(n)"
tags: ["math", "number-theory", "primes", "sieve", "factorization", "spf"]
---

## Complexity

| Case | Time | Space | Why? |
|------|------|-------|------|
| Best (n below 2) | `O(1)` | `O(1)` | The guard returns an empty list before any flag is made |
| Average | `O(n log log n)` | `O(n)` | A prime `p` crosses out about `n / p` cells, and the sum of `1 / p` over primes grows like `log log n` |
| Worst | `O(n log log n)` | `O(n)` | The work does not depend on the values, only on `n`; one flag per number is stored |

## When to use

| Great for | Avoid for |
|---|---|
| Listing every prime up to `n ≈ 10⁷`, or answering many primality queries with an array lookup | Testing one huge number (above about `10¹²`): use Miller-Rabin |
| Bulk factorization: store the smallest prime factor of each number instead of a flag (SPF sieve), then factor any `x ≤ n` in `O(log x)` | Tight memory (`n = 10⁹` needs about 1 GB): use a bitset or a segmented sieve |
| Divisor counts and Euler's totient for every number up to `n` | A range `[L, R]` with huge `L` and small `R − L`: use a segmented sieve |
