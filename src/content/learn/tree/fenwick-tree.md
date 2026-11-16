---
title: "Fenwick Tree (Binary Indexed Tree)"
topic: "tree"
order: 12
difficulty: "advanced"
timeComplexity: "O(log n)"
spaceComplexity: "O(n)"
tags: ["tree", "fenwick-tree", "binary-indexed-tree", "bit", "range-query", "prefix-sum"]
---

## What is a Fenwick Tree?

Imagine you run an online marathon tracker.
If you simply record each runner's lap time in a regular array, updating a lap time is instant ($O(1)$), but calculating a runner's total elapsed time across 50 laps requires summing 50 numbers ($O(n)$).
If you precompute prefix sums, queries are instant ($O(1)$), but updating any single lap time forces you to recalculate every subsequent prefix sum ($O(n)$).

A **Fenwick Tree** (also called a **Binary Indexed Tree** or **BIT**) achieves the sweet spot: both point updates and prefix sum queries finish in blistering **$O(\log n)$** time using an ordinary flat array, with zero node pointers, no child references, and only a fraction of the code of a Segment Tree!

## Core Concept

A Fenwick Tree stores partial sums over intervals whose lengths are powers of two, dictated by the binary representation of array indices (using 1-based indexing).

Key principles:
1. **Least Significant Bit (LSB)**: The length of the interval managed by index $i$ is its lowest set bit:
   $$\text{LSB}(i) = i \ \& \ (-i)$$
   *Example: $i = 12 = 1100_2 \implies 12 \ \& \ (-12) = 4 = 0100_2$. Index 12 stores the sum of 4 elements ending at 12: $(8, 12] = arr[9..12]$.*
2. **Prefix Sum Query (`query(i)`)**:
   Accumulate `tree[i]`, then strip the lowest set bit ($i \leftarrow i - (i \ \& \ -i)$) to jump to the predecessor interval. Repeat until $i = 0$. This takes at most $\lfloor \log_2(n) \rfloor + 1$ jumps.
3. **Point Update (`update(i, delta)`)**:
   Add `delta` to `tree[i]`, then add the lowest set bit ($i \leftarrow i + (i \ \& \ -i)$) to ascend to all ancestor intervals containing $i$. Repeat while $i \le n$.
4. **Range Sum Query**:
   Compute $\text{sum}(l..r) = \text{query}(r) - \text{query}(l - 1)$.

## Walkthrough

Consider an array of size $n = 8$:
- Index $1$ ($0001_2$, LSB 1): covers `arr[1]`
- Index $2$ ($0010_2$, LSB 2): covers `arr[1..2]`
- Index $3$ ($0011_2$, LSB 1): covers `arr[3]`
- Index $4$ ($0100_2$, LSB 4): covers `arr[1..4]`
- Index $5$ ($0101_2$, LSB 1): covers `arr[5]`
- Index $6$ ($0110_2$, LSB 2): covers `arr[5..6]`
- Index $7$ ($0111_2$, LSB 1): covers `arr[7]`
- Index $8$ ($1000_2$, LSB 8): covers `arr[1..8]`

```
Query sum(1..7):
  Start at i = 7 (binary 0111):
    sum += tree[7] (covers [7..7])
    i = 7 - (7 & -7) = 7 - 1 = 6 (binary 0110)
  Next i = 6:
    sum += tree[6] (covers [5..6])
    i = 6 - (6 & -6) = 6 - 2 = 4 (binary 0100)
  Next i = 4:
    sum += tree[4] (covers [1..4])
    i = 4 - (4 & -4) = 4 - 4 = 0 (stop!)
  Total sum = tree[7] + tree[6] + tree[4] = arr[1..7]
  Only 3 additions instead of 7!

Update arr[3] += 5:
  Start at i = 3 (binary 0011):
    tree[3] += 5
    i = 3 + (3 & -3) = 3 + 1 = 4 (binary 0100)
  Next i = 4:
    tree[4] += 5
    i = 4 + (4 & -4) = 4 + 4 = 8 (binary 1000)
  Next i = 8:
    tree[8] += 5
    i = 8 + (8 & -8) = 8 + 8 = 16 > 8 (stop!)
  Only updated indices 3, 4, 8!
```

## Python Code

```python
class FenwickTree:
    """1-based Binary Indexed Tree (Fenwick Tree) for dynamic prefix sums."""

    def __init__(self, size: int) -> None:
        self.n = size
        self.tree = [0] * (size + 1)

    @classmethod
    def from_array(cls, arr: list[int]) -> "FenwickTree":
        """Builds Fenwick Tree in linear O(n) time from initial array."""
        n = len(arr)
        bit = cls(n)
        for i in range(1, n + 1):
            bit.tree[i] += arr[i - 1]
            parent = i + (i & -i)
            if parent <= n:
                bit.tree[parent] += bit.tree[i]
        return bit

    def update(self, i: int, delta: int) -> None:
        """Adds delta to element at 1-based index i in O(log n)."""
        while i <= self.n:
            self.tree[i] += delta
            i += i & (-i)  # Add lowest set bit

    def query(self, i: int) -> int:
        """Returns prefix sum of elements from index 1 to i in O(log n)."""
        total = 0
        while i > 0:
            total += self.tree[i]
            i -= i & (-i)  # Subtract lowest set bit
        return total

    def range_query(self, l: int, r: int) -> int:
        """Returns range sum arr[l..r] (1-based, inclusive) in O(log n)."""
        if l > r:
            return 0
        return self.query(r) - self.query(l - 1)
```

## Complexity

| Operation | Time | Space | Why? |
|---|---|---|---|
| `from_array(arr)` | `O(n)` | `O(n)` | Linear propagation into immediate parent nodes |
| `update(i, delta)` | `O(log n)` | `O(1)` | Follows ancestor chain by adding lowest set bit; at most $\lfloor \log_2 n \rfloor + 1$ iterations |
| `query(i)` | `O(log n)` | `O(1)` | Strips set bits towards 0; at most $\lfloor \log_2 n \rfloor + 1$ iterations |
| `range_query(l, r)` | `O(log n)` | `O(1)` | Difference of two prefix queries: $\text{query}(r) - \text{query}(l - 1)$ |

## When to Use

| Great for | Avoid for |
|---|---|
| Dynamic prefix sum queries and point updates on frequency tables and arrays | Static arrays that never change after construction (use a standard Prefix Sum array for $O(1)$ queries) |
| Inversion count problems and coordinate compression queries | Non-invertible range operations like Range Minimum Query (RMQ), where Segment Tree is superior |
| Memory-constrained platforms (uses exact size $n+1$, whereas Segment Tree uses $4n$) | Complex range updates with lazy propagation (Segment Tree handles general lazy tags much more naturally) |
