---
title: "Essential Bit Hacks & Properties"
topic: "bit-manipulation"
order: 2
difficulty: "beginner"
timeComplexity: "O(1) per hack"
spaceComplexity: "O(1)"
tags: ["bit-manipulation", "bit-hacks", "twos-complement", "kernighan", "power-of-two", "popcount"]
---

## Intuition & Analogy

Imagine a high-security lock with 32 pins.
Instead of resetting all 32 pins one by one, a locksmith uses a master tension wrench that can flick pin #7 up without touching any other pin, or a magnetic sweep that drops only the lowest raised pin in a single click.

These surgical operations are **Bit Hacks**: clever one-line algebraic identities that manipulate specific bits in $O(1)$ time and zero loops.

## Core Concept

The most famous bit hacks rely on how subtraction interacts with binary representation:
When you compute $x - 1$, the lowest set bit (`1`) flips to `0`, and all lower trailing zeroes flip to `1`s (e.g., $12 = 1100_2 \implies 12 - 1 = 11 = 1011_2$).

### The Canonical Bit Hacks Arsenal

1. **Test $k$-th Bit**: `(x >> k) & 1`
2. **Set $k$-th Bit**: `x | (1 << k)`
3. **Clear $k$-th Bit**: `x & ~(1 << k)`
4. **Toggle $k$-th Bit**: `x ^ (1 << k)`
5. **Clear Lowest Set Bit**: `x & (x - 1)`
   - Strips the rightmost `1` bit from $x$.
6. **Isolate Lowest Set Bit**: `x & -x`
   - Due to two's complement $-x = \sim x + 1$, `x & -x` leaves only the single rightmost set bit intact.
7. **Check Power of Two**: `x > 0 and (x & (x - 1)) == 0`
   - Powers of two ($1, 2, 4, 8, 16\dots$) have exactly one `1` bit in binary. Clearing that single bit leaves 0!

## Step-by-Step Walkthrough

### Example 1: Isolating the Lowest Set Bit of $12$ (`x & -x`)
- $12 = 00001100_2$
- $-12 = \sim(00001100_2) + 1 = 11110011_2 + 1 = 11110100_2$
- Bitwise AND:
  ```
    0 0 0 0 1 1 0 0  (12)
  & 1 1 1 1 0 1 0 0  (-12)
  -----------------
    0 0 0 0 0 1 0 0  (4 = 2^2)
  ```
  The lowest set bit is isolated at value 4! This identity is the foundational engine of the **Fenwick Tree (Binary Indexed Tree)**.

### Example 2: Brian Kernighan’s Bit Count (`popcount`)
Count number of set bits in $x = 13$ ($1101_2$):
- Step 1: `x = 13 & 12 = 12` ($1100_2$). Count = 1.
- Step 2: `x = 12 & 11 = 8` ($1000_2$). Count = 2.
- Step 3: `x = 8 & 7 = 0` ($0000_2$). Count = 3.
Loops exactly 3 times (the number of set bits) rather than 32 times!

## Python Code

```python
def is_power_of_two(n: int) -> bool:
    """Returns True if n is a positive power of two in O(1) time."""
    return n > 0 and (n & (n - 1)) == 0


def count_set_bits_kernighan(n: int) -> int:
    """Counts number of 1-bits in O(k) time where k is number of set bits."""
    count = 0
    while n > 0:
        n &= n - 1  # Drops the lowest set bit
        count += 1
    return count


def lowest_set_bit(n: int) -> int:
    """Returns value of lowest set bit (e.g., 12 -> 4)."""
    return n & -n


def set_bit(n: int, k: int) -> int:
    return n | (1 << k)


def clear_bit(n: int, k: int) -> int:
    return n & ~(1 << k)


def toggle_bit(n: int, k: int) -> int:
    return n ^ (1 << k)


def test_bit(n: int, k: int) -> bool:
    return bool((n >> k) & 1)
```

## Complexity Table

| Operation | Time Complexity | Auxiliary Space | Comparison with Naive Loop |
|---|---|---|---|
| Power of Two Check | $O(1)$ | $O(1)$ | $O(1)$ vs $O(\log n)$ repeated divisions |
| Isolate Lowest Bit (`x & -x`) | $O(1)$ | $O(1)$ | Instant instruction vs scanning bit shifts |
| Brian Kernighan Count | $O(k)$ where $k \le 32$ | $O(1)$ | Bounded by set bits, not total word width |
| Set / Clear / Toggle $k$-th bit | $O(1)$ | $O(1)$ | Single CPU arithmetic cycle |

## When to Use and Avoid

| When to Use | When to Avoid |
|---|---|
| Fenwick Tree (Binary Indexed Tree) index navigation using `i += (i & -i)` and `i -= (i & -i)` | When bit manipulation reduces code clarity for team members unfamiliar with binary tricks |
| Checking power of two buffer sizes in memory allocators and hash table tables | Arbitrary precision negative integers where Python's unlimited bits require masking with `0xFFFFFFFF` |
| Fast counting of active game permissions or set member flags | Non-integer types (strings, floats) |
