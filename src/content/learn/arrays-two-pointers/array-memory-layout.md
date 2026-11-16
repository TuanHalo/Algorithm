---
title: "Array Memory Layout & Pointer Arithmetic"
topic: "arrays-two-pointers"
order: 1
difficulty: "beginner"
timeComplexity: "O(1) access, O(n) insert/delete"
spaceComplexity: "O(n)"
tags: ["arrays", "memory", "cache-locality", "pointers", "dynamic-array"]
---

## Intuition & Analogy

Imagine a row of numbered lockers along a straight school hallway. Because every locker is identical in width and situated directly beside the next, you do not need to walk past every locker to find locker #42. If locker #0 starts at the entrance and each locker is 2 feet wide, you calculate the exact position instantly: `entrance + 42 × 2 feet`.

An array functions in computer memory exactly like those lockers. The hardware places all elements in a single contiguous block of physical RAM, enabling instant mathematical indexing without traversing prior items.

## Core Concept

The foundational power of an array stems from **contiguous memory allocation**:

1. **Direct Address Calculation**:
   $$\text{Address}(arr[i]) = \text{Base Address} + i \times \text{Size of Element}$$
   Because the arithmetic evaluates in a couple of CPU clock cycles, reading or writing to `arr[i]` requires strictly $O(1)$ time.

2. **Spatial Locality & CPU Caches**:
   Modern CPUs fetch data in chunks called **cache lines** (typically 64 bytes). Reading `arr[0]` automatically loads subsequent elements (`arr[1]`, `arr[2]`, etc.) into fast L1/L2 cache, making sequential iterations over arrays drastically faster than traversing linked pointers scattered throughout RAM.

3. **Static vs. Dynamic Arrays**:
   - *Static Arrays*: Fixed capacity declared upfront (e.g., standard C arrays).
   - *Dynamic Arrays*: Backed by a static array that dynamically allocates double the capacity whenever full, providing amortized $O(1)$ appends despite the occasional $O(n)$ copy.

## Step-by-Step Walkthrough

Consider appending elements into a dynamic array of initial capacity 2:

1. Insert `10` $\to$ Capacity 2, Size 1: `[10, _]` (Cost: 1 op)
2. Insert `20` $\to$ Capacity 2, Size 2: `[10, 20]` (Cost: 1 op)
3. Insert `30` $\to$ Array is full. Allocate new block of capacity 4, copy `[10, 20]`, insert `30`:
   `[10, 20, 30, _]` (Cost: 2 copies + 1 insert = 3 ops)
4. Insert `40` $\to$ Capacity 4, Size 4: `[10, 20, 30, 40]` (Cost: 1 op)

Over $n$ total appends, resizing occurs at powers of 2 ($1 + 2 + 4 + \dots + n \approx 2n$ total copies), yielding an **amortized cost of $O(1)$ per append**.

## Python Code

```python
from typing import Generic, Optional, TypeVar

T = TypeVar("T")


class DynamicArray(Generic[T]):
    """A minimal dynamic array demonstrating contiguous memory simulation

    and geometric doubling resize.
    """

    def __init__(self, capacity: int = 2) -> None:
        self._capacity: int = max(1, capacity)
        self._size: int = 0
        self._data: list[Optional[T]] = [None] * self._capacity

    def __len__(self) -> int:
        return self._size

    def __getitem__(self, index: int) -> T:
        if not (0 <= index < self._size):
            raise IndexError("Array index out of bounds")
        val = self._data[index]
        assert val is not None
        return val

    def __setitem__(self, index: int, value: T) -> None:
        if not (0 <= index < self._size):
            raise IndexError("Array index out of bounds")
        self._data[index] = value

    def append(self, value: T) -> None:
        """Appends value in amortized O(1) time, doubling capacity when full."""
        if self._size == self._capacity:
            self._resize(self._capacity * 2)
        self._data[self._size] = value
        self._size += 1

    def insert(self, index: int, value: T) -> None:
        """Inserts value at index, shifting subsequent elements to the right."""
        if not (0 <= index <= self._size):
            raise IndexError("Insert index out of bounds")
        if self._size == self._capacity:
            self._resize(self._capacity * 2)

        # Shift elements rightward from end to index
        for i in range(self._size, index, -1):
            self._data[i] = self._data[i - 1]

        self._data[index] = value
        self._size += 1

    def _resize(self, new_capacity: int) -> None:
        new_data: list[Optional[T]] = [None] * new_capacity
        for i in range(self._size):
            new_data[i] = self._data[i]
        self._data = new_data
        self._capacity = new_capacity
```

## Complexity Table

| Operation | Time Complexity | Space Complexity | Explanation |
|---|---|---|---|
| Random Access (`arr[i]`) | $O(1)$ | $O(1)$ | Single arithmetic offset computation |
| Append (amortized) | $O(1)$ | $O(1)$ auxiliary | Geometric doubling amortizes copying |
| Append (worst-case resize) | $O(n)$ | $O(n)$ | Allocating new buffer and copying all items |
| Insertion / Deletion at index $k$ | $O(n)$ | $O(1)$ | Must shift $(n - k)$ elements sequentially |
| Linear Search | $O(n)$ | $O(1)$ | Unsorted lookup visits elements until match |

## When to Use and Avoid

| When to Use | When to Avoid |
|---|---|
| Frequent random reads by numerical index | Frequent insertions or deletions at the beginning or middle |
| Iterating over millions of items where cache-locality maximizes throughput | Unknown scale where memory reallocation re-copies cannot be tolerated |
| Fixed or predictable collection sizes | Scenarios requiring guaranteed strict $O(1)$ worst-case insertion times |
