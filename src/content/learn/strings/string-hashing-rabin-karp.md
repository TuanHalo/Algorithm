---
title: "String Hashing & Rabin-Karp"
topic: "strings"
order: 2
difficulty: "intermediate"
timeComplexity: "O(n + m) average, O(n * m) worst-case"
spaceComplexity: "O(1)"
tags: ["strings", "hashing", "rabin-karp", "pattern-matching", "rolling-hash"]
---

## Intuition & Analogy

Imagine you are looking for a suspect whose height, weight, and shoe size match a specific profile. Instead of measuring every single pedestrian on a crowded avenue with calipers and a tape measure (which takes several minutes per person), you install a sensor that checks their general weight and height profile instantly as they walk past.
Only if someone's quick digital profile matches the target suspect do you pull them aside for a full identity check.

The **Rabin-Karp** algorithm treats substrings as numbers. It computes a fast mathematical fingerprint (a rolling hash) for a sliding window across the text. If the fingerprints match, it performs an exact character check to guard against coincidental collisions.

## Core Concept

### 1. Polynomial Rolling Hash
A string $S = c_0 c_1 \dots c_{m-1}$ is viewed as a base-$B$ polynomial modulo a large prime $M$:
$$H(S) = \left( \sum_{i=0}^{m-1} c_i \cdot B^{m - 1 - i} \right) \bmod M$$
Common choices:
- Base $B$: A prime larger than the alphabet size (e.g., $B = 31$ for lowercase English or $B = 257$ for full ASCII).
- Modulo $M$: A large prime (e.g., $10^9 + 7$ or $10^9 + 9$) to minimize collisions.

### 2. Rolling Window in $O(1)$
When the window slides forward by one character (dropping $c_{\text{out}}$ on the left and adding $c_{\text{in}}$ on the right):
$$H_{\text{new}} = \left( \left( H_{\text{old}} - c_{\text{out}} \cdot B^{m-1} \right) \cdot B + c_{\text{in}} \right) \bmod M$$
This transition runs in **strict $O(1)$ time**, allowing us to test all $n - m + 1$ substrings in $O(n)$ average time instead of $O(n \times m)$.

## Step-by-Step Walkthrough

Search for pattern `"cat"` in text `"scatcat"`:
- Pattern length $m = 3$. Base $B = 10$, Modulo $M = 101$.
- Let numeric values be: `'s'=19, 'c'=3, 'a'=1, 't'=20`.
- Compute target hash $H(\text{"cat"}) = (3 \cdot 10^2 + 1 \cdot 10^1 + 20 \cdot 10^0) \bmod 101 = 330 \bmod 101 = 27$.
- Multiplier factor $B^{m-1} = 10^2 = 100 \bmod 101 = 100$.

1. Window 0 `"sca"`:
   $H = (19 \cdot 100 + 3 \cdot 10 + 1) \bmod 101 = 1931 \bmod 101 = 12 \ne 27$. (No match)
2. Slide to Window 1 `"cat"`:
   Drop `'s'=19`, multiply by 10, add `'t'=20`:
   $H = ((12 - 19 \cdot 100) \cdot 10 + 20) \bmod 101 = 27 == 27$!
   Fingerprint matches $\implies$ Compare `"cat" == "cat"`: Match found at index 1!
3. Slide to Window 2 `"atc"`: $H \ne 27$.
4. Slide to Window 3 `"tca"`: $H \ne 27$.
5. Slide to Window 4 `"cat"`: Hash matches $27 \implies$ Verify string: Match found at index 4!

## Python Code

```python
def rabin_karp(text: str, pattern: str) -> list[int]:
    """Finds all 0-based starting indices of pattern in text using Rabin-Karp."""
    n, m = len(text), len(pattern)
    if m == 0 or n < m:
        return []

    base = 257  # Prime base for ASCII characters
    mod = 1_000_000_007

    # Precompute base^(m-1) % mod
    highest_power = pow(base, m - 1, mod)

    pattern_hash = 0
    window_hash = 0

    # 1. Compute initial hash values
    for i in range(m):
        pattern_hash = (pattern_hash * base + ord(pattern[i])) % mod
        window_hash = (window_hash * base + ord(text[i])) % mod

    matches: list[int] = []

    # 2. Slide window across text
    for i in range(n - m + 1):
        if window_hash == pattern_hash:
            # Hash match: verify exact substring to guard against hash collisions
            if text[i : i + m] == pattern:
                matches.append(i)

        # Roll the hash to the next position
        if i < n - m:
            window_hash = (
                (window_hash - ord(text[i]) * highest_power) * base
                + ord(text[i + m])
            ) % mod
            # Ensure non-negative modulo result
            if window_hash < 0:
                window_hash += mod

    return matches
```

## Complexity Table

| Scenario | Time Complexity | Space Complexity | Explanation |
|---|---|---|---|
| Average Case | $O(n + m)$ | $O(1)$ | Hash collisions are rare with a large prime modulo |
| Worst Case | $O(n \times m)$ | $O(1)$ | Pathological cases where many collisions trigger full checks |
| Multiple Patterns | $O(n + k \cdot m)$ | $O(k)$ | Can check $k$ same-length patterns simultaneously using a Hash Set |

## When to Use and Avoid

| When to Use | When to Avoid |
|---|---|
| Multiple pattern matching of fixed lengths (placing pattern hashes in a Hash Set) | Single pattern matching where guaranteed worst-case $O(n + m)$ is required (use KMP or Z-Algorithm) |
| Plagiarism detection across large bodies of text | Small alphabet sizes with very short patterns where simple two pointers suffice |
| 2D grid pattern matching by combining horizontal and vertical rolling hashes | Adversarial competitive programming test cases without using double hashing |
