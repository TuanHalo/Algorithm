---
title: "Huffman Coding"
topic: "greedy"
order: 7
difficulty: "advanced"
timeComplexity: "O(n log n)"
spaceComplexity: "O(n)"
tags: ["greedy", "min-heap", "binary-tree", "compression"]
---

## Complexity

| Case | Time | Space | Why? |
|------|------|-------|------|
| Best (one symbol) | `O(n)` | `O(n)` | No merge happens; the heap build and the single leaf are linear |
| Average | `O(n log n)` | `O(n)` | `n - 1` merges with two pops and a push at `O(log n)` each, then a walk over `2n - 1` nodes |
| Worst (skewed frequencies) | `O(n log n)` | `O(n)` | The tree is a long chain, so `walk` recurses `n` deep, but each node is still visited once |

## When to use

| Great for | Avoid for |
|---|---|
| Lossless compression formats (DEFLATE, JPEG, MP3 entropy stages) where symbol frequencies are skewed | Tiny inputs where storing the frequency table costs more bits than the compression saves |
| Building optimal prefix-free codes when every symbol frequency is known up front | Streams whose distribution changes (adaptive arithmetic coding or LZ77 fit better) |
