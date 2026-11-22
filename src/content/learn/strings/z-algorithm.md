---
title: "Z-Algorithm & Z-Array"
topic: "strings"
order: 4
difficulty: "advanced"
timeComplexity: "O(n + m)"
spaceComplexity: "O(n + m)"
tags: ["strings", "z-algorithm", "z-array", "pattern-matching", "linear-time"]
---

## Intuition & Analogy

Imagine you are inspecting a repetitive decorative wallpaper pattern. At position 0, there is an initial emblem. Later down the hall, you find an exact copy of this emblem stretching from door $L$ to door $R$. This segment $[L, R]$ is your known **match window** (or "Z-box").
When you walk to a door $i$ that lies inside this window, you do not need to walk back to door 0 to inspect each symbol again. Because the entire window $[L, R]$ is a cloned duplicate of the prefix starting at 0, whatever happens at door $i$ is identical to what happened at door $i - L$!
You simply copy the answer, only expending effort to look closely if the duplicate pattern reaches past door $R$.

## Core Concept

For a string $S$ of length $n$, the **Z-array** is an array of length $n$ where `Z[i]` represents the length of the longest substring starting from $S[i]$ that is also a prefix of $S$:
$$Z[i] = \max \{ k \mid S[i \dots i + k - 1] = S[0 \dots k - 1] \}$$
(By convention, `Z[0] = 0` or is ignored).

### Maintaining the $[L, R]$ Interval
To compute the Z-array in $O(n)$ time:
- Maintain an interval $[L, R]$ such that $S[L \dots R]$ matches $S[0 \dots R - L]$ with the maximum possible right boundary $R$.
- For each index $i$:
  - If $i > R$: Compute $Z[i]$ by naively comparing characters starting from $S[i]$ and $S[0]$, then update $[L, R] = [i, i + Z[i] - 1]$.
  - If $i \le R$: Let $k = i - L$.
    - If $Z[k] < R - i + 1$: $Z[i] = Z[k]$ (fully contained inside existing match).
    - If $Z[k] \ge R - i + 1$: $Z[i]$ is at least $R - i + 1$. Continue matching characters beyond $R$, then update $L = i$ and new $R$.

### Pattern Matching via Concatenation
To find pattern $P$ in text $T$, construct string:
$$S = P + \text{"\textdollar"} + T$$
where `"\"$` is a sentinel character not appearing in $P$ or $T$.
Compute the Z-array of $S$. Any index $i > |P|$ where $Z[i] == |P|$ indicates an exact match of $P$ starting at index $i - |P| - 1$ in $T$!

## Step-by-Step Walkthrough

Let $S = \text{"a b a c a b a"}$:
- $i = 0$: `Z[0] = 0`.
- $i = 1$: `'b'` $\ne$ `'a'` $\implies Z[1] = 0$.
- $i = 2$: Matches `"aba"` with prefix `"aba"`. Length 3.
  $\implies Z[2] = 3$, interval $[L, R] = [2, 4]$.
- $i = 3$: Inside $[2, 4]$. $k = 3 - 2 = 1$. $Z[1] = 0 < (4 - 3 + 1 = 2)$.
  $\implies Z[3] = 0$.
- $i = 4$: Inside $[2, 4]$. $k = 4 - 2 = 2$. $Z[2] = 3 \ge (4 - 4 + 1 = 1)$.
  Match can extend beyond $R=4$. Compare $S[5]$ with $S[1]$ (`'b' == 'b'`), $S[6]$ with $S[2]$ (`'a' == 'a'`).
  Total match length: 3.
  $\implies Z[4] = 3$, new $[L, R] = [4, 6]$.
- $i = 5, 6$: Easily derived as $0$ and $1$.

Final Z-array: `[0, 0, 3, 0, 3, 0, 1]`.

## Python Code

```python
def compute_z_array(s: str) -> list[int]:
    """Computes Z-array for string s in strictly O(n) time."""
    n = len(s)
    z = [0] * n
    left = 0
    right = 0

    for i in range(1, n):
        if i <= right:
            # i is inside current [left, right] window
            k = i - left
            if z[k] < right - i + 1:
                z[i] = z[k]
            else:
                # Potential match extends beyond right boundary
                left = i
                while right < n and s[right] == s[right - left]:
                    right += 1
                z[i] = right - left
                right -= 1
        else:
            # i is outside current window; scan naively
            left = i
            right = i
            while right < n and s[right] == s[right - left]:
                right += 1
            z[i] = right - left
            right -= 1

    return z


def z_search(text: str, pattern: str) -> list[int]:
    """Finds all 0-based occurrences of pattern in text using Z-algorithm."""
    if not pattern or not text:
        return []

    combined = f"{pattern}${text}"
    z = compute_z_array(combined)
    m = len(pattern)
    matches: list[int] = []

    for i in range(m + 1, len(combined)):
        if z[i] == m:
            matches.append(i - m - 1)

    return matches
```

## Complexity Table

| Operation | Time Complexity | Space Complexity | Why? |
|---|---|---|---|
| Z-Array Construction | $O(n)$ | $O(n)$ | Right boundary $R$ only advances forward at most $n$ times |
| Pattern Search | $O(n + m)$ | $O(n + m)$ | Linear on concatenated string $P + \text{"\textdollar"} + T$ |
| Prefix Periodicity Query | $O(1)$ | $O(n)$ | Immediate lookup in precomputed Z-array |

## When to Use and Avoid

| When to Use | When to Avoid |
|---|---|
| When code simplicity is preferred over KMP's state-machine fallback logic | When allocating an $O(n + m)$ concatenated string string exceeds memory limits (KMP uses only $O(m)$ auxiliary space) |
| Finding all occurrences of a prefix inside the same string | Online character-by-character streams where the entire text cannot be loaded simultaneously |
| String compression and cyclic shift comparisons | Multi-pattern searches with a fixed dictionary |
