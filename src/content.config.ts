import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const posts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),
    /** YAML timestamp. Give datetimes an offset (+01:00) so they print the same on every build machine. */
    date: z.coerce.date(),
    /** Sequential item number printed as #0042. */
    number: z.number().int().positive(),
    tags: z.array(z.string()).default([]),
    lang: z.enum(['en', 'hr']).default('en'),
    /** Reading time override in minutes; computed from the body when omitted. */
    minutes: z.number().int().positive().optional(),
    /** Optional summary for meta description and feeds. */
    description: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { posts };
