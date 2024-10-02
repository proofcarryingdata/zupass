import react from "@vitejs/plugin-react";
import dotenv from "dotenv";
import fs from "fs";
import { defineConfig } from "vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      include: ["process", "buffer", "constants"]
    })
  ],
  esbuild: {
    target: "es2020"
  },
  server: {
    port: 3000,
    hmr: false,
    ...(dotenv.config().parsed?.IS_LOCAL_HTTPS === "true"
      ? {
          https: {
            key: fs.readFileSync("../certificates/dev.local-key.pem"),
            cert: fs.readFileSync("../certificates/dev.local.pem")
          }
        }
      : {})
  },
  clearScreen: false,
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          libsodium: ["libsodium-wrappers-sumo", "libsodium-sumo"]
        }
      }
    }
  }
});
