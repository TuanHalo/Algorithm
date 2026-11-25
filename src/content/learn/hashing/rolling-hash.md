---
title: "Rolling Hash (Rabin-Karp)"
topic: "hashing"
order: 6
difficulty: "advanced"
timeComplexity: "O(n + m)"
spaceComplexity: "O(1)"
tags: ["hashing", "rolling-hash", "rabin-karp", "strings"]
---

## Complexity

| Case | Time | Space | Why? |
|------|------|-------|------|
| Best | `O(n + m)` | `O(1)` | One `O(m)` start, then one `O(1)` update per window, with no equal hashes |
| Average | `O(n + m)` | `O(1)` | A large prime `mod` makes false equal hashes rare |
| Worst | `O(n · m)` | `O(1)` | Many windows share the pattern's hash, so each one needs a full `m`-digit check |

## When to use

| Great for | Avoid for |
|---|---|
| Finding several patterns of the same length in one pass (compare each window's hash with a set of pattern hashes) | Strict `O(n + m)` worst-case single-pattern search (use KMP instead) |
| Finding the longest repeated substring using binary search plus a hash set | Very short texts where `text[i : i + m] == pattern` is already fast enough |
| Detecting copied text blocks across documents; real code hashes characters with `ord(ch)` and a prime `mod` such as `1_000_000_007` | Wildcard or regex matching where characters can skip positions |
