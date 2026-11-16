---
title: "Longest Common Subsequence (LCS)"
topic: "dynamic-programming"
order: 7
difficulty: "intermediate"
timeComplexity: "O(m · n)"
spaceComplexity: "O(m · n)"
visualizer: "/visualizers/dynamic-programming/longest-common-subsequence.html"
diagram: "/diagrams/dynamic-programming/longest-common-subsequence-flow.html"
tags: ["dynamic-programming", "2d-dp", "string-dp", "subsequence"]
---

## What is Longest Common Subsequence?

Think of comparing two drafts of a song lyric to find the longest chain of matching words that still appear in the same order, even if extra words were slipped in between. Unlike a substring, a subsequence lets you skip mismatched characters without resetting your progress to zero.

LCS fills an `(m + 1) × (n + 1)` grid comparing every prefix pair `text1[:i]` and `text2[:j]`.

## Core idea

When `text1[i - 1] == text2[j - 1]`, take `1 + dp[i - 1][j - 1]`; otherwise carry forward `max(dp[i - 1][j], dp[i][j - 1])`.

## Python code

```python
def lcs_length(text1: str, text2: str) -> int:
    m, n = len(text1), len(text2)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if text1[i - 1] == text2[j - 1]:
                dp[i][j] = 1 + dp[i - 1][j - 1]  # Match extends both prefixes
            else:
                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])
    return dp[m][n]
```

## Complexity

| Approach | Time | Space | Why? |
|---|---|---|---|
| Full 2D table (with traceback) | `O(m · n)` | `O(m · n)` | Computes every `(i, j)` prefix pair and keeps the grid to reconstruct the string |
| Rolling 1D row (length only) | `O(m · n)` | `O(min(m, n))` | Stores only the current and previous rows when only the length is needed |

## When to use

| Great for | Avoid for |
|---|---|
| File diffs (`git diff`), DNA alignment, and sequence similarity checks | Longest common **substring** (contiguous match), where mismatches must reset to `0` |
| Minimum deletions to equalize two strings (`m + n - 2 * lcs`) | Huge inputs (`m, n > 10⁴`) where Myers' diff or hashing is needed |
