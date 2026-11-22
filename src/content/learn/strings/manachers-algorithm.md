---
title: "Manacher's Algorithm (Longest Palindromic Substring)"
topic: "strings"
order: 5
difficulty: "advanced"
timeComplexity: "O(n)"
spaceComplexity: "O(n)"
tags: ["strings", "palindrome", "manacher", "linear-time", "symmetry"]
---

## Intuition & Analogy

Imagine standing in a hall of mirrors centered at position $C$. Everything reflected on the left of $C$ is a symmetrical copy of what exists on the right of $C$.
If a small symmetrical flower is painted around point $i'$ on the left side, you know immediately—without measuring—that a duplicate flower exists at mirror point $i$ on the right side!
The only time you actually need to inspect elements is when the flower extends beyond the outer perimeter $R$ of the mirror.

Naive palindrome search around each center takes $O(n^2)$ time. **Manacher's Algorithm** exploits this mirror symmetry to find the longest palindromic substring in strictly **$O(n)$ linear time**.

## Core Concept

### 1. Unified Delimiter Transformation
Palindromes can be odd-length (centered on a character: `"aba"`) or even-length (centered between characters: `"abba"`).
Manacher unifies both by inserting special delimiter characters (e.g., `#`) between every character, and adding unique boundary sentinels (`^` and `$`):
$$\text{"aba"} \implies \text{"\textasciicircum\#a\#b\#a\#\textdollar"}$$
Every palindrome in the transformed string now has an **odd length** centered on a specific index!

### 2. The Palindrome Radius Array $P[i]$
$P[i]$ records the radius (half-length) of the palindrome centered at index $i$.
We maintain:
- $C$: The center of the palindrome that extends furthest to the right.
- $R$: The right boundary ($C + P[C]$) of that palindrome.

For a new index $i < R$, its mirror position across center $C$ is:
$$i' = 2C - i$$
Due to symmetry:
$$P[i] \ge \min(R - i, P[i'])$$
We only expand characters outward if the palindrome extends past $R$. Once expanded, if the new palindrome extends beyond $R$, we update $C = i$ and $R = i + P[i]$.

## Step-by-Step Walkthrough

Consider string `"aba"`:
1. Transformed: `T = "^ # a # b # a # $"`
   Indices: $0$ through $8$.
2. As $i$ advances:
   - At center $i = 4$ (`'b'`): expands to match `#`, `a`, `#` $\implies P[4] = 3$.
   - Center $C = 4$, boundary $R = 4 + 3 = 7$.
   - At $i = 5$ (`'#'`): mirror is $i' = 2(4) - 5 = 3$. $P[3] = 0$. Since $0 < 7 - 5$, $P[5] = 0$.
   - At $i = 6$ (`'a'`): mirror is $i' = 2(4) - 6 = 2$. $P[2] = 1$. $P[6] = 1$.
3. The maximum radius is $P[4] = 3$.
   In the transformed string, a radius of $3$ corresponds exactly to a palindrome of length $3$ in the original string (`"aba"`).

## Python Code

```python
def longest_palindrome(s: str) -> str:
    """Finds the longest palindromic substring in strictly O(n) time using Manacher's Algorithm."""
    if not s:
        return ""

    # Transform "aba" -> "^#a#b#a#$"
    t = "^#" + "#".join(s) + "#$"
    n = len(t)
    p = [0] * n
    c = 0  # Center
    r = 0  # Right boundary

    for i in range(1, n - 1):
        i_mirror = 2 * c - i

        if i < r:
            p[i] = min(r - i, p[i_mirror])
        else:
            p[i] = 0

        # Attempt to expand palindrome centered at i
        while t[i + 1 + p[i]] == t[i - 1 - p[i]]:
            p[i] += 1

        # If expanded past r, adjust center and right boundary
        if i + p[i] > r:
            c = i
            r = i + p[i]

    # Find maximum radius and corresponding center
    max_len, center_index = max((val, idx) for idx, val in enumerate(p))

    # Map back to original string indices
    start = (center_index - max_len) // 2
    return s[start : start + max_len]
```

## Complexity Table

| Approach | Time Complexity | Space Complexity | Notes |
|---|---|---|---|
| Brute Force (All Substrings) | $O(n^3)$ | $O(1)$ | Checks every pair of start and end indices |
| Dynamic Programming | $O(n^2)$ | $O(n^2)$ | 2D table tracking `is_palindrome(i, j)` |
| Expand Around Center | $O(n^2)$ | $O(1)$ | Expand outward from $2n - 1$ centers |
| Manacher's Algorithm | $O(n)$ | $O(n)$ | Symmetrical reuse guarantees $O(n)$ linear runtime |

## When to Use and Avoid

| When to Use | When to Avoid |
|---|---|
| Finding longest palindromic substring when $n \ge 10^5$ (where $O(n^2)$ approaches timeout) | Short strings ($n \le 1000$) where standard "expand around center" is faster to write and has negligible runtime |
| Counting all distinct or total palindromic substrings in linear time | Palindromic subsequences (where elements can be skipped — solved via Interval DP in $O(n^2)$) |
| Longest common palindromic subsegment analysis | Non-string data structures or trees |
