---
title: "String Hashing & Rabin-Karp"
topic: "strings"
order: 2
difficulty: "intermediate"
timeComplexity: "O(n + m) average, O(n * m) worst-case"
spaceComplexity: "O(1)"
tags: ["strings", "hashing", "rabin-karp", "pattern-matching", "rolling-hash"]
---

## Complexity

| Case | Time | Space | Why? |
|------|------|-------|------|
| Best (no hash ever equal) | `O(n + m)` | `O(1)` | `m` steps to build the hashes, then one `O(1)` compare and roll per window, with no letter checks |
| Average | `O(n + m)` | `O(1)` | With a large prime modulus collisions are rare, so letter checks are rare |
| Worst (many collisions or real matches) | `O(n · m)` | `O(1)` | Every window passes the hash test and costs `m` letters to verify, as in `"aaaa…"` searching `"aa…"` |

## When to use

| Great for | Avoid for |
|---|---|
| Searching many patterns of the same length at once: put their hashes in a set (Hashing → Rolling Hash) | One pattern when a guaranteed `O(n + m)` worst case matters (use KMP or the Z-algorithm) |
| Plagiarism detection and duplicate-substring problems such as Repeated DNA Sequences or Longest Duplicate Substring (rolling hash + binary search) | Adversarial inputs aimed at a known base and modulus (use a random base or double hashing) |
| 2D pattern matching: roll a hash along rows, then down columns | Tiny patterns on short texts, where a plain slice comparison is just as fast and simpler |
