---
title: "Gas Station"
topic: "greedy"
order: 7
difficulty: "intermediate"
timeComplexity: "O(n)"
spaceComplexity: "O(1)"
visualizer: "/visualizers/greedy/gas-station.html"
diagram: "/diagrams/greedy/gas-station-flow.html"
tags: ["greedy", "circular-array", "prefix-sum", "invariant"]
---

## What is gas station?

Suppose a delivery van drives around a circular loop of gas stations, gaining `gas[i]` liters at station `i` and burning `cost[i]` liters to reach station `i + 1`. If you start at station `A` and run dry before reaching `B`, starting at any station between `A` and `B` would also run dry at `B` because you entered every middle stop with zero or more fuel left.

Gas station finds the unique starting index for a full circular lap, or returns `-1` if total fuel is smaller than total cost.

## Core idea

Scan once while tracking `total` net fuel and the current `tank`; whenever `tank` drops below zero at station `i`, discard all earlier starts by setting `start = i + 1` and `tank = 0`.

## Python code

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
            # Any start in [start..idx] also runs dry at idx, so jump past it
            start = idx + 1
            tank = 0

    return start if total >= 0 else -1
```

## Complexity

| Case | Time | Space | Why? |
|---|---|---|---|
| Average / Worst | `O(n)` | `O(1)` | Evaluates each station once in a single pass with three scalar counters |

## When to use

| Great for | Avoid for |
|---|---|
| Finding a valid start on a circular route without testing all `n` starting points in `O(n²)` | Problems with a finite tank capacity cap where excess fuel overflows |
| Checking feasibility via global net balance (`sum(gas) >= sum(cost)`) | Finding all valid starting indices rather than one valid start (needs prefix-minimum tracking) |
