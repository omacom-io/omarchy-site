import { getCollection, type CollectionEntry } from "astro:content";

export type Post = CollectionEntry<"news">;

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** The first level-1 heading, which stands in for a missing front matter title. */
const HEADING = /^#[^\S\n]+(.+?)[^\S\n]*$/m;

/** A rendered heading to drop, since the title is shown by the template instead. */
const RENDERED_HEADING = /^\s*<h1\b[^>]*>[\s\S]*?<\/h1>\s*/;

/** src/href values that are neither absolute, nor a scheme, nor a fragment. */
const RELATIVE_ATTR = /(\s(?:src|href)=")(?!\w+:|[/#])/g;

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

/** Front matter title, else the post's opening `# heading`. */
export function title(post: Post): string {
  const title = post.data.title ?? post.body?.match(HEADING)?.[1];
  if (!title) {
    throw new Error(
      `Add a title to content/news/${post.id}.md front matter or as its first heading`,
    );
  }
  return title;
}

/** Front matter date, else the first of the month the post files itself under. */
export function date(post: Post): Date {
  if (post.data.date) return post.data.date;

  const [year, month] = post.id.split("/");
  return new Date(Date.UTC(Number(year), Number(month) - 1, 1));
}

/**
 * The post body. A leading `# heading` comes out, because the template prints
 * the title itself, and links to files kept beside the post are pointed at the
 * copies `scripts/sync-news-assets.mjs` publishes under the post's own URL.
 */
export function html(post: Post): string {
  const rendered = post.rendered?.html ?? "";
  const body = HEADING.test(post.body ?? "") ? rendered.replace(RENDERED_HEADING, "") : rendered;
  return body.replace(RELATIVE_ATTR, `$1${postPath(post)}/`);
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
  return post.data.description ?? excerpt(plainText(html(post)));
}

/**
 * Newest first. Posts sharing a date fall back to descending id, which keeps
 * the index in exactly the order the Ruby build produced.
 */
export async function newsPosts(): Promise<Post[]> {
  const posts = await getCollection("news");
  return posts.sort(
    (a, b) => date(b).getTime() - date(a).getTime() || (a.id < b.id ? 1 : -1),
  );
}
