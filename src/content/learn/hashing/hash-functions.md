---
title: "Hash Functions & Load Factor"
topic: "hashing"
order: 1
difficulty: "beginner"
timeComplexity: "O(k)"
spaceComplexity: "O(m)"
visualizer: "/visualizers/hashing/hash-functions.html"
diagram: "/diagrams/hashing/hash-functions-flow.html"
tags: ["hashing", "hash-function", "load-factor", "fundamentals"]
---

## What is a hash function?

At a coat check with 10 numbered hooks, you do not want to check every coat on the rack to find yours. A simple rule turns your name into a hook number like `4`, so you walk straight to hook `4` every time.

A hash function turns any key, such as a word or a number, into a bucket index in a fixed-size table. The load factor (`items / capacity`) measures how full that table is getting so you know when to make it bigger.

## Core idea

Turn `key` into the same whole number every time, wrap it into `0` to `capacity - 1` using `% capacity`, and double the table size when `item_count / capacity` gets too crowded.

## Python code

```python
def hash_string(key: str, capacity: int) -> int:
    total = 0
    for ch in key:
        # Polynomial mixing prevents anagrams like "ab" and "ba" from tying
        total = (total * 31 + ord(ch)) % capacity
    return total


def needs_resize(item_count: int, capacity: int, threshold: float = 0.75) -> bool:
    load_factor = item_count / capacity
    return load_factor > threshold
```

## Complexity

| Operation / Case | Time | Space | Why? |
|---|---|---|---|
| Hash an integer | `O(1)` | `O(1)` | Runs one math step and `% capacity` |
| Hash a string of length `k` | `O(k)` | `O(1)` | Loops through each character once |
| Resize and rehash | `O(n + m)` | `O(m)` | Creates a `2x` larger array and places all `n` items into new buckets |

## When to use

| Great for | Avoid for |
|---|---|
| Turning text or IDs into fast array positions | Passwords or security checks (use `hashlib.sha256` instead of modulo math) |
| Keeping hash tables fast by resizing before `n / m` passes `0.75` | Range searches like "all scores between 10 and 50", because hashing scrambles order |
| Spreading keys evenly across buckets | Lists or dicts used as keys, since keys must not change after insertion |
