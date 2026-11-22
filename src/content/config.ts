import { defineCollection, z } from 'astro:content';

/**
 * Date (YYYY-MM-DD) the owner reviewed and accepted the page (.migration-contract.md §10).
 * Absent means "not verified yet". Only the owner's review sets it.
 */
const verified = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'verified must be a YYYY-MM-DD date')
  .optional();

const learnCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    topic: z.string(),
    order: z.number(),
    difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
    timeComplexity: z.string(),
    spaceComplexity: z.string(),
    visualizer: z.string().optional(),
    diagram: z.string().optional(),
    tags: z.array(z.string()),
    verified,
  }),
});

const problemsCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    platform: z.enum(['leetcode', 'hackerrank', 'codeforces', 'other']),
    problemUrl: z.string().url(),
    difficulty: z.enum(['easy', 'medium', 'hard']),
    topics: z.array(z.string()),
    dateCompleted: z.string().optional().default(''),
    timeComplexity: z.string().optional(),
    spaceComplexity: z.string().optional(),
    verified,
    approaches: z.array(
      z.object({
        name: z.string(),
        timeComplexity: z.string(),
        spaceComplexity: z.string(),
        isOptimal: z.boolean().default(false),
        summary: z.string().optional(),
        tags: z
          .array(
            z.object({
              label: z.string(),
              topic: z.string().optional(),
              slug: z.string().optional(),
            }),
          )
          .default([]),
      }),
    ).optional().default([]),
  }),
});

export const collections = {
  learn: learnCollection,
  problems: problemsCollection,
};
