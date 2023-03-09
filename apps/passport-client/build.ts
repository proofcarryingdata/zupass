import { NodeGlobalsPolyfillPlugin } from "@esbuild-plugins/node-globals-polyfill";
import { NodeModulesPolyfillPlugin } from "@esbuild-plugins/node-modules-polyfill";

import { build, BuildOptions } from "esbuild";

build(getOptions(process.argv[2]));

function getOptions(mode: string): BuildOptions {
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

  switch (mode) {
    case "build":
      return { ...opts, minify: true };
    case "dev":
    //  return { ...opts, watch: true };
    default:
      throw new Error(`Unknown command ${mode}`);
  }
}
