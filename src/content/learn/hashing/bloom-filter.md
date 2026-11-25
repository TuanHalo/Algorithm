---
title: "Bloom Filter (Probabilistic Set Membership)"
topic: "hashing"
order: 7
difficulty: "advanced"
timeComplexity: "O(k) insert & query"
spaceComplexity: "O(m) bits"
tags: ["hashing", "bloom-filter", "probabilistic", "bit-array", "caching"]
---

## Complexity

| Case | Time | Space | Why? |
|------|------|-------|------|
| Best (first bit is `0`) | `O(1)` | `O(m)` bits | `contains` stops at the first `0` bit it reads |
| Average | `O(k)` | `O(m)` bits | `add` and `contains` hash once and touch `k` bits, however many keys are stored |
| Worst (all bits `1`) | `O(k)` | `O(m)` bits | `k` bits are read; the false-positive rate grows as more bits turn on (about `(1 − e^(−kn/m))^k`) |

## When to use

| Great for | Avoid for |
|---|---|
| Database read caches (Cassandra, RocksDB, Bigtable ask a filter before reading a disk file) | Applications that need **zero** false positives |
| Web crawlers tracking visited URLs without storing every URL; browsers checking a site against a blocklist | Sets that need deletions (use a Counting Bloom Filter or a Cuckoo Filter) |
| Sizing: about 10 bits per key gives a 1% false-positive rate, with `k ≈ 0.69 · m / n` hash functions (real filters use `hashlib` digests instead of `key % m`) | Listing or returning the stored keys: a Bloom filter only answers membership |
