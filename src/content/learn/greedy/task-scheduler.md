---
title: "Task Scheduler (CPU Cooling Intervals)"
topic: "greedy"
order: 6
difficulty: "intermediate"
timeComplexity: "O(n)"
spaceComplexity: "O(1)"
tags: ["greedy", "scheduling", "cpu", "hash-map", "math"]
---

## What is the Task Scheduler Problem?

Imagine a CPU running a batch of jobs represented by letters: `['A', 'A', 'A', 'B', 'B', 'B']`.
Due to overheating, the hardware enforces a strict **cooling period**: once the CPU executes task `A`, it must wait at least $n$ clock cycles before running another `A`.
During that cooling window, the CPU can either run a different task (like `B`) or sit completely idle.

What is the absolute minimum number of CPU intervals needed to execute all tasks?

Instead of running a complex step-by-step simulator, we can use a **Greedy Slot-Filling Strategy**:
The task with the **highest frequency** determines the bottleneck structure of the schedule.
We schedule that most frequent task first, create empty cooling slots between its occurrences, and greedily fill those gaps with the remaining tasks!

## Core Concept

Let $f_{\max}$ be the maximum frequency of any task in the list, and let $k$ be the count of distinct tasks that appear with this exact maximum frequency.

Key principles:
1. **Frame Construction**:
   The most frequent task divides the schedule into $(f_{\max} - 1)$ identical frames.
   Each frame has length $(n + 1)$ (the task itself plus $n$ cooling slots).
2. **The Final Frame**:
   The final $f_{\max}$-th occurrence doesn't require any cooldown after it.
   It merely requires $k$ slots to accommodate all tasks that share frequency $f_{\max}$.
3. **Empty Slots Calculation**:
   $$\text{minimum\_intervals} = (f_{\max} - 1) \cdot (n + 1) + k$$
4. **The Overflow Case**:
   If there are so many distinct tasks that all cooling slots get completely filled and tasks spill over, the CPU **never needs to idle**! In that case, the total time is simply the total number of tasks: $\text{len}(tasks)$.
5. **Universal Formula**:
   $$\text{ans} = \max(\text{len}(tasks), (f_{\max} - 1) \cdot (n + 1) + k)$$

## Walkthrough

Consider tasks: `['A', 'A', 'A', 'B', 'B', 'B', 'C', 'D']` with cooldown $n = 2$.

```
Frequencies:
  'A': 3
  'B': 3
  'C': 1
  'D': 1

Max frequency: f_max = 3
Tasks with max frequency: 'A' and 'B' -> k = 2

Frame size = n + 1 = 3 slots per frame.
Number of cooling chunks = f_max - 1 = 2 chunks.

Visual Layout:
Chunk 1:  [A, B, _]  (cooldown slot)
Chunk 2:  [A, B, _]  (cooldown slot)
Final:    [A, B]     (no cooldown needed after last instances)

Available empty cooling slots = 2 * (3 - 2) = 2 slots.
Remaining tasks to place: 'C' (count 1) and 'D' (count 1) -> 2 tasks!

Fill the empty slots:
Chunk 1:  [A, B, C]
Chunk 2:  [A, B, D]
Final:    [A, B]

Total CPU intervals: (3 - 1) * (2 + 1) + 2 = 2 * 3 + 2 = 8 intervals.
Zero idle time needed!
Sequence: A -> B -> C -> A -> B -> D -> A -> B (8 units).
```

## Python Code

```python
from collections import Counter


def least_interval(tasks: list[str], n: int) -> int:
    """Calculates the minimum CPU clock intervals needed to finish all tasks with cooldown n."""
    if n == 0:
        return len(tasks)

    # Count task frequencies
    counts = Counter(tasks)
    frequencies = list(counts.values())

    max_freq = max(frequencies)
    # Count how many tasks share the maximum frequency
    max_freq_count = frequencies.count(max_freq)

    # Frame formula: (max_freq - 1) chunks of size (n + 1), plus final row
    calculated_intervals = (max_freq - 1) * (n + 1) + max_freq_count

    # The result is at least the total number of tasks
    return max(len(tasks), calculated_intervals)
```

## Complexity

| Metric | Complexity | Why? |
|---|---|---|
| Time | `O(len(tasks))` | Single pass to count frequencies; alphabet size is at most 26 (uppercase letters), so max and count take $O(1)$ |
| Space | `O(1)` | Frequency map stores at most 26 distinct uppercase ASCII character keys |

## When to Use

| Great for | Avoid for |
|---|---|
| Scheduling batches of repeated tasks under fixed refractory or cooldown delays | Tasks with variable execution times or distinct non-uniform cooling periods |
| API rate limiting and request queue throttling with per-client cooldowns | Dependency-constrained tasks (e.g. DAG workflows where task $B$ requires task $A$'s output) |
| Rearranging arrays so identical elements are at least $k$ distance apart | Dynamic streaming workloads where future tasks arrive continuously and unpredictably |
