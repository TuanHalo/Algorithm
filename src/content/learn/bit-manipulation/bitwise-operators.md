---
title: "Bitwise Operators & Binary Representation"
topic: "bit-manipulation"
order: 1
difficulty: "beginner"
timeComplexity: "O(1)"
spaceComplexity: "O(1)"
tags: ["bit-manipulation", "binary", "bitwise-and", "bitwise-or", "shifts", "twos-complement"]
---

## Complexity

| Case | Time | Space | Why? |
|------|------|-------|------|
| Best | `O(1)` | `O(1)` | One CPU instruction handles every column of the word at once |
| Average | `O(1)` | `O(1)` | Same for every value; the result is one more integer |
| Worst | `O(1)` | `O(1)` | Fixed-width words never cost more; Python's unbounded ints cost `O(w)` for `w` bits, and a mask keeps `w` fixed |

## When to use

| Great for | Avoid for |
|---|---|
| Flag sets: pack 32 or 64 on/off values into one integer and test them with `&`, set them with `\|` | Code where `x // 2` or `x * 4` says it better than a shift |
| Parity and powers of two (`x & 1`, `1 << k`), network protocols, image formats and cryptographic primitives | Floats and other non-integers |
| Reading `~`, `<<` and `>>` in other people's code, so later hacks (lowest set bit, XOR tricks, bitmasks) make sense | Anything that depends on a fixed word size in Python without a mask, because Python ints never overflow |
