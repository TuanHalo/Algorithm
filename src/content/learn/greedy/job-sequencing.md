---
title: "Job Sequencing with Deadlines"
topic: "greedy"
order: 4
difficulty: "intermediate"
timeComplexity: "O(n log n + n · d)"
spaceComplexity: "O(d)"
tags: ["greedy", "scheduling", "deadlines", "sorting", "disjoint-set"]
---

## What is Job Sequencing with Deadlines?

Imagine running a high-demand custom cake bakery.
Clients send in orders where each cake takes exactly 1 hour to bake, carries a specific deadline (e.g. "must be delivered before hour 3"), and earns a handsome cash tip upon completion.
If you deliver a cake after its deadline, you receive zero tip.

Because time slots are limited, you cannot bake every cake.
How do you choose and schedule orders to maximize your total earnings?

A smart baker uses a **Greedy Strategy**:
1. Focus on the most lucrative orders first (sort by tip descending).
2. Schedule each cake at the **latest possible time slot** before its deadline, keeping earlier slots open for more urgent cakes!

This is the classic **Job Sequencing with Deadlines** problem.

## Core Concept

We are given $n$ jobs, each requiring 1 unit of time.
Each job $i$ has an integer deadline $d_i \ge 1$ and a profit $p_i > 0$.
At most one job can run in each time slot $[t - 1, t]$ for integer $t \ge 1$.

Key principles:
1. **Greedy Choice**: Always attempt to schedule jobs with higher profit before considering lower-profit jobs.
2. **Latest Feasible Slot**: If job $j$ has deadline $d$, the optimal placement is the latest free slot $t \in [1, d]$. Placing it earlier would needlessly block a slot that could have served a job with an earlier deadline.
3. **Rejection**: If all slots from $1$ to $d$ are already occupied, the job cannot be scheduled and is discarded.
4. **Union-Find Optimization**: Looking up the latest free slot naively takes $O(d)$. By modeling empty slots with a Disjoint Set Union (DSU) where each slot points to the slot immediately before it, finding the latest available slot accelerates to nearly $O(1)$ amortized time ($O(n \alpha(d))$).

## Walkthrough

Consider 5 jobs:
- `Job A`: Deadline = 2, Profit = 100
- `Job B`: Deadline = 1, Profit = 19
- `Job C`: Deadline = 2, Profit = 27
- `Job D`: Deadline = 1, Profit = 25
- `Job E`: Deadline = 3, Profit = 15

Maximum deadline = 3. Available time slots: Slot 1 `[0-1]`, Slot 2 `[1-2]`, Slot 3 `[2-3]`.

```
Step 1: Sort jobs by profit descending:
  1. Job A (profit 100, deadline 2)
  2. Job C (profit 27, deadline 2)
  3. Job D (profit 25, deadline 1)
  4. Job B (profit 19, deadline 1)
  5. Job E (profit 15, deadline 3)

Step 2: Greedily assign slots from latest possible down to 1:
- Job A (deadline 2): Slot 2 is free!
  Schedule Job A in Slot 2.
  Slots: [Empty, Job A, Empty]

- Job C (deadline 2): Slot 2 occupied. Check Slot 1: Slot 1 is free!
  Schedule Job C in Slot 1.
  Slots: [Job C, Job A, Empty]

- Job D (deadline 1): Slot 1 occupied. No slots left <= 1.
  Discard Job D.

- Job B (deadline 1): Slot 1 occupied.
  Discard Job B.

- Job E (deadline 3): Slot 3 is free!
  Schedule Job E in Slot 3.
  Slots: [Job C, Job A, Job E]

Final Schedule: [Job C, Job A, Job E]
Total Profit: 27 + 100 + 15 = 142. (Optimal!)
```

## Python Code

```python
from dataclasses import dataclass


@dataclass
class Job:
    id: str
    deadline: int
    profit: int


def job_sequencing(jobs: list[Job]) -> tuple[list[str], int]:
    """Schedules jobs to maximize profit within deadlines.

    Returns scheduled job IDs and total profit.
    """
    if not jobs:
        return [], 0

    # 1. Sort all jobs by profit in descending order
    sorted_jobs = sorted(jobs, key=lambda j: j.profit, reverse=True)

    max_deadline = max(j.deadline for j in sorted_jobs)
    # slots[t] stores job ID placed in time slot t (1-indexed)
    slots: list[str | None] = [None] * (max_deadline + 1)

    total_profit = 0
    scheduled_jobs: list[str] = []

    # 2. Iterate through sorted jobs and place in latest available slot <= deadline
    for job in sorted_jobs:
        for t in range(job.deadline, 0, -1):
            if slots[t] is None:
                slots[t] = job.id
                scheduled_jobs.append(job.id)
                total_profit += job.profit
                break

    return scheduled_jobs, total_profit
```

## Complexity

| Metric | Complexity | Why? |
|---|---|---|
| Time (Array Search) | `O(n log n + n · d)` | Sorting $n$ jobs takes $O(n \log n)$; backward linear search through at most $d$ slots takes $O(n \cdot d)$ |
| Time (with DSU) | `O(n log n + n · α(d))` | Disjoint Set Union compresses paths, making slot lookup virtually $O(1)$ |
| Space | `O(d)` | Storing the slot reservation array of size $d = \max(\text{deadlines})$ |

## When to Use

| Great for | Avoid for |
|---|---|
| Single-machine scheduling where all tasks take identical unit durations | Jobs with varying processing durations (e.g. job $A$ takes 3 hours, job $B$ takes 1 hour) — NP-hard |
| Prioritizing incoming queue requests under hard expiry timeouts | Multi-processor scheduling with complex inter-job dependency DAGs |
| Maximizing reward points when time-windows overlap | When deadlines are soft and can be penalized continuously (use flow shop / tardiness DP) |
