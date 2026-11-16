---
title: "Bitmask Dynamic Programming & Subset Iteration"
topic: "bit-manipulation"
order: 4
difficulty: "intermediate"
timeComplexity: "O(n * 2^n) subsets, O(3^n) submask iteration"
spaceComplexity: "O(2^n) or O(1)"
tags: ["bitmask", "subsets", "combinatorics", "state-compression", "traveling-salesperson"]
---

## Intuition & Analogy

Imagine packing for a hiking trip with $N$ gear items.
Instead of maintaining a bulky list of string names, you write down an $N$-bit number. If bit $k$ is **1**, item $k$ is placed into your backpack; if **0**, it stays home.
- Mask `000` ($0$): Empty backpack.
- Mask `001` ($1$): Only item 0 packed.
- Mask `101` ($5$): Items 0 and 2 packed.
- Mask `111` ($7$): All items packed.

By simply counting from $0$ up to $2^N - 1$, an integer acts as a lightning-fast mathematical set!

## Core Concept

A **bitmask** uses the binary bits of an integer to represent a mathematical set over a universe of size $N \le 30$:
- Element $k \in S \iff (mask \gg k) \ \& \ 1 == 1$
- Set Union $S_1 \cup S_2$: `mask1 | mask2`
- Set Intersection $S_1 \cap S_2$: `mask1 & mask2`
- Set Difference $S_1 \setminus S_2$: `mask1 & ~mask2`

### 1. Generating the Power Set
There are $2^N$ total subsets. We can iterate over every possible subset by running a simple loop from `0` to `(1 << N) - 1`.

### 2. Efficient Submask Iteration in $O(3^N)$
To iterate over all submasks of a given `mask` without checking irrelevant numbers:
```python
submask = mask
while submask > 0:
    # Process submask...
    submask = (submask - 1) & mask
```
Iterating over all submasks for all masks takes $\sum_{k=0}^N \binom{N}{k} 2^k = (1 + 2)^N = \mathbf{O(3^N)}$ time, drastically faster than naive $O(4^N)$.

### 3. State Compression in Dynamic Programming
In problems like the Traveling Salesperson Problem (TSP) or job assignment, the visited set of nodes is compressed into `mask`, transforming an exponential state space into a manageable DP table:
$$\text{dp}[\text{mask}][\text{node}] = \text{minimum cost to visit set represented by mask ending at node}$$

## Step-by-Step Walkthrough

Generate all subsets of items `['A', 'B', 'C']` ($N = 3$, masks $0$ through $7$):

| Mask (Dec) | Mask (Binary) | Bits Set | Subset Formed |
|---|---|---|---|
| 0 | `000` | None | `[]` (Empty set) |
| 1 | `001` | Bit 0 | `['A']` |
| 2 | `010` | Bit 1 | `['B']` |
| 3 | `011` | Bits 0, 1 | `['A', 'B']` |
| 4 | `100` | Bit 2 | `['C']` |
| 5 | `101` | Bits 0, 2 | `['A', 'C']` |
| 6 | `110` | Bits 1, 2 | `['B', 'C']` |
| 7 | `111` | Bits 0, 1, 2 | `['A', 'B', 'C']` |

Total: Exactly $2^3 = 8$ subsets enumerated systematically.

## Python Code

```python
from typing import TypeVar

T = TypeVar("T")


def generate_subsets_bitmask(elements: list[T]) -> list[list[T]]:
    """Generates all 2^n subsets of elements using bitmasks."""
    n = len(elements)
    total_subsets = 1 << n  # 2^n
    subsets: list[list[T]] = []

    for mask in range(total_subsets):
        current_subset: list[T] = []
        for i in range(n):
            if (mask >> i) & 1:
                current_subset.append(elements[i])
        subsets.append(current_subset)

    return subsets


def iterate_submasks(mask: int) -> list[int]:
    """Iterates through all non-empty submasks of mask in descending order."""
    submasks: list[int] = []
    sub = mask
    while sub > 0:
        submasks.append(sub)
        sub = (sub - 1) & mask
    submasks.append(0)  # Include empty set
    return submasks


def tsp_bitmask_memo(dist_matrix: list[list[int]]) -> int:
    """Solves Traveling Salesperson Problem (TSP) using Bitmask DP in O(n^2 * 2^n) time."""
    n = len(dist_matrix)
    memo: dict[tuple[int, int], int] = {}

    def dp(mask: int, u: int) -> int:
        # Base case: All cities visited, return cost to return to start (city 0)
        if mask == (1 << n) - 1:
            return dist_matrix[u][0]

        state = (mask, u)
        if state in memo:
            return memo[state]

        min_cost = float("inf")
        for v in range(n):
            if not ((mask >> v) & 1):  # If city v is unvisited
                cost = dist_matrix[u][v] + dp(mask | (1 << v), v)
                if cost < min_cost:
                    min_cost = cost

        memo[state] = int(min_cost)
        return int(min_cost)

    return dp(1, 0)  # Start at city 0 with mask 1 (city 0 visited)
```

## Complexity Table

| Pattern | Time Complexity | Space Complexity | Practical Size Limit |
|---|---|---|---|
| Power Set Generation | $O(n \cdot 2^n)$ | $O(1)$ auxiliary | $n \le 20$ (1M states) |
| All Submasks of All Masks | $O(3^n)$ | $O(1)$ auxiliary | $n \le 15$ (14M states) |
| Bitmask DP (TSP) | $O(n^2 \cdot 2^n)$ | $O(n \cdot 2^n)$ | $n \le 18$ to $20$ |

## When to Use and Avoid

| When to Use | When to Avoid |
|---|---|
| Combinatorial optimization where input size is small ($n \le 20$) | Problems where $n > 25$ ($2^{25} \approx 3.3 \times 10^7$, causing exponential TLE / MLE) |
| Tracking subsets or visited nodes as hashable, primitive keys for memoization | Problems that exhibit greedy substructure or matroid properties solvable in polynomial time |
| Fast set operations (unions, intersections, symmetric differences) | When subset membership is sparse or exceeds 64 elements (use `bitarray` or `set`) |
