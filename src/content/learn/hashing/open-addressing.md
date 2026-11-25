---
title: "Open Addressing"
topic: "hashing"
order: 5
difficulty: "intermediate"
timeComplexity: "O(1)"
spaceComplexity: "O(m)"
tags: ["hashing", "open-addressing", "linear-probing", "quadratic-probing"]
---

## Complexity

| Case | Time | Space | Why? |
|------|------|-------|------|
| Best | `O(1)` | `O(m)` | The home slot is free or already holds the key |
| Average (load under about 0.7) | `O(1)` | `O(m)` | A few probes through neighbouring slots find a free one |
| Worst (crowded table) | `O(n)` | `O(m)` | Taken slots clump, so a probe walks a long run; a full table tries all `m` slots |

## When to use

| Great for | Avoid for |
|---|---|
| Fast CPU-cache lookups, because probes touch neighbouring slots (Python's built-in `dict` uses open addressing) | Tables that fill past `70%` without resizing |
| Saving memory by avoiding list nodes and pointers | Heavy delete-and-add churn: a delete must leave a `TOMBSTONE` marker so later probes do not stop early, and old markers need a rehash |
| Breaking up clumps by probing `+step²` (quadratic) instead of `+step` | Workloads that need a strict cap on probe steps |
