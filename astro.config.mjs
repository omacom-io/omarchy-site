// @ts-check
import { defineConfig } from "astro/config";

// Static output only: the build is plain HTML/CSS/JS, served from any host.
// Everything not yet migrated to src/pages/ lives in public/ and is copied verbatim.
export default defineConfig({
  site: "https://omarchy.org",
  output: "static",
  // Whitespace between inline elements is significant in the existing markup
  // (e.g. the footer credits), so leave the HTML as authored.
  compressHTML: false,
  build: {
    format: "directory",
  },
});
