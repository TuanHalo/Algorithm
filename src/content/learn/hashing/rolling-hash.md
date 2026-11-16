---
title: "Rolling Hash (Rabin-Karp)"
topic: "hashing"
order: 6
difficulty: "advanced"
timeComplexity: "O(n + m)"
spaceComplexity: "O(1)"
visualizer: "/visualizers/hashing/rolling-hash.html"
diagram: "/diagrams/hashing/rolling-hash-flow.html"
tags: ["hashing", "rolling-hash", "rabin-karp", "strings"]
---

## What is a rolling hash?

Slide a 3-digit window across `314159` looking for `159`. Moving the window from `314` to `141` takes three quick steps instead of re-reading every digit: drop the `3` (`314 - 300 = 14`), shift left (`14 * 10 = 140`), and add the `1` (`141`).

A rolling hash (the core of Rabin-Karp) updates a text window's number fingerprint in `O(1)` per shift so pattern matching runs in `O(n + m)` average time.

## Core idea

Subtract `outgoing * base^(m-1)`, multiply by `base`, and add `incoming` modulo a large prime `mod`; check the characters one by one only when the window hash equals `pat_hash`.

## Python code

```python
def rabin_karp(text: str, pattern: str) -> list[int]:
    n, m = len(text), len(pattern)
    if m == 0 or m > n:
        return []
    base, mod = 256, 1_000_000_007
    high_pow = pow(base, m - 1, mod)
    pat_hash = win_hash = 0
    for i in range(m):
        pat_hash = (pat_hash * base + ord(pattern[i])) % mod
        win_hash = (win_hash * base + ord(text[i])) % mod

    matches: list[int] = []
    for i in range(n - m + 1):
        if win_hash == pat_hash and text[i : i + m] == pattern:
            matches.append(i)  # Verify chars to guard against hash collisions
        if i + m < n:
            win_hash = ((win_hash - ord(text[i]) * high_pow) * base + ord(text[i + m])) % mod
    return matches
```

## Complexity

| Operation / Case | Time | Space | Why? |
|---|---|---|---|
| Average search | `O(n + m)` | `O(1)` extra | Each window slide updates in `O(1)`; collisions are rare with a huge prime `mod` |
| Worst search | `O(n · m)` | `O(1)` extra | Repeated hash collisions force full `m`-letter checks at every spot |

## When to use

| Great for | Avoid for |
|---|---|
| Finding several patterns of the same length in one pass | Strict `O(n + m)` worst-case single-pattern search (use KMP instead) |
| Finding the longest repeated substring using binary search plus a hash set | Very short strings where `text[i:i+m] == pattern` is already fast enough |
| Detecting copied text blocks across documents | Wildcard or regex matching where characters can skip positions |
