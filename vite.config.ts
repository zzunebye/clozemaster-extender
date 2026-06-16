import { defineConfig } from "vite"

export default defineConfig({
  build: {
    emptyOutDir: true,
    outDir: "dist",
    rollupOptions: {
      input: {
        background: new URL("./src/background/index.ts", import.meta.url).pathname,
        content: new URL("./src/content/clozemaster.ts", import.meta.url).pathname,
        popup: new URL("./popup.html", import.meta.url).pathname,
      },
      output: {
        assetFileNames: "assets/[name][extname]",
        chunkFileNames: "chunks/[name].js",
        entryFileNames: "[name].js",
      },
    },
  },
})
