import { getCollection, type CollectionEntry } from "astro:content";

export type Chapter = CollectionEntry<"manual">;

/** The chapter's own title, and the heading the body opens with. */
const TITLE = /^#[^\S\n]+(.+?)[^\S\n]*$/m;
const RENDERED_TITLE = /^\s*<h1\b[^>]*>[\s\S]*?<\/h1>\s*/;

/** Rendered headings carry the anchors, and split a chapter into search entries. */
const HEADING = /<h([2-6]) id="([^"]+)">([\s\S]*?)<\/h\1>/g;

export async function chapters(): Promise<Chapter[]> {
  // The NN- prefix is the running order, so sorting on the id is the order.
  const chapters = await getCollection("manual");
  return chapters.sort((a, b) => a.id.localeCompare(b.id));
}

/** "07-hotkeys" → "hotkeys". */
export function slug(chapter: Chapter): string {
  return chapter.id.slice(chapter.id.indexOf("-") + 1);
}

/** The first chapter is the manual's front page. */
export function path(chapter: Chapter): string {
  return chapter.id.startsWith("01-") ? "/manual/" : `/manual/${slug(chapter)}/`;
}

export function title(chapter: Chapter): string {
  const title = chapter.body?.match(TITLE)?.[1];
  if (!title) throw new Error(`No title heading in content/manual/${chapter.id}.md`);
  return title;
}

/** The body without its title, which the template prints for itself. */
function content(chapter: Chapter): string {
  return (chapter.rendered?.html ?? "").replace(RENDERED_TITLE, "");
}

/** The same body, with a permalink appended to every heading. */
export function html(chapter: Chapter): string {
  return content(chapter).replace(
    HEADING,
    (_, level, id, heading) =>
      `<h${level} id="${id}">${heading} <a class="manual__heading-link" href="#${id}" aria-label="Link to this section">#</a></h${level}>`,
  );
}

/** The chapter's opening prose, for the description and social tags. */
export function description(chapter: Chapter): string {
  const body = (chapter.body ?? "").replace(TITLE, "");
  const line = body.split("\n").find((line) => /\S/.test(line) && !/^[#!\[<`|]/.test(line)) ?? "";
  const text = line
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[*_`]/g, "")
    .trim();

  return text.length > 160 ? `${text.slice(0, 157).replace(/\s+\S*$/, "")}...` : text;
}

const ENTITIES: Record<string, string> = {
  "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&apos;": "'",
};

/**
 * Tags become spaces so the words either side of them stay apart, then the space
 * an inline tag left stranded in front of punctuation goes again.
 */
function plainText(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&(?:amp|lt|gt|quot|apos|#39);/g, (entity) => ENTITIES[entity])
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/\s+/g, " ")
    .replace(/ ([.,;:!?)\]’])/g, "$1")
    .trim();
}

export interface SearchEntry {
  chapter: string;
  title: string;
  url: string;
  text: string;
}

/**
 * Splits a rendered chapter into one search entry per heading, so results can
 * link straight to the section that matched rather than the top of the chapter.
 * Taken before the permalinks go on, so the "#" stays out of the section titles.
 */
export function searchEntries(chapter: Chapter): SearchEntry[] {
  const body = content(chapter);
  const headings = [...body.matchAll(HEADING)];
  const name = title(chapter);
  const url = path(chapter);

  const entries: SearchEntry[] = [
    { chapter: name, title: name, url, text: plainText(body.slice(0, headings[0]?.index ?? body.length)) },
  ];

  headings.forEach((heading, index) => {
    const from = heading.index + heading[0].length;
    const to = headings[index + 1]?.index ?? body.length;

    entries.push({
      chapter: name,
      title: plainText(heading[3]),
      url: `${url}#${heading[2]}`,
      text: plainText(body.slice(from, to)),
    });
  });

  return entries.filter((entry) => entry.text !== "");
}
