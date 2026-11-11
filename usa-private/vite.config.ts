import { defineConfig } from "vite"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const root = dirname(fileURLToPath(import.meta.url))
// Intentionally separate from the public Netlify base directory (usa-public)
// and the Brazil Vite application. No target site auto-deploys this bundle.
export default defineConfig({
  root,
  envDir: root,
  base: "/",
  build: {
    outDir: resolve(root,"dist"),
    emptyOutDir:true,
  },
})
