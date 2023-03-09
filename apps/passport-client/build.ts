import { NodeGlobalsPolyfillPlugin } from "@esbuild-plugins/node-globals-polyfill";
import { NodeModulesPolyfillPlugin } from "@esbuild-plugins/node-modules-polyfill";

import { build, BuildOptions, context } from "esbuild";

run(process.argv[2])
  .then(() => console.log("Done"))
  .catch((err) => console.error(err));

const opts: BuildOptions = {
  bundle: true,
  entryPoints: ["pages/index.tsx"],
  plugins: [
    NodeModulesPolyfillPlugin(),
    NodeGlobalsPolyfillPlugin({
      process: true,
    }),
  ],
  outdir: "public/js",
};

async function run(command: string) {
  switch (command) {
    case "build":
      return build({ ...opts, minify: true });
    case "dev":
      const ctx = await context(opts);
      ctx.watch();
      const fn = ctx.serve.bind(ctx) as any;
      const { host } = await fn({
        servedir: "public",
        port: 3000,
      });
      console.log(`Serving on ${host}`);
    default:
      throw new Error(`Unknown command ${command}`);
  }
}
