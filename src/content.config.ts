import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

// News posts stay where they have always lived: content/news/YYYY/MM/slug.md.
// The glob loader's id is that relative path minus ".md", which is also the URL.
const news = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./content/news" }),
  schema: z.object({
    title: z.string(),
    date: z.date(),
    author: z.string().default("Omarchy"),
    author_url: z.url().optional(),
    // Optional: falls back to an excerpt of the rendered post, as before.
    description: z.string().optional(),
  }),
});

export const collections = { news };
