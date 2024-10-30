import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    server: {
      deps: {
        // This is added to fix an issue where @zk-kit/eddsa-poseidon imports
        // a CommonJS module using import syntax, which causes a problem.
        // See https://github.com/vitest-dev/vitest/issues/4852 for more info.
        inline: ["@zk-kit/eddsa-poseidon"]
      }
    }
  }
});
