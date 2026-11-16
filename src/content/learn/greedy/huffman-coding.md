---
title: "Huffman Coding"
topic: "greedy"
order: 7
difficulty: "advanced"
timeComplexity: "O(n log n)"
spaceComplexity: "O(n)"
visualizer: "/visualizers/greedy/huffman-coding.html"
diagram: "/diagrams/greedy/huffman-coding-flow.html"
tags: ["greedy", "min-heap", "binary-tree", "compression"]
---

## What is Huffman coding?

In Morse code, common letters like `E` get a single dot while rare letters like `Q` get four symbols so messages stay short. Huffman coding automates that idea for binary files by assigning shorter bit strings to frequent characters and longer bit strings to rare ones, with no code ever acting as the prefix of another.

Huffman coding builds an optimal prefix-free binary tree from symbol frequencies using a min-heap.

## Core idea

Put every `(frequency, character)` pair into a min-heap, repeatedly pop the two lightest nodes and merge them under a new parent with their summed weight, then read left-`0` / right-`1` paths down to each leaf.

## Python code

```python
import heapq


def huffman_codes(freqs: dict[str, int]) -> dict[str, str]:
    heap: list[tuple[int, int, str | tuple]] = [
        (freq, idx, ch) for idx, (ch, freq) in enumerate(freqs.items())
    ]
    heapq.heapify(heap)
    uid = len(heap)
    while len(heap) > 1:
        f1, _, left = heapq.heappop(heap)
        f2, _, right = heapq.heappop(heap)
        # uid breaks frequency ties without comparing subtree tuples
        heapq.heappush(heap, (f1 + f2, uid, (left, right)))
        uid += 1

    codes: dict[str, str] = {}

    def walk(node: str | tuple, prefix: str) -> None:
        if isinstance(node, str):
            codes[node] = prefix or "0"
            return
        walk(node[0], prefix + "0")
        walk(node[1], prefix + "1")

    if heap:
        walk(heap[0][2], "")
    return codes
```

## Complexity

| Case | Time | Space | Why? |
|---|---|---|---|
| `n` distinct symbols | `O(n log n)` | `O(n)` | Performs `n - 1` heap merge steps at `O(log n)` each, and the binary tree has `2n - 1` nodes |

## When to use

| Great for | Avoid for |
|---|---|
| Lossless compression formats (DEFLATE, JPEG, MP3 entropy stages) where symbol frequencies skew | Tiny inputs where storing the frequency table costs more bits than compression saves |
| Building optimal prefix-free codes when every symbol frequency is known up front | Streaming data with changing distributions where adaptive arithmetic coding or LZ77 fits better |
