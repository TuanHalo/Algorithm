---
title: "Gas Station"
platform: "leetcode"
problemUrl: "https://leetcode.com/problems/gas-station/"
difficulty: "medium"
topics: ["greedy", "array"]
dateCompleted: "2026-11-16"
timeComplexity: "O(n)"
spaceComplexity: "O(1)"
diagram: "/diagrams/greedy/gas-station-flow.html"
approaches:
  - name: "One-Pass Greedy"
    timeComplexity: "O(n)"
    spaceComplexity: "O(1)"
    isOptimal: true
    summary: "If total gas >= total cost, a solution exists; reset starting station whenever current tank drops below 0."
    tags:
      - label: "Greedy"
        topic: "greedy"
---

## Problem

There are `n` gas stations along a circular route, where the amount of gas at the `i`-th station is `gas[i]`.

You have a car with an unlimited gas tank and it costs `cost[i]` of gas to travel from the `i`-th station to its next `(i + 1)`-th station. You begin the journey with an empty tank at one of the gas stations.

Given two integer arrays `gas` and `cost`, return *the starting gas station's index if you can travel around the circuit once in the clockwise direction, otherwise return* `-1`. If there exists a solution, it is **guaranteed to be unique**.

### Example 1
```
Input: gas = [1,2,3,4,5], cost = [3,4,5,1,2]
Output: 3
Explanation:
Start at station 3 (index 3) and fill up with 4 unit of gas. Your tank = 0 + 4 = 4
Travel to station 4. Your tank = 4 - 1 + 5 = 8
Travel to station 0. Your tank = 8 - 2 + 1 = 7
Travel to station 1. Your tank = 7 - 3 + 2 = 6
Travel to station 2. Your tank = 6 - 4 + 3 = 5
Travel to station 3. The cost is 5. Your gas is just enough to travel back to station 3.
Therefore, return 3 as the starting index.
```

### Example 2
```
Input: gas = [2,3,4], cost = [3,4,3]
Output: -1
Explanation:
You cannot start at station 0 or 1, as there is not enough gas to travel to the next station.
Let's start at station 2 and fill up with 4 unit of gas. Your tank = 0 + 4 = 4
Travel to station 0. Your tank = 4 - 3 + 2 = 3
Travel to station 1. Your tank = 3 - 3 + 3 = 3
You cannot travel back to station 2, as it requires 4 unit of gas but you only have 3.
Therefore, you cannot travel around the circuit once no matter where you start.
```

## My approach

1. **Global feasibility**:
   - If $\sum \text{gas}[i] < \sum \text{cost}[i]$, total fuel across all stations is insufficient to complete the circuit, so no valid start exists, and we must return `-1`.
   - Conversely, if total fuel $\ge$ total cost, a valid starting station is mathematically guaranteed to exist.
2. **Greedy starting point**:
   - Maintain `tank` (current fuel reserve) and `total` (net fuel over the whole route).
   - If starting at station $A$ causes `tank < 0` at station $B$, then *no station between $A$ and $B$ can be a valid starting station either*, because starting at any intermediate station would enter each subsequent station with at most the fuel accumulated starting from $A$.
   - Therefore, whenever `tank < 0` at station `idx`, reset `start = idx + 1` and reset `tank = 0`.
3. **Single pass result**:
   - At the end of the pass, if `total >= 0`, return `start`; otherwise return `-1`.

## My solution

```python
def can_complete_circuit(gas: list[int], cost: list[int]) -> int:
    total = 0
    tank = 0
    start = 0

    for idx, (fill, burn) in enumerate(zip(gas, cost)):
        net = fill - burn
        total += net
        tank += net
        if tank < 0:
            # Any start in [start..idx] runs dry at idx, so discard them all
            start = idx + 1
            tank = 0

    return start if total >= 0 else -1
```

## AI feedback

### Strengths
- Avoids the brute-force $O(n^2)$ simulation of starting from every single station.
- Uses only three scalar counters (`total`, `tank`, `start`), achieving $O(1)$ extra space.
- The pruning logic (skipping all intermediate stations up to `idx`) is provably optimal.

### Improvements
- `zip(gas, cost)` creates an iterator that pairs elements without allocating new lists in Python 3.
- `sum(gas) < sum(cost)` can be checked upfront if desired, but maintaining running `total` integrates the check into the same single loop.

### Edge cases
- `n = 1`: Works cleanly: returns `0` if `gas[0] >= cost[0]`, else `-1`.
- Total gas exactly equals total cost: `total == 0`, valid starting station exists and is correctly identified.

### Alternative approaches
- **Prefix Sum Minimum**: Find the index immediately after the global minimum point of the prefix sum of $(gas - cost)$. That index is the unique starting station.
