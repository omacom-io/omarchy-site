import type { APIRoute } from "astro";

import { chapters, searchEntries } from "@/lib/manual";

// One entry per heading, so a result can link straight to the section that
// matched. Search.astro fetches this the first time someone reaches for the
// search box.
export const GET: APIRoute = async () => {
  const all = await chapters();
  const index = all.flatMap(searchEntries);

  return new Response(JSON.stringify(index), {
    headers: { "content-type": "application/json" },
  });
};
