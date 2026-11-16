---
title: "Edit Distance (Levenshtein)"
topic: "dynamic-programming"
order: 8
difficulty: "intermediate"
timeComplexity: "O(m · n)"
spaceComplexity: "O(m · n)"
visualizer: "/visualizers/dynamic-programming/edit-distance.html"
diagram: "/diagrams/dynamic-programming/edit-distance-flow.html"
tags: ["dynamic-programming", "2d-dp", "string-dp", "levenshtein"]
---

## What is Edit Distance?

Think of your phone's autocorrect measuring how close `"horse"` is to `"ros"`: you can insert, delete, or replace one letter at a time. Edit Distance finds the fewest single-character edits needed to morph `word1` into `word2`.

Unlike LCS (where empty prefixes cost `0`), turning a `k`-letter prefix into an empty string always costs `k` deletions.

## Core idea

Seed `dp[i][0] = i` and `dp[0][j] = j`; copy `dp[i - 1][j - 1]` for free on matching letters, or take `1 + min(delete, insert, replace)` on mismatches.

## Python code

```python
def min_distance(word1: str, word2: str) -> int:
    m, n = len(word1), len(word2)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(m + 1):
        dp[i][0] = i
    for j in range(n + 1):
        dp[0][j] = j
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if word1[i - 1] == word2[j - 1]:
                dp[i][j] = dp[i - 1][j - 1]
            else:
                dp[i][j] = 1 + min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    return dp[m][n]
```

## Complexity

| Approach | Time | Space | Why? |
|---|---|---|---|
| Full 2D `dp[i][j]` | `O(m · n)` | `O(m · n)` | Evaluates every `(i, j)` prefix pair and keeps the grid for edit traceback |
| Rolling 1D row (cost only) | `O(m · n)` | `O(min(m, n))` | Keeps only the previous row plus one saved diagonal variable |

## When to use

| Great for | Avoid for |
|---|---|
| Spell checkers, fuzzy search, and DNA mutation distance | Fixed-length strings where only substitutions are allowed (use `O(n)` Hamming distance) |
| Problems combining insert, delete, and replace with equal or custom costs | Long documents (`m, n > 10⁴`) without banded DP or Myers' bit-parallel optimization |
