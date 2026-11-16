---
title: "Fast & Slow Pointers (Same Direction)"
topic: "arrays-two-pointers"
order: 4
difficulty: "beginner"
timeComplexity: "O(n)"
spaceComplexity: "O(1)"
tags: ["two-pointers", "fast-slow", "floyd", "cycle-detection", "in-place", "read-write"]
---

## Intuition & Analogy

Imagine a proofreader editing a rough draft in real time. The proofreader has two bookmarks: a **reading cursor** (fast) skimming across every single word, and a **pen tip** (slow) writing only the polished, non-duplicate words onto a clean section of the paper. As junk words appear, the reader skips past them, while the pen stays stationary until the reader finds the next worthy word to copy over.

In another scenario—the classic fable of the Tortoise and the Hare—if two runners circle a closed track at speeds of 1 lap/min and 2 laps/min, the faster runner will eventually lap the slower runner from behind. This exact principle detects loops and cycles in structures without using any extra memory.

## Core Concept

Same-direction two pointers typically operate in one of two paradigms:

### 1. Reader-Writer Pointers (In-Place Array Compaction)
- `fast` (Reader): Scans through every element from index $0$ to $n-1$.
- `slow` (Writer): Points to the index where the next valid element should be placed.
- Whenever `fast` points to an element meeting retention criteria (e.g., non-zero, unique), we write `arr[slow] = arr[fast]` and increment `slow`.
- Accomplishes complex filtering in $O(n)$ time with $O(1)$ memory.

### 2. Floyd's Cycle Detection (Tortoise and Hare)
- `slow` steps 1 unit forward: `slow = f(slow)`
- `fast` steps 2 units forward: `fast = f(f(fast))`
- If there is a cycle, `fast` enters the loop and steadily closes the gap by 1 step per iteration, guaranteeing a collision within the cycle length.

## Step-by-Step Walkthrough

### Example: Remove Duplicates from Sorted Array `[1, 1, 2, 2, 3]`
Goal: Retain unique elements in-place and return the count.

1. **Start**: `slow = 0`, `fast = 1`.
2. `arr[fast] == arr[slow]` (`1 == 1`): Duplicate detected. Advance `fast = 2`.
3. `arr[fast] != arr[slow]` (`2 != 1`): New unique value found!
   - Advance `slow = 1`.
   - Write: `arr[slow] = arr[fast]` $\implies arr[1] = 2$.
   - Array becomes: `[1, 2, 2, 2, 3]`. Advance `fast = 3`.
4. `arr[fast] == arr[slow]` (`2 == 2`): Duplicate. Advance `fast = 4`.
5. `arr[fast] != arr[slow]` (`3 != 2`): New unique value!
   - Advance `slow = 2`.
   - Write: `arr[slow] = arr[fast]` $\implies arr[2] = 3$.
   - Array becomes: `[1, 2, 3, 2, 3]`. `fast` reaches end.
6. Return length `slow + 1 = 3`. The first 3 elements `[1, 2, 3]` are unique!

## Python Code

```python
def remove_duplicates(nums: list[int]) -> int:
    """Removes duplicates from a sorted list in-place.

    Returns the count of unique elements.
    """
    if not nums:
        return 0

    slow = 0
    for fast in range(1, len(nums)):
        if nums[fast] != nums[slow]:
            slow += 1
            nums[slow] = nums[fast]

    return slow + 1


def move_zeroes(nums: list[int]) -> None:
    """Moves all zeroes to the end while maintaining relative order of non-zeroes."""
    slow = 0  # Where the next non-zero belongs

    for fast in range(len(nums)):
        if nums[fast] != 0:
            nums[slow], nums[fast] = nums[fast], nums[slow]
            slow += 1


def find_duplicate(nums: list[int]) -> int:
    """Finds the duplicate number in an array of n + 1 integers where

    each integer is between 1 and n inclusive (Floyd's Cycle Algorithm).
    """
    # Phase 1: Detect cycle intersection
    slow = nums[0]
    fast = nums[0]

    while True:
        slow = nums[slow]
        fast = nums[nums[fast]]
        if slow == fast:
            break

    # Phase 2: Find entrance to cycle
    ptr1 = nums[0]
    ptr2 = slow
    while ptr1 != ptr2:
        ptr1 = nums[ptr1]
        ptr2 = nums[ptr2]

    return ptr1
```

## Complexity Table

| Algorithm | Time Complexity | Space Complexity | Why? |
|---|---|---|---|
| Remove Duplicates | $O(n)$ | $O(1)$ | `fast` visits each index once, `slow` never exceeds `fast` |
| Move Zeroes | $O(n)$ | $O(1)$ | Single pass swap sequence |
| Floyd's Cycle (Array Graph) | $O(n)$ | $O(1)$ | Cycle detection takes at most $2n$ steps |

## When to Use and Avoid

| When to Use | When to Avoid |
|---|---|
| In-place array mutation with strict $O(1)$ memory requirements | When the original array order must remain unmodified (use filtering/generators) |
| Removing or shifting specific target values (zeroes, duplicates, sentinels) | Multi-dimensional matrix filtering requiring simultaneous row/col shifts |
| Cycle detection in linked lists or functional value mappings | When element access time is variable or costly (e.g. disk-based sequential files) |
