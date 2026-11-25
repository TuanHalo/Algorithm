---
title: "Stock with Cooldown (State Machine DP)"
topic: "dynamic-programming"
order: 11
difficulty: "advanced"
timeComplexity: "O(n)"
spaceComplexity: "O(1)"
tags: ["dynamic-programming", "state-machine", "stock", "space-optimized"]
---

## Complexity

| Case | Time | Space | Why? |
|------|------|-------|------|
| Best | `O(n)` | `O(1)` | Every day still updates all three states, even when prices only fall |
| Average | `O(n)` | `O(1)` | Three `max` / `+` updates per day, six numbers kept |
| Worst | `O(n)` | `O(1)` | Never more than one pass; trying every buy / sell plan is `O(2ⁿ)` |

## When to use

| Great for | Avoid for |
|---|---|
| Day-by-day choices with rules between them: a transaction fee (subtract it on sell), at most `k` trades (`2k` states), Paint House, Decode Ways | One buy and one sell only: track the lowest price so far, no states needed |
| Any problem where “what I may do next” depends on a small mode (holding, cooling down, last color): one variable per mode | Rules that depend on long history (no buy within the last 30 days), where the states multiply |
| Unlimited trades without cooldown: drop `sold` and buy from yesterday’s `max(rest, sold)` | Large `k` with few days: when `k ≥ n / 2` the limit doesn’t bind, so sum every rise instead |
