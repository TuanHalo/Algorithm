---
title: "Essential Bit Hacks & Properties"
topic: "bit-manipulation"
order: 2
difficulty: "beginner"
timeComplexity: "O(1) per hack"
spaceComplexity: "O(1)"
tags: ["bit-manipulation", "bit-hacks", "twos-complement", "kernighan", "power-of-two", "popcount"]
---

## Complexity

| Case | Time | Space | Why? |
|------|------|-------|------|
| Best | `O(1)` | `O(1)` | `n = 0` (or a single set bit) ends the loop at once |
| Average | `O(k)` | `O(1)` | One turn per set bit `k`, each a subtraction, an AND and an add |
| Worst | `O(w)` | `O(1)` | All `w` bits set (`w = 32` or 64): one turn per column, still two numbers of memory |

## When to use

| Great for | Avoid for |
|---|---|
| Counting set bits when few are set (popcount, Hamming weight and distance, parity) | Fixed-width words when your language has a popcount instruction (`int.bit_count()` in Python 3.10+) |
| Power of two check: `n > 0 and n & (n - 1) == 0` | Negative numbers in Python: they have endless 1s on the left, so mask to a width first |
| Related one-liners: lowest set bit `n & -n` (Fenwick tree steps `i += i & -i`); set, clear, toggle and test bit `k` with `n \| 1 << k`, `n & ~(1 << k)`, `n ^ 1 << k`, `n >> k & 1` | Code where a plain loop or `bin(n).count("1")` reads better and speed does not matter |
