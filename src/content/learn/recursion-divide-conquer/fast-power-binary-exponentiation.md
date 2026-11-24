---
title: "Fast Powering & Binary Exponentiation"
topic: "recursion-divide-conquer"
order: 5
difficulty: "intermediate"
timeComplexity: "O(log n)"
spaceComplexity: "O(1) iterative / O(log n) recursive"
tags: ["divide-and-conquer", "binary-exponentiation", "math", "fast-power", "modular-arithmetic"]
---

## Complexity

| Case | Time | Space | Why? |
|------|------|-------|------|
| Best (`exp = 0`) | `O(1)` | `O(1)` | The base case returns 1 on the first call |
| Average | `O(log exp)` | `O(log exp)` | The exponent halves every call, so about `log₂ exp` calls with 1 or 2 multiplications each; one frame per call |
| Worst (all bits set) | `O(log exp)` | `O(log exp)` | Every level is odd, so 2 multiplications per call: at most `2·log₂ exp` in total |

## When to use

| Great for | Avoid for |
|---|---|
| Huge integer powers `a^b mod M` in cryptography and number theory (the iterative form with `% mod` after every multiplication keeps numbers small and uses `O(1)` space) | Tiny exponents (`b ≤ 3`) where `a * a * a` beats any call overhead |
| Matrix exponentiation, e.g. the n-th Fibonacci number in `O(k³ log n)` | Floating-point bases, where repeated squaring amplifies rounding drift |
| Modular inverses with Fermat's little theorem (`a^(M−2) mod M`) | Fractional or irrational exponents (use logarithms or series) |
