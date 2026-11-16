---
title: "Bitwise Operators & Binary Representation"
topic: "bit-manipulation"
order: 1
difficulty: "beginner"
timeComplexity: "O(1)"
spaceComplexity: "O(1)"
tags: ["bit-manipulation", "binary", "bitwise-and", "bitwise-or", "shifts", "twos-complement"]
---

## Intuition & Analogy

Imagine a wall panel containing 8 miniature toggle light switches.
Each switch can only be either **UP** (1 / ON) or **DOWN** (0 / OFF).
Instead of inspecting and flipping switches one at a time with your fingertip, modern CPUs have a mechanical bar that can read, flip, or slide all 8 (or 64) switches at the exact same instant in a single electrical cycle (nanosecond).

Bitwise operations are the lowest-level arithmetic instructions supported by digital circuits. Understanding them unlocks ultra-fast operations and compact data representations.

## Core Concept

All computer data fundamentally consists of bits (binary digits: 0 or 1).

### 1. The Fundamental Truth Tables

| $A$ | $B$ | AND (`A & B`) | OR (`A \| B`) | XOR (`A ^ B`) | NOT (`~A`) |
|---|---|---|---|---|---|
| 0 | 0 | 0 | 0 | 0 | 1 |
| 0 | 1 | 0 | 1 | 1 | 1 |
| 1 | 0 | 0 | 1 | 1 | 0 |
| 1 | 1 | 1 | 1 | 0 | 0 |

- **AND (`&`)**: 1 only if **both** bits are 1 (used for masking and clearing bits).
- **OR (`|`)**: 1 if **at least one** bit is 1 (used for setting bits).
- **XOR (`^`)**: 1 if the bits are **different** (used for toggling and parity checks).
- **NOT (`~`)**: Inverts all bits ($0 \to 1, 1 \to 0$).

### 2. Bit Shifts
- **Left Shift (`x << k`)**: Moves bits $k$ places left, appending zeroes on the right.
  Mathematically equivalent to multiplying by $2^k$:
  $$5 \ll 2 \implies 00000101_2 \ll 2 = 00010100_2 = 20 \quad (5 \times 2^2)$$
- **Right Shift (`x >> k`)**: Moves bits $k$ places right, discarding the low-order bits.
  Mathematically equivalent to floor division by $2^k$:
  $$20 \gg 2 \implies 00010100_2 \gg 2 = 00000101_2 = 5 \quad (\lfloor 20 / 2^2 \rfloor)$$

### 3. Two's Complement (Signed Integers)
In signed 32-bit systems, negative numbers are stored using Two's Complement:
$$-x = \sim x + 1$$
This elegant property means addition and subtraction use the exact same CPU logic gates regardless of sign.

## Step-by-Step Walkthrough

Trace `a = 12` ($1100_2$) and `b = 10` ($1010_2$):

1. **AND (`a & b`)**:
   ```
     1 1 0 0  (12)
   & 1 0 1 0  (10)
   ---------
     1 0 0 0  (8)
   ```
2. **OR (`a | b`)**:
   ```
     1 1 0 0  (12)
   | 1 0 1 0  (10)
   ---------
     1 1 1 0  (14)
   ```
3. **XOR (`a ^ b`)**:
   ```
     1 1 0 0  (12)
   ^ 1 0 1 0  (10)
   ---------
     0 1 1 0  (6)
   ```

## Python Code

```python
def print_binary(n: int, bits: int = 8) -> str:
    """Formats an integer as a fixed-width binary string."""
    if n >= 0:
        return f"{n:0{bits}b}"
    else:
        # Show two's complement for negative integers
        return f"{(1 << bits) + n:0{bits}b}"


def demonstrate_bitwise(a: int, b: int) -> None:
    """Demonstrates all 6 primary bitwise operators."""
    print(f"a      = {a:2d} -> {print_binary(a)}")
    print(f"b      = {b:2d} -> {print_binary(b)}")
    print(f"a & b  = {a & b:2d} -> {print_binary(a & b)} (AND)")
    print(f"a | b  = {a | b:2d} -> {print_binary(a | b)} (OR)")
    print(f"a ^ b  = {a ^ b:2d} -> {print_binary(a ^ b)} (XOR)")
    print(f"~a     = {~a:2d} -> {print_binary(~a)} (NOT: -a - 1)")
    print(f"a << 2 = {a << 2:2d} -> {print_binary(a << 2)} (Left shift: a * 4)")
    print(f"a >> 1 = {a >> 1:2d} -> {print_binary(a >> 1)} (Right shift: a // 2)")
```

## Complexity Table

| Operator | CPU Cycles | Time Complexity | Space Complexity |
|---|---|---|---|
| `&` (AND) | 1 cycle | $O(1)$ | $O(1)$ |
| `\|` (OR) | 1 cycle | $O(1)$ | $O(1)$ |
| `^` (XOR) | 1 cycle | $O(1)$ | $O(1)$ |
| `~` (NOT) | 1 cycle | $O(1)$ | $O(1)$ |
| `<<` / `>>` (Shifts) | 1 cycle | $O(1)$ | $O(1)$ |

## When to Use and Avoid

| When to Use | When to Avoid |
|---|---|
| Flag masks (packing 32 or 64 boolean states into a single integer) | Writing obfuscated code where simple readability is paramount (`x >> 1` vs `x // 2`) |
| Low-level device drivers, network protocols, image encoding, and cryptographic primitives | Large precision floating point math |
| Extremely fast parity, odd/even checks (`x & 1`), or powers of two | Systems where bit lengths vary across languages (e.g. Python's arbitrary-precision ints vs C's 32/64-bit overflow) |
