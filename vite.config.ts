import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 5173,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    // Define environment-specific variables
    'import.meta.env.VITE_ENABLE_SUBDOMAIN_ROUTING': mode === 'development' 
      ? JSON.stringify('true') 
      : JSON.stringify(process.env.VITE_ENABLE_SUBDOMAIN_ROUTING || 'false')
  },
  build: {
    minify: 'terser',
    terserOptions: {
      compress: {
        // Avoid using eval
        drop_console: mode === 'production',
        drop_debugger: mode === 'production',
      },
    },
    // Avoid using dynamic imports that use eval
    rollupOptions: {
      output: {
        manualChunks: {},
      }
    }
  },
  esbuild: {
    // Do not use eval in output
    define: { 'process.env.NODE_ENV': mode === 'production' ? '"production"' : '"development"' }
  }
}));
