import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  server: { port: 5173, open: false },
  // Phaser alone is ~1.2 MB minified.
  build: { chunkSizeWarningLimit: 2000 },
});
