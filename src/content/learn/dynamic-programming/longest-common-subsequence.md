---
title: "Longest Common Subsequence (LCS)"
topic: "dynamic-programming"
order: 7
difficulty: "intermediate"
timeComplexity: "O(m · n)"
spaceComplexity: "O(m · n)"
tags: ["dynamic-programming", "2d-dp", "string-dp", "subsequence"]
---

## Complexity

`m` and `n` are the two lengths.

| Case | Time | Space | Why? |
|------|------|-------|------|
| Best | `O(m · n)` | `O(m · n)` | Every prefix pair gets its cell, even for identical strings |
| Average | `O(m · n)` | `O(m · n)` | One comparison and one read per cell |
| Worst | `O(m · n)` | `O(m · n)` | Same table; two rolling rows bring space to `O(min(m, n))` when only the length is needed, plain recursion is `O(2^(m + n))` |

## When to use

| Great for | Avoid for |
|---|---|
| Diffs and alignment: `git diff`, DNA, comparing versions of a list | The longest common **substring** (contiguous): a mismatch must reset the cell to 0 instead of taking `max` |
| Related counts: fewest deletions to make two strings equal (`m + n − 2 · lcs`), Shortest Common Supersequence (`m + n − lcs`), Uncrossed Lines (LCS on number lists) | Very long inputs (`m, n > 10⁴`): Myers’ diff or Hirschberg’s linear-space version |
| Printing the subsequence itself: keep the table and walk back from `dp[m][n]` (diagonal on a match, else toward the bigger neighbour) | Allowing replacements as one step: that’s edit distance |
