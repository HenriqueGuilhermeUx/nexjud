import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { VitePWA } from "vite-plugin-pwa"

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "apple-touch-icon.png", "icons/*.png"],
      manifest: {
        id: "/app",
        name: "NexJud Companion",
        short_name: "NexJud",
        description: "NexJud Companion: Legal Brain, casos, scanner jurídico, agenda e análise do juízo no celular.",
        theme_color: "#080A10",
        background_color: "#080A10",
        display: "standalone",
        display_override: ["standalone"],
        orientation: "portrait-primary",
        start_url: "/app",
        scope: "/",
        categories: ["business", "productivity", "legal"],
        icons: [
          {
            src: "/icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icons/icon-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
        shortcuts: [
          {
            name: "Legal Brain",
            short_name: "IA",
            description: "Pergunte ao Legal Brain",
            url: "/app/ia",
            icons: [{ src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" }],
          },
          {
            name: "Casos",
            short_name: "Casos",
            description: "Abra sua carteira jurídica",
            url: "/app/casos",
            icons: [{ src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" }],
          },
          {
            name: "Scanner",
            short_name: "Scanner",
            description: "Fotografe ou importe documentos jurídicos",
            url: "/app/scanner",
            icons: [{ src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" }],
          },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//, /^\/\.netlify\//],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "gstatic-fonts-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    global: "globalThis",
  },
  build: {
    minify: "esbuild",
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom"],
          charts: ["recharts"],
          ui: ["@radix-ui/react-dialog", "@radix-ui/react-dropdown-menu", "@radix-ui/react-tabs"],
        },
      },
    },
  },
})
