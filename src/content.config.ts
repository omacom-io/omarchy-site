import { defineCollection } from "astro:content";
import { z } from "astro/zod"
import { glob } from "astro/loaders";

// News posts stay where they have always lived: content/news/YYYY/MM/slug.md.
// The glob loader's id is that relative path minus ".md", which is also the URL.
const news = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./content/news" }),
  schema: z.object({
    // Optional here, but not really: a post without a title needs a `# heading`
    // instead, which the schema cannot see. src/lib/news.ts enforces the pair.
    title: z.string().optional(),
    // Falls back to the first of the YYYY/MM the post is filed under.
    date: z.date().optional(),
    author: z.string().default("Omarchy"),
    author_url: z.url().optional(),
    // Falls back to an excerpt of the rendered post.
    description: z.string().optional(),
  }),
});

// Manual chapters, synced from basecamp/omarchy by scripts/sync-manual.mjs.
// They carry no front matter: the title is the chapter's first `# heading` and
// the order is the NN- prefix on the filename.
const manual = defineCollection({
  loader: glob({ pattern: "[0-9][0-9]-*.md", base: "./content/manual" }),
});

export const collections = { news, manual };
