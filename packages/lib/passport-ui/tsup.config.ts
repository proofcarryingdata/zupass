import { defineConfig } from "tsup";

export default defineConfig({
  loader: {
    ".svg": "dataurl"
  }
});
