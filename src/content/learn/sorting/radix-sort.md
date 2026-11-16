---
title: "Radix Sort"
topic: "sorting"
order: 8
difficulty: "advanced"
timeComplexity: "O(d · (n + k))"
spaceComplexity: "O(n + k)"
tags: ["sorting", "non-comparison", "linear-time", "radix", "counting-sort"]
---

## What is Radix Sort?

Imagine sorting a stack of 10,000 library check-out slips by their 4-digit date code.
Instead of comparing cards pairwise—which would take millions of comparisons—you could sort them into 10 bins based only on the **last digit** (day), restack them in order, sort them again by the **middle digits** (month), and finally sort them by the **first digits** (year).

Because each binning step preserves the order from the previous step (it is **stable**), the entire stack ends up completely sorted after just 4 passes!
This is **Radix Sort**: a non-comparison integer sorting algorithm that processes numbers digit by digit.

## Core Concept

Radix Sort avoids comparisons altogether by sorting keys digit by digit from least significant digit (LSD) to most significant digit (MSD) or vice-versa.

Key principles:
1. **LSD vs. MSD**: Least Significant Digit (LSD) is the most common variant. It starts at the 1s place, proceeds to 10s, 100s, etc.
2. **Stable Subroutine**: For LSD Radix Sort to work, the algorithm used to sort each digit position **must be stable** (elements with equal keys maintain their relative order). **Counting Sort** is almost universally used as this inner subroutine because digits have a small, fixed range (e.g., base 10 has digits $0..9$; base 256 has bytes $0..255$).
3. **Number of Passes ($d$)**: The outer loop runs $d$ times, where $d$ is the number of digits in the maximum value ($\lfloor \log_b(\max) \rfloor + 1$).

## Walkthrough

Let's sort `[170, 45, 75, 90, 802, 24, 2, 66]`.
The maximum number is `802`, which has $d = 3$ digits in base 10.

```
Initial Array: [170, 045, 075, 090, 802, 024, 002, 066]

Pass 1 (1s place: exp = 1):
  Bucket by digit % 10:
  Digit 0: 170, 090
  Digit 2: 802, 002
  Digit 4: 024
  Digit 5: 045, 075
  Digit 6: 066
  Flattened: [170, 090, 802, 002, 024, 045, 075, 066]

Pass 2 (10s place: exp = 10):
  Bucket by (digit // 10) % 10:
  Digit 0: 802, 002
  Digit 2: 024
  Digit 4: 045
  Digit 6: 066
  Digit 7: 170, 075
  Digit 9: 090
  Flattened: [802, 002, 024, 045, 066, 170, 075, 090]

Pass 3 (100s place: exp = 100):
  Bucket by (digit // 100) % 10:
  Digit 0: 002, 024, 045, 066, 075, 090
  Digit 1: 170
  Digit 8: 802
  Flattened: [2, 24, 45, 66, 75, 90, 170, 802] (Fully Sorted!)
```

## Python Code

```python
def counting_sort_by_digit(arr: list[int], exp: int) -> None:
    """Stable counting sort subroutine that sorts arr according to digit at (arr[i] // exp) % 10."""
    n = len(arr)
    output = [0] * n
    count = [0] * 10

    # Count occurrences of each digit
    for x in arr:
        digit = (x // exp) % 10
        count[digit] += 1

    # Compute prefix sums so count[i] holds the output index
    for i in range(1, 10):
        count[i] += count[i - 1]

    # Build output array in reverse order to ensure stability
    for i in range(n - 1, -1, -1):
        digit = (arr[i] // exp) % 10
        output[count[digit] - 1] = arr[i]
        count[digit] -= 1

    # Copy sorted elements back into original array
    for i in range(n):
        arr[i] = output[i]


def radix_sort(arr: list[int]) -> list[int]:
    """Sorts non-negative integers using LSD Radix Sort."""
    if not arr:
        return arr

    # Find the maximum number to determine number of digits
    max_val = max(arr)

    # Run counting sort for every digit position: 1, 10, 100, ...
    exp = 1
    while max_val // exp > 0:
        counting_sort_by_digit(arr, exp)
        exp *= 10

    return arr
```

## Complexity

| Case | Time | Space | Why? |
|---|---|---|---|
| Best | `O(d · (n + k))` | `O(n + k)` | $d$ passes of counting sort over $n$ elements with base $k = 10$ |
| Average | `O(d · (n + k))` | `O(n + k)` | Unaffected by initial distribution; always performs $d$ passes |
| Worst | `O(d · (n + k))` | `O(n + k)` | When max element has large $d$, runtime is linear in $d \cdot n$ |

*Note: In computer architecture, keys are often sorted base $2^{16}$ or base $256$, where $k = 256$ and $d \le 4$ or $8$, achieving true $O(n)$ wall-clock throughput on 32-bit and 64-bit integers.*

## When to Use

| Great for | Avoid for |
|---|---|
| Fixed-width integer arrays (e.g. 32-bit or 64-bit IDs, timestamps) | Floating-point numbers with arbitrary precision or exponents |
| Sorting strings of uniform length (e.g. zip codes, hashes) | Numbers with massive value ranges where $d \gg \log n$ |
| Scenarios where $O(n \log n)$ comparison bound is too slow | Memory-constrained systems where allocating auxiliary $O(n)$ buffers is prohibited |
