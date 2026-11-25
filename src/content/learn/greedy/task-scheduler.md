---
title: "Task Scheduler (CPU Cooling Intervals)"
topic: "greedy"
order: 6
difficulty: "intermediate"
timeComplexity: "O(n)"
spaceComplexity: "O(1)"
tags: ["greedy", "scheduling", "cpu", "hash-map", "math"]
---

## Complexity

| Case | Time | Space | Why? |
|------|------|-------|------|
| Best (one task type) | `O(m)` | `O(1)` | `max`, `count` and `sum` each scan the counts once; `m` is the number of task types |
| Average | `O(m)` | `O(1)` | Three passes over `m` counts, no schedule is built |
| Worst (all 26 letters) | `O(26)` = `O(1)` | `O(1)` | With uppercase letters `m ≤ 26`; counting the task list first is `O(len(tasks))` |

## When to use

| Great for | Avoid for |
|---|---|
| Scheduling repeated tasks under a fixed cooldown (LeetCode "Task Scheduler": pass `Counter(tasks).values()` as `frequencies`) | Tasks with different durations or different cooldowns |
| Rearranging an array so equal elements are at least `k` apart (the same frame idea) | Tasks that depend on each other's output (DAG workflows) |
| API rate limiting and queues with a per-client cooldown | Streams where future tasks arrive unpredictably |
