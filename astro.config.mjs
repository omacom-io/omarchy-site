// @ts-check
import { defineConfig } from "astro/config";

// Static output only: the build is plain HTML/CSS/JS, served from any host.
// Everything not yet migrated to src/pages/ lives in public/ and is copied verbatim.
export default defineConfig({
  site: "https://omarchy.org",
  output: "static",
  compressHTML: true,
  // Omarchy's URLs are directories: /teams/ served from teams/index.html.
  trailingSlash: "always",
  build: {
    format: "directory",
  },
  markdown: {
    // The manual is styled by assets/css/manual.css; Shiki's inline colours would
    // fight it. Kramdown ran with syntax_highlighter: nil for the same reason.
    syntaxHighlight: false,
  },
});
