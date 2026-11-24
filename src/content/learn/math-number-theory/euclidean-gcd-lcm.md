---
title: "Euclidean GCD & Extended Euclidean Algorithm"
topic: "math-number-theory"
order: 1
difficulty: "beginner"
timeComplexity: "O(log(min(a, b)))"
spaceComplexity: "O(1)"
tags: ["math", "number-theory", "gcd", "lcm", "euclidean", "bezout"]
---

## Complexity

| Case | Time | Space | Why? |
|------|------|-------|------|
| Best (`b = 0`) | `O(1)` | `O(1)` | The loop never runs and `a` is returned |
| Average | `O(log(min(a, b)))` | `O(1)` | The pair at least halves every two turns |
| Worst (consecutive Fibonacci numbers) | `O(log(min(a, b)))` | `O(1)` | Every quotient is 1, so the numbers shrink as slowly as possible (Lamé's theorem) |

## When to use

| Great for | Avoid for |
|---|---|
| Simplifying fractions and finding common periods | Testing primality (use a sieve or Miller-Rabin) |
| LCM: `a // gcd(a, b) * b` (divide first to avoid overflow in fixed-width languages) | Negative inputs without taking `abs()` first |
| Extended Euclid (`a·x + b·y = gcd`): modular inverses for any coprime modulus and linear Diophantine equations | Gaussian elimination and other large linear systems |
