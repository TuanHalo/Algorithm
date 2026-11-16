---
title: "String Representation & Immutability"
topic: "strings"
order: 1
difficulty: "beginner"
timeComplexity: "O(1) access, O(n) copy/concat"
spaceComplexity: "O(n)"
tags: ["strings", "immutability", "encoding", "unicode", "string-builder"]
---

## Intuition & Analogy

Imagine writing a story on a stone tablet versus writing on a dry-erase whiteboard.
On a whiteboard, erasing and replacing one letter in a sentence takes a microsecond. But on a stone tablet, every character is permanently etched into granite. If you want to change one single letter on line 50, you cannot edit the existing slab; you must take a brand-new blank slab, re-carve the first 49 lines, carve the revised letter, and re-carve everything that follows.

In languages like Python, Java, and JavaScript, strings are **stone tablets** (immutable). Understanding why they are designed this way—and how to avoid the quadratic re-carving trap—is essential for writing fast code.

## Core Concept

### 1. Memory Representation & Encodings
- **ASCII**: Uses 7 bits (0–127) for basic English letters and symbols.
- **Unicode**: Assigns a unique code point (e.g., `U+0041` for `'A'`) to every character in every human writing system and emoji.
- **UTF-8**: A variable-length encoding (1 to 4 bytes per character). Python internally optimizes string storage (using 1 byte for Latin-1, 2 for UCS-2, or 4 for UCS-4) so indexing `s[i]` remains $O(1)$.

### 2. Why Are Strings Immutable?
1. **Thread Safety & Security**: Multiple threads can read the same string simultaneously without locks or race conditions. Sensitive values like URLs, file paths, and passwords cannot be tampered with once created.
2. **Hashability**: Because a string cannot change, its hash value is computed once and cached. This allows strings to safely serve as dictionary keys and set elements.
3. **Interning**: The runtime deduplicates identical string literals into a single shared memory location.

### 3. The $O(n^2)$ Concatenation Trap
Repeatedly running `s += char` inside a loop of size $n$ creates $n$ temporary string copies of lengths $1, 2, 3, \dots, n$:
$$\text{Total Copies} = 1 + 2 + \dots + n = \frac{n(n + 1)}{2} \implies O(n^2) \text{ time}$$
Instead, appending characters to a dynamic list and calling `"".join(list)` runs in **strictly $O(n)$ linear time**.

## Step-by-Step Walkthrough

### Comparing Inefficient vs Efficient String Assembly
Goal: Build a string of length $n = 5$ with character `'x'`.

**Method A (Repeated `+` Concat)**:
- Iteration 1: Allocates new string `"x"` (1 byte copy)
- Iteration 2: Allocates new string `"xx"` (2 byte copy)
- Iteration 3: Allocates new string `"xxx"` (3 byte copy)
- Iteration 4: Allocates new string `"xxxx"` (4 byte copy)
- Iteration 5: Allocates new string `"xxxxx"` (5 byte copy)
- Total work: $1 + 2 + 3 + 4 + 5 = 15$ operations. At $n = 100,000$, this performs $5,000,000,000$ operations and crawls to a halt.

**Method B (List Buffer + `"".join()`)**:
- Append 5 times to list: Amortized $O(1)$ each $\implies 5$ operations.
- `"".join()`: Measures total length upfront, allocates exactly one memory block of 5 bytes, and copies characters in a single bulk pass $\implies 5$ operations.
- Total work: $10$ operations ($O(n)$).

## Python Code

```python
import time


def bad_concatenation(n: int) -> str:
    """Inefficient O(n^2) string assembly using repeated '+' operators."""
    result = ""
    for _ in range(n):
        result += "a"  # Creates a new string on every iteration!
    return result


def good_concatenation(n: int) -> str:
    """Optimal O(n) string assembly using a mutable list buffer and join."""
    buffer: list[str] = []
    for _ in range(n):
        buffer.append("a")  # Amortized O(1) append
    return "".join(buffer)  # Single linear allocation


class StringBuilder:
    """A minimal StringBuilder pattern simulating mutable string buffers."""

    def __init__(self) -> None:
        self._chars: list[str] = []

    def append(self, text: str) -> "StringBuilder":
        self._chars.append(text)
        return self

    def to_string(self) -> str:
        return "".join(self._chars)

    def __len__(self) -> int:
        return sum(len(chunk) for chunk in self._chars)
```

## Complexity Table

| Operation | Inefficient (`+` operator) | Efficient (`list.append` + `join`) | Explanation |
|---|---|---|---|
| Building string of length $n$ | $O(n^2)$ time, $O(n^2)$ allocs | $O(n)$ time, $O(n)$ space | Intermediate allocations eliminated |
| Random Access (`s[i]`) | $O(1)$ | $O(1)$ | Contiguous indexed memory |
| Substring Slice (`s[i:j]`) | $O(k)$ where $k = j - i$ | $O(k)$ | Copies $k$ characters into new string |
| String Comparison (`s1 == s2`) | $O(n)$ worst-case | $O(n)$ | Fast pointer equality first, then character compare |

## When to Use and Avoid

| When to Use | When to Avoid |
|---|---|
| Immutable strings as dictionary keys and set values | Repeatedly modifying or splicing characters inside tight loops (use `list[str]` or `bytearray`) |
| Pre-allocated `"".join()` when combining multiple fragments | Accumulating text across thousands of iterations using `s += fragment` |
| Slicing and reading character indices directly | In-place string mutations without converting to a list or mutable buffer first |
