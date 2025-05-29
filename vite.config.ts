import react from "@vitejs/plugin-react-swc";
import { componentTagger } from "lovable-tagger";
import path from "path";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 5173,
    headers: {
      // Security headers for development
      "X-Frame-Options": "DENY",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    // Define environment-specific variables
    "import.meta.env.VITE_ENABLE_SUBDOMAIN_ROUTING":
      mode === "development"
        ? JSON.stringify("true")
        : JSON.stringify(process.env.VITE_ENABLE_SUBDOMAIN_ROUTING || "false"),
  },
  build: {
    minify: "terser",
    terserOptions: {
      compress: {
        // Security and performance optimizations
        drop_console: mode === "production",
        drop_debugger: mode === "production",
        pure_funcs: mode === "production" ? ["console.log", "console.info"] : [],
      },
      mangle: {
        safari10: true,
      },
    },
    // Performance optimizations
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Vendor libraries
          if (id.includes("node_modules")) {
            // React ecosystem
            if (id.includes("react") || id.includes("react-dom")) {
              return "vendor-react";
            }
            // Radix UI components
            if (id.includes("@radix-ui")) {
              return "vendor-ui";
            }
            // TanStack Query
            if (id.includes("@tanstack/react-query")) {
              return "vendor-query";
            }
            // Supabase
            if (id.includes("@supabase")) {
              return "vendor-supabase";
            }
            // Charts and visualization
            if (id.includes("recharts") || id.includes("lucide-react")) {
              return "vendor-charts";
            }
            // Form libraries
            if (id.includes("react-hook-form") || id.includes("zod")) {
              return "vendor-forms";
            }
            // Router
            if (id.includes("react-router")) {
              return "vendor-router";
            }
            // Other vendor libraries
            return "vendor-misc";
          }

          // Application code splitting
          if (id.includes("/pages/")) {
            return "pages";
          }
          if (id.includes("/components/store/")) {
            return "store-components";
          }
          if (id.includes("/components/products/")) {
            return "product-components";
          }
          if (id.includes("/components/ui/")) {
            return "ui-components";
          }
          if (id.includes("/contexts/")) {
            return "contexts";
          }

          // Default chunk for remaining code
          return "main";
        },
        // Optimize chunk file names for caching
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId
            ? chunkInfo.facadeModuleId.split("/").pop()?.replace(".tsx", "").replace(".ts", "")
            : "chunk";
          return `assets/${facadeModuleId}-[hash].js`;
        },
      },
    },
    // Bundle size limits - enforce performance budgets
    chunkSizeWarningLimit: 200, // Reduced from 1000 to 200kb
    // Source maps optimization
    sourcemap: mode === "production" ? false : true, // Disable source maps in production for smaller builds
    // Additional optimizations
    target: "esnext",
    cssCodeSplit: true,
  },
  esbuild: {
    // Security: avoid eval in output
    define: {
      "process.env.NODE_ENV": mode === "production" ? '"production"' : '"development"',
    },
    // Remove console logs in production
    drop: mode === "production" ? ["console", "debugger"] : [],
    // Tree shaking optimizations
    treeShaking: true,
  },
  // Performance optimizations
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@tanstack/react-query",
      "@supabase/supabase-js",
      "react-router-dom",
      "clsx",
      "tailwind-merge",
    ],
    // Exclude large libraries from pre-bundling to enable better code splitting
    exclude: ["recharts"],
  },
}));
