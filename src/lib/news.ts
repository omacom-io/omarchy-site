import { getCollection, type CollectionEntry } from "astro:content";

export type Post = CollectionEntry<"news">;

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** "August 19, 2026" — the format the ERB templates used. */
export function formatDate(date: Date): string {
  return `${MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}`;
}

/** Date-only ISO 8601, matching Ruby's Date#iso8601. */
export function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Canonical URLs have no trailing slash, as omarchy.org serves them today. */
export function postPath(post: Post): string {
  return `/news/${post.id}`;
}

const ENTITIES: Record<string, string> = {
  "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&apos;": "'",
};

function plainText(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&(?:amp|lt|gt|quot|apos|#39);/g, (entity) => ENTITIES[entity])
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/\s+/g, " ")
    .trim();
}

function excerpt(text: string, length = 240): string {
  if (text.length <= length) return text;
  return `${text.slice(0, length - 1).replace(/\s+\S*$/, "")}…`;
}

/** Front matter wins; otherwise the opening of the post, truncated on a word. */
export function description(post: Post): string {
  return post.data.description ?? excerpt(plainText(post.rendered?.html ?? ""));
}

/**
 * Newest first. Posts sharing a date fall back to descending id, which keeps
 * the index in exactly the order the Ruby build produced.
 */
export async function newsPosts(): Promise<Post[]> {
  const posts = await getCollection("news");
  return posts.sort(
    (a, b) => b.data.date.getTime() - a.data.date.getTime() || (a.id < b.id ? 1 : -1),
  );
}
