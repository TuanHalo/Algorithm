import { defineCollection, z } from 'astro:content';

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
    dateCompleted: z.string(),
    timeComplexity: z.string(),
    spaceComplexity: z.string(),
    diagram: z.string().optional(),
  }),
});

export const collections = {
  learn: learnCollection,
  problems: problemsCollection,
};

