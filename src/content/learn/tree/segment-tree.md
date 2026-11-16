---
title: "Segment Tree"
topic: "tree"
order: 11
difficulty: "advanced"
timeComplexity: "O(log n)"
spaceComplexity: "O(n)"
visualizer: "/visualizers/tree/segment-tree.html"
diagram: "/diagrams/tree/segment-tree-flow.html"
tags: ["tree", "segment-tree", "range-query", "divide-and-conquer"]
---

## What is a Segment Tree?

Imagine a company org chart where every manager writes down the total sales of their department: to find the sum for half the company, you grab one vice president's total instead of calling every store.

A Segment Tree stores precomputed range summaries (such as sum, min, or max) over halves of an array so both range queries and point updates finish in `O(log n)` time.

## Core idea

Split `[l..r]` at `mid = (l + r) // 2` into `2*node` and `2*node + 1`; on a query, return `0` for disjoint segments, return `tree[node]` immediately on full overlap, and split only partial overlaps.

## Python code

```python
class SegmentTree:
    def __init__(self, arr: list[int]) -> None:
        self.n = len(arr)
        self.tree = [0] * (4 * self.n)
        if self.n:
            self._build(1, 0, self.n - 1, arr)

    def _build(self, node: int, l: int, r: int, arr: list[int]) -> None:
        if l == r:
            self.tree[node] = arr[l]
            return
        mid = (l + r) // 2
        self._build(2 * node, l, mid, arr)
        self._build(2 * node + 1, mid + 1, r, arr)
        self.tree[node] = self.tree[2 * node] + self.tree[2 * node + 1]

    def query(self, node: int, l: int, r: int, ql: int, qr: int) -> int:
        if qr < l or r < ql:
            return 0
        if ql <= l and r <= qr:
            return self.tree[node]  # Whole segment lies inside [ql..qr]
        mid = (l + r) // 2
        return self.query(2 * node, l, mid, ql, qr) + self.query(
            2 * node + 1, mid + 1, r, ql, qr
        )
```

## Complexity

| Operation | Time | Space | Why? |
|---|---|---|---|
| `build` | `O(n)` | `O(4n)` (`O(n)`) | Visits each of the `2n - 1` segment nodes once |
| `query(ql, qr)` | `O(log n)` | `O(log n)` stack | Touches at most `4` nodes per tree level before hitting full overlap or disjoint |
| `update(idx, val)` | `O(log n)` | `O(log n)` stack | Updates one leaf and recomputes only its `log₂(n)` ancestors |

## When to use

| Great for | Avoid for |
|---|---|
| Mixed range queries (sum, min, max, gcd) and frequent element updates on an array | Static arrays that never change after creation (a Prefix Sum answers sum queries in `O(1)`) |
| Range-update problems when paired with lazy propagation | Simple prefix sums only, where a Fenwick Tree (Binary Indexed Tree) takes half the code and memory |
