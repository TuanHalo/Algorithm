---
title: "String Representation & Immutability"
topic: "strings"
order: 1
difficulty: "beginner"
timeComplexity: "O(1) access, O(n) copy/concat"
spaceComplexity: "O(n)"
tags: ["strings", "immutability", "encoding", "unicode", "string-builder"]
---

## Complexity

| Case | Time | Space | Why? |
|------|------|-------|------|
| Best (one piece) | `O(n)` | `O(n)` | One append, then `join` copies the `n` characters once |
| Average | `O(n)` | `O(n)` | `n` amortized-`O(1)` appends plus one linear `join` |
| Worst | `O(n)` | `O(n)` | Occasional list resizes are paid for by the cheap appends; `s += ch` in a loop would instead cost `O(n²)` |

## When to use

| Great for | Avoid for |
|---|---|
| Building a string from many pieces in a loop (collect in a list, `join` once); a small `StringBuilder` class is the same idea | Repeated `s += piece` inside a loop of thousands of iterations (quadratic copying) |
| Immutable strings as dictionary keys and set members (the hash is computed once and cached) | Editing single characters in place (convert to a `list[str]` or `bytearray`, edit, then join) |
| Reading `s[i]` in `O(1)` and slicing when a copy of the slice is fine | Slicing inside a hot loop on long strings (each `s[i:j]` copies `j − i` characters; pass indices instead) |
