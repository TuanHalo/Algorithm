---
title: "Hash Map"
topic: "hashing"
order: 2
difficulty: "beginner"
timeComplexity: "O(1)"
spaceComplexity: "O(n)"
tags: ["hashing", "hash-map", "dictionary", "lookup"]
---

## Complexity

| Case | Time | Space | Why? |
|------|------|-------|------|
| Best | `O(1)` | `O(1)` extra | The bucket is empty or the key is its first entry |
| Average | `O(1)` | `O(n)` | One `%` finds the bucket, and chains stay short |
| Worst | `O(n)` | `O(n)` | Every key lands in the same bucket, so `put` and `get` scan all `n` pairs |

## When to use

| Great for | Avoid for |
|---|---|
| Fast `key -> value` lookups, caches, and pair-sum checks like Two Sum | Keeping keys sorted or quickly finding the smallest and largest keys |
| Counting how many times each word or number appears | Devices with tight memory where empty buckets waste space |
| Replacing slow `O(n²)` nested loops with a single `O(n)` pass (deleting a key is the same walk, then `bucket.pop(idx)`) | Autocomplete by prefix, where a Trie fits better |
