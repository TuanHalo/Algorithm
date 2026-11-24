---
title: "XOR Properties & Applications"
topic: "bit-manipulation"
order: 3
difficulty: "intermediate"
timeComplexity: "O(n)"
spaceComplexity: "O(1)"
tags: ["bit-manipulation", "xor", "single-number", "bitwise-tricks", "parity"]
---

## Complexity

| Case | Time | Space | Why? |
|------|------|-------|------|
| Best | `O(n)` | `O(1)` | Every value must still be folded in, even a one-element list |
| Average | `O(n)` | `O(1)` | One XOR per value into a single number |
| Worst | `O(n)` | `O(1)` | Never more than one pass; a set needs `O(n)` space, sorting `O(n log n)` time |

## When to use

| Great for | Avoid for |
|---|---|
| The one value with an odd count when all others appear an even number of times (Single Number) | Values that appear three or more times: count each bit modulo 3 instead |
| Missing Number in `0..n`: XOR every index and every value, and the missing one is left | Floats and strings: XOR needs integers |
| Two loners (Single Number III): XOR everything to get `a ^ b`, split the list by its lowest set bit `x & -x`, and XOR each group | Swapping with `a ^= b; b ^= a; a ^= b`: a temp variable is clearer, and if both names point at the same slot it zeroes the value |
| Parity checks, toggles and checksums | Problems that need to know which index holds the value (use a hash map) |
