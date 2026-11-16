---
title: "Prefix Sum & Difference Array"
topic: "arrays-two-pointers"
order: 2
difficulty: "beginner"
timeComplexity: "O(1) range queries / updates"
spaceComplexity: "O(n)"
tags: ["arrays", "prefix-sum", "difference-array", "range-queries", "precomputation"]
---

## Intuition & Analogy

Imagine tracking your total bank balance over a month. If you want to know how much money you spent between day 10 and day 20, you do not need to sum 11 individual receipts. If you know your account balance at the end of day 9 and at the end of day 20, the difference between those two snapshot numbers immediately gives the net change!

Conversely, suppose you need to give a \$5 bonus to every employee whose ID falls between 100 and 500. Instead of visiting 400 desks individually, you place a "+$5" memo at door 100 and a "-$5" memo at door 501. Anyone walking past gets the bonus until they pass door 501. That is the **Difference Array**.

## Core Concept

### 1. Prefix Sum (Fast Range Sum Queries)
Given an array `arr` of size $n$, the prefix sum array `P` of size $n + 1$ satisfies:
$$P[0] = 0, \quad P[i] = P[i - 1] + arr[i - 1]$$
Any subsegment sum from index $L$ to $R$ inclusive ($0 \le L \le R < n$) is calculated in $O(1)$:
$$\sum_{k=L}^{R} arr[k] = P[R + 1] - P[L]$$

### 2. Difference Array (Fast Range Updates)
When an algorithm requires many batch range updates ($k$ queries of adding $x$ to all indices in range $[L, R]$), updating every element naively costs $O(k \times n)$.
A difference array $D$, where $D[0] = arr[0]$ and $D[i] = arr[i] - arr[i - 1]$, enables $O(1)$ updates:
$$D[L] \leftarrow D[L] + x$$
$$D[R + 1] \leftarrow D[R + 1] - x \quad (\text{if } R + 1 < n)$$
After all batch updates, a single $O(n)$ prefix sum scan recovers the modified array.

## Step-by-Step Walkthrough

### Example: Range Sum with Prefix Sum
Let `arr = [3, 1, 4, 1, 5]`.
1. Compute prefix array:
   - `P[0] = 0`
   - `P[1] = 0 + 3 = 3`
   - `P[2] = 3 + 1 = 4`
   - `P[3] = 4 + 4 = 8`
   - `P[4] = 8 + 1 = 9`
   - `P[5] = 9 + 5 = 14`
   $\implies P = [0, 3, 4, 8, 9, 14]$.
2. Query sum of range $[1, 3]$ (`1 + 4 + 1 = 6`):
   $\text{Sum} = P[3 + 1] - P[1] = P[4] - P[1] = 9 - 3 = 6$. Instant $O(1)$ answer!

### Example: Range Update with Difference Array
Initial array: `[0, 0, 0, 0, 0]`. Difference array `D = [0, 0, 0, 0, 0, 0]`.
1. Add `+3` on range `[1, 3]`:
   - `D[1] += 3`
   - `D[4] -= 3`
   $\implies D = [0, 3, 0, 0, -3, 0]$.
2. Add `+2` on range `[2, 4]`:
   - `D[2] += 2`
   - `D[5] -= 2`
   $\implies D = [0, 3, 2, 0, -3, -2]$.
3. Compute running prefix sums to reconstruct:
   `[0, 3, 5, 5, 2]`. Correct!

## Python Code

```python
class PrefixSum:
    """Precomputes 1D prefix sums for O(1) range queries."""

    def __init__(self, nums: list[int]) -> None:
        self.prefix: list[int] = [0] * (len(nums) + 1)
        for i, val in enumerate(nums):
            self.prefix[i + 1] = self.prefix[i] + val

    def query(self, left: int, right: int) -> int:
        """Returns sum of elements in inclusive range [left, right]."""
        return self.prefix[right + 1] - self.prefix[left]


class DifferenceArray:
    """Supports O(1) range additions and O(n) total reconstruction."""

    def __init__(self, n: int) -> None:
        self.n: int = n
        self.diff: list[int] = [0] * (n + 1)

    def add_range(self, left: int, right: int, val: int) -> None:
        """Adds val to all elements in range [left, right] in O(1) time."""
        self.diff[left] += val
        if right + 1 < self.n:
            self.diff[right + 1] -= val

    def build(self) -> list[int]:
        """Reconstructs the final array via cumulative prefix sum in O(n)."""
        result: list[int] = [0] * self.n
        current = 0
        for i in range(self.n):
            current += self.diff[i]
            result[i] = current
        return result
```

## Complexity Table

| Technique | Preprocessing | Query / Update | Total for $Q$ operations |
|---|---|---|---|
| Naive Range Sum | $O(1)$ | $O(n)$ per query | $O(Q \times n)$ |
| Prefix Sum (Queries) | $O(n)$ time, $O(n)$ space | $O(1)$ per query | $O(n + Q)$ |
| Naive Range Addition | $O(1)$ | $O(n)$ per update | $O(Q \times n)$ |
| Difference Array (Updates) | $O(n)$ init | $O(1)$ per update, $O(n)$ build | $O(n + Q)$ |

## When to Use and Avoid

| When to Use | When to Avoid |
|---|---|
| Static array with many range sum queries | Dynamic arrays with frequent element updates interleaved with queries (use a Fenwick Tree or Segment Tree instead) |
| Multiple batch range modifications applied before reading final state | Online interactive queries where you need immediate array state after each mutation |
| Counting occurrences of subarrays matching a target sum via HashMap | Memory-constrained environments where creating an auxiliary $O(n)$ array is unacceptable |
