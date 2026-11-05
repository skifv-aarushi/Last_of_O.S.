import { defineConfig, loadEnv, Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { createApi } from "./api/_app";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Expose .env / .env.local to the API handlers running inside the dev server
  Object.assign(process.env, loadEnv(mode, process.cwd(), ""));
  return {
  server: {
    host: "::",
    port: 8080,
    fs: {
      allow: ["./client", "./shared", "./index.html", "./public"],
      deny: [".env", ".env.*", "*.{crt,pem}", "**/.git/**", "server/**"],
    },
  },
  build: {
    outDir: "dist/spa",
  },
  plugins: [react(), expressPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
};
});

function expressPlugin(): Plugin {
  return {
    name: "express-plugin",
    apply: "serve", // Only apply during development (serve mode)
    configureServer(server) {
      const app = createApi();

      // Add Express app as middleware to Vite dev server
      server.middlewares.use(app);
    },
  };
}
