---
title: "XOR Properties & Applications"
topic: "bit-manipulation"
order: 3
difficulty: "intermediate"
timeComplexity: "O(n)"
spaceComplexity: "O(1)"
tags: ["bit-manipulation", "xor", "single-number", "bitwise-tricks", "parity"]
---

## Intuition & Analogy

Imagine a push-button light switch in a dark hallway.
- Push it once $\to$ The light turns **ON**.
- Push it a second time $\to$ The light turns **OFF**.
- Push it any **even** number of times $\to$ The light is always **OFF**.
- Push it an **odd** number of times $\to$ The light is always **ON**.

Now imagine a room where 100 people enter. 99 people push the button twice, but one mysterious guest pushes it only once. When you examine the light at the end, the light is ON, and its state uniquely reveals the action of that lone guest!
Every duplicate cancels itself out completely. That is the magic of **XOR**.

## Core Concept

The bitwise XOR operator ($\oplus$, `^`) satisfies four foundational mathematical laws:

1. **Identity Law**:
   $$x \oplus 0 = x$$
2. **Self-Inverse Law**:
   $$x \oplus x = 0$$
3. **Commutative Law**:
   $$a \oplus b = b \oplus a$$
4. **Associative Law**:
   $$(a \oplus b) \oplus c = a \oplus (b \oplus c)$$

Because XOR is commutative and associative, elements in a stream can be XORed in **any arbitrary order**. Every pair of identical numbers cancels into zero ($x \oplus x = 0$), leaving only elements with odd frequencies!

### Applications
- **Single Number I**: An array where every element appears twice except one $\implies$ XORing all numbers leaves the unique element in $O(n)$ time and $O(1)$ space.
- **Single Number III (Two Unique Numbers)**: If two unique numbers $A$ and $B$ exist, XORing all elements yields $X = A \oplus B$. Since $A \ne B$, $X$ has at least one bit set. Isolating that bit allows partitioning the array into two subsets where $A$ and $B$ fall into separate groups!

## Step-by-Step Walkthrough

Find the single unique number in `[4, 1, 2, 1, 2]`:

1. Start accumulator `res = 0`.
2. Group and reorder thanks to commutativity:
   $$\text{res} = 0 \oplus 4 \oplus 1 \oplus 2 \oplus 1 \oplus 2$$
   $$= 4 \oplus (1 \oplus 1) \oplus (2 \oplus 2)$$
3. Pairs cancel:
   $$1 \oplus 1 = 0$$
   $$2 \oplus 2 = 0$$
4. Identity law:
   $$\text{res} = 4 \oplus 0 \oplus 0 = 4$$

The answer is **4**, found in a single pass without using any Hash Sets or extra memory!

## Python Code

```python
def single_number(nums: list[int]) -> int:
    """Finds the element that appears once where all other elements appear twice."""
    unique = 0
    for num in nums:
        unique ^= num
    return unique


def find_missing_number(nums: list[int]) -> int:
    """Finds missing number in an array containing n distinct numbers in range [0, n]."""
    n = len(nums)
    missing = 0

    # XOR all expected numbers [0..n]
    for i in range(n + 1):
        missing ^= i

    # XOR with actual elements in array
    for num in nums:
        missing ^= num

    return missing


def single_number_two_uniques(nums: list[int]) -> tuple[int, int]:
    """Finds two elements that appear once where every other element appears twice."""
    # Step 1: XOR all numbers to get A ^ B
    xor_all = 0
    for num in nums:
        xor_all ^= num

    # Step 2: Find any bit where A and B differ (lowest set bit)
    diff_bit = xor_all & -xor_all

    # Step 3: Divide numbers into two groups and XOR each group
    a = 0
    b = 0
    for num in nums:
        if num & diff_bit:
            a ^= num
        else:
            b ^= num

    return a, b
```

## Complexity Table

| Algorithm | Time Complexity | Space Complexity | Conventional Alternative |
|---|---|---|---|
| Single Number (1 unique) | $O(n)$ | $O(1)$ | Hash Set ($O(n)$ space) or Sorting ($O(n \log n)$) |
| Missing Number in $[0..n]$ | $O(n)$ | $O(1)$ | Gauss formula $(n(n+1)/2 - \text{sum})$ (prone to integer overflow in C/Java) |
| Single Number (2 uniques) | $O(n)$ | $O(1)$ | Hash Map ($O(n)$ space) |
| In-place variable swap (`a^=b; b^=a; a^=b`) | $O(1)$ | $O(1)$ | Temporary variable `tmp` (note: `tmp` is preferred in production) |

## When to Use and Avoid

| When to Use | When to Avoid |
|---|---|
| Finding elements with odd frequencies when all others appear an even number of times | When elements appear 3 or more times (requires counting bits modulo 3 rather than pure XOR) |
| Guaranteeing strict $O(1)$ memory without allocations in constrained embedded environments | Floating point or string types |
| Preventing integer overflow when summing series | Variable swap tricks on pointers or aliased memory references (`a` and `b` pointing to same memory address clears to 0!) |
