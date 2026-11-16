---
title: "Bloom Filter (Probabilistic Set Membership)"
topic: "hashing"
order: 7
difficulty: "advanced"
timeComplexity: "O(k) insert & query"
spaceComplexity: "O(m) bits"
tags: ["hashing", "bloom-filter", "probabilistic", "bit-array", "caching"]
---

## What is a Bloom Filter?

Imagine the bouncer outside an exclusive nightclub with a guest list of 100,000 names.
Carrying a massive physical dictionary of 100,000 names takes up too much space and takes seconds to leaf through.
Instead, the club uses a special stamp with $k = 3$ glowing ultraviolet inks.
When an invited guest registers, the club stamps 3 specific spots on their wrist.

When a guest arrives at the door:
- If **any** of the 3 glowing spots is missing $\to$ The bouncer says: **"You are DEFINITELY NOT on the list."** (Zero false negatives!)
- If **all 3** spots glow $\to$ The bouncer says: **"You are PROBABLY on the list."** (There is a tiny chance random dust caused a false positive, so the bouncer can quickly double-check the database if needed).

This is a **Bloom Filter**: an incredibly space-efficient, probabilistic data structure that tests whether an element is a member of a set using a fraction of the memory of a hash table!

## Core Concept

Invented by Burton Howard Bloom in 1970, a Bloom Filter uses a bit array of size $m$ (all initialized to $0$) and $k$ independent hash functions $h_1, h_2, \dots, h_k$.

Key principles:
1. **Adding an Element ($x$)**:
   Compute $k$ hash indices: $i_1 = h_1(x) \pmod m, \dots, i_k = h_k(x) \pmod m$.
   Set bits at all these indices to `1`:
   $$\text{bit\_array}[i_j] = 1 \quad \text{for all } 1 \le j \le k$$
2. **Querying an Element ($y$)**:
   Compute the same $k$ hash indices for $y$.
   - If **any** bit $\text{bit\_array}[i_j] == 0$, $y$ is **DEFINITELY NOT** in the set.
   - If **all** bits $\text{bit\_array}[i_j] == 1$, $y$ is **PROBABLY** in the set.
3. **No False Negatives**:
   If an element was added, its hashed bits were turned on and never turned off. Hence, a negative result is $100\%$ certain.
4. **Possibility of False Positives**:
   Bits may have been turned to `1` by other distinct elements. The false positive probability $\epsilon$ is approximately:
   $$\epsilon \approx \left( 1 - e^{-kn/m} \right)^k$$
   Optimal number of hash functions for a given $m$ and $n$:
   $$k = \frac{m}{n} \ln 2 \approx 0.693 \cdot \frac{m}{n}$$
5. **No Deletions in Standard Bloom Filters**:
   Setting a bit to $0$ on delete could inadvertently delete other elements that hashed to that same bit! (Counting Bloom Filters solve this using small integer counters instead of single bits).

## Walkthrough

Consider a bit array of size $m = 10$ and $k = 3$ hash functions.
Initial Bit Array: `[0, 0, 0, 0, 0, 0, 0, 0, 0, 0]`

```
Step 1: Insert "cat"
  h1("cat") % 10 = 1
  h2("cat") % 10 = 4
  h3("cat") % 10 = 7
  Set bits 1, 4, 7 to 1:
  Bits: [0, 1, 0, 0, 1, 0, 0, 1, 0, 0]

Step 2: Insert "dog"
  h1("dog") % 10 = 4 (already 1)
  h2("dog") % 10 = 6
  h3("dog") % 10 = 9
  Set bits 4, 6, 9 to 1:
  Bits: [0, 1, 0, 0, 1, 0, 1, 1, 0, 1]

Step 3: Query "cat"
  Check bits 1, 4, 7: all are 1 -> "Probably Present" (Correct!)

Step 4: Query "fish"
  h1("fish") % 10 = 2 (bit 2 is 0!)
  h2("fish") % 10 = 4
  h3("fish") % 10 = 8
  Since bit 2 is 0 -> "Definitely NOT Present" (Instant rejection, zero disk I/O!)

Step 5: Query "bird"
  Suppose h1("bird")=1, h2("bird")=6, h3("bird")=9.
  Bits 1, 6, 9 are all 1 (set by "cat" and "dog")!
  Bloom filter reports: "Probably Present" -> False Positive!
```

## Python Code

```python
import hashlib
import math


class BloomFilter:
    """Space-efficient probabilistic set using Kirsch-Mitzenmacher double hashing."""

    def __init__(self, expected_elements: int, false_positive_rate: float) -> None:
        if false_positive_rate <= 0 or false_positive_rate >= 1:
            raise ValueError("false_positive_rate must be between 0 and 1")

        self.n = expected_elements
        # Optimal bit array size m = - (n * ln(p)) / (ln(2)^2)
        self.m = int(
            math.ceil(
                - (self.n * math.log(false_positive_rate)) / (math.log(2) ** 2)
            )
        )
        # Optimal number of hash functions k = (m / n) * ln(2)
        self.k = int(round((self.m / self.n) * math.log(2)))

        # Bit array represented using bytearray
        self.bit_array = bytearray(math.ceil(self.m / 8))

    def _hashes(self, item: str) -> list[int]:
        """Generates k hash values using double hashing: hash(i) = (h1 + i * h2) % m."""
        # Compute two 64-bit independent hashes using MD5
        digest = hashlib.md5(item.encode("utf-8")).digest()
        h1 = int.from_bytes(digest[:8], byteorder="big")
        h2 = int.from_bytes(digest[8:16], byteorder="big")

        return [(h1 + i * h2) % self.m for i in range(self.k)]

    def add(self, item: str) -> None:
        """Adds an item to the Bloom filter."""
        for bit_index in self._hashes(item):
            byte_idx = bit_index // 8
            bit_offset = bit_index % 8
            self.bit_array[byte_idx] |= 1 << bit_offset

    def __contains__(self, item: str) -> bool:
        """Returns False if item is definitely not in filter, True if probably in filter."""
        for bit_index in self._hashes(item):
            byte_idx = bit_index // 8
            bit_offset = bit_index % 8
            if not (self.bit_array[byte_idx] & (1 << bit_offset)):
                return False
        return True
```

## Complexity

| Operation | Time | Space | Why? |
|---|---|---|---|
| `add(item)` | `O(k)` | `O(1)` | Computes $k$ hash digests and sets $k$ bits; independent of number of stored items $n$ |
| `contains(item)` | `O(k)` | `O(1)` | Computes $k$ hash digests and checks bits; short-circuits on first `0` bit |
| Total Space | — | `O(m)` bits | $m \approx 10 \cdot n$ bits for a $1\%$ false positive rate (less than $1.2$ bytes per element!) |

## When to Use

| Great for | Avoid for |
|---|---|
| Database disk read caches (e.g. Apache Cassandra, RocksDB, Google Bigtable checking if an SSTable contains a row before doing expensive disk I/O) | Applications requiring $100\%$ precision with zero false positives |
| Web crawlers tracking visited URLs without storing petabytes of URL strings | Sets that require frequent element deletions (use Counting Bloom Filter or Cuckoo Filter) |
| Web browser malicious URL protection (Chrome checking if a site is on a fraud blacklist before querying remote servers) | When elements must be enumerated, listed, or retrieved (Bloom filters only test set membership, they cannot store or return data) |
