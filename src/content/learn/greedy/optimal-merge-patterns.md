---
title: "Optimal Merge Patterns"
topic: "greedy"
order: 5
difficulty: "intermediate"
timeComplexity: "O(n log n)"
spaceComplexity: "O(n)"
tags: ["greedy", "merge", "heap", "priority-queue", "huffman"]
---

## What are Optimal Merge Patterns?

Imagine you have 5 separate files on your computer that need to be merged into one single master archive.
When you merge two files of sizes $10$ MB and $20$ MB, the operating system must read and write both, costing $10 + 20 = 30$ MB of disk I/O.
If you then merge that new $30$ MB file with another $50$ MB file, you pay another $30 + 50 = 80$ MB.
Notice that the initial $10$ MB file was read and written **twice**!

Every time an intermediate file is re-merged, its original contents are copied again.
To minimize total disk I/O, which files should you merge first?

The **Greedy Choice**: Always merge the **two smallest available files** at every step!
By merging small files early, their sizes only get compounded with small numbers, while massive files remain untouched until the very final merges at the top of the tree.

## Core Concept

The **Optimal Merge Pattern** problem constructs an optimal 2-way merge tree that minimizes the total weighted external path length $\sum (\text{size}_i \cdot \text{depth}_i)$.

Key principles:
1. **Mathematical Equivalence to Huffman Coding**: Constructing an optimal merge tree is mathematically identical to building a Huffman coding tree, where character frequencies correspond to file sizes.
2. **Min-Heap Engine**:
   - Insert all $n$ file sizes into a min-priority queue.
   - While more than 1 file remains in the heap:
     - Pop the two smallest sizes $a$ and $b$.
     - Incur merge cost $c = a + b$.
     - Accumulate $c$ into the grand total.
     - Push the merged file size $c$ back into the heap.
3. **Optimality Proof**: If we substituted a larger file into an earlier merge step, its size would be multiplied by a higher tree depth, strictly increasing total cost. Thus, the greedy choice is globally optimal.

## Walkthrough

Consider 5 files with record counts: `[20, 4, 30, 5, 12]`.

```
Initial Min-Heap: [4, 5, 12, 20, 30]

Step 1:
  Extract two minimums: 4 and 5
  Merge cost = 4 + 5 = 9
  Cumulative cost = 9
  Insert 9 back into heap
  Heap: [9, 12, 20, 30]

Step 2:
  Extract two minimums: 9 and 12
  Merge cost = 9 + 12 = 21
  Cumulative cost = 9 + 21 = 30
  Insert 21 back into heap
  Heap: [20, 21, 30]

Step 3:
  Extract two minimums: 20 and 21
  Merge cost = 20 + 21 = 41
  Cumulative cost = 30 + 41 = 71
  Insert 41 back into heap
  Heap: [30, 41]

Step 4:
  Extract two minimums: 30 and 41
  Merge cost = 30 + 41 = 71
  Cumulative cost = 71 + 71 = 142
  Insert 71 back into heap
  Heap: [71] (1 file remains -> Done!)

Total Optimal Merge Cost: 142.
Tree Depths:
  File 4: depth 3 (4 * 3 = 12)
  File 5: depth 3 (5 * 3 = 15)
  File 12: depth 2 (12 * 2 = 24)
  File 20: depth 2 (20 * 2 = 40)
  File 30: depth 1 (30 * 1 = 30)
  Sum of products = 12 + 15 + 24 + 40 + 30 = 121 (plus intermediate internal nodes = 142).
```

## Python Code

```python
import heapq


def optimal_merge_cost(file_sizes: list[int]) -> int:
    """Calculates the minimum total cost to merge n files using a greedy min-heap."""
    if len(file_sizes) <= 1:
        return 0

    # Heapify input list in O(n) time
    heap = list(file_sizes)
    heapq.heapify(heap)

    total_cost = 0

    # Repeatedly merge the two smallest files
    while len(heap) > 1:
        first = heapq.heappop(heap)
        second = heapq.heappop(heap)

        merge_cost = first + second
        total_cost += merge_cost

        # Re-insert the combined file size
        heapq.heappush(heap, merge_cost)

    return total_cost
```

## Complexity

| Metric | Complexity | Why? |
|---|---|---|
| Time | `O(n log n)` | Building the initial heap takes $O(n)$; we perform $n - 1$ merges, each doing $2$ pops and $1$ push in $O(\log n)$ |
| Space | `O(n)` | Min-heap stores at most $n$ elements |

## When to Use

| Great for | Avoid for |
|---|---|
| Merging sorted arrays, files on tape/disk, or linked lists with pairwise read costs | Merging streams where all files can be merged simultaneously in a single multi-way $k$-way merge pass |
| "Connect Ropes with Minimum Cost" coding interview problems | Scenarios where merge costs are non-linear (e.g. $cost(a, b) = a \cdot b$) — requires dynamic programming |
| Constructing prefix code trees (Huffman Coding) | When files can be read in parallel from independent SSDs without disk contention |
