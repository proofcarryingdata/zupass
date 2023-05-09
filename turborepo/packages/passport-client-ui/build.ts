import { NodeGlobalsPolyfillPlugin } from "@esbuild-plugins/node-globals-polyfill";
import { NodeModulesPolyfillPlugin } from "@esbuild-plugins/node-modules-polyfill";
import { build, BuildOptions, context } from "esbuild";
import fs from "fs";

const passportAppOpts: BuildOptions = {
  sourcemap: true,
  bundle: true,
  entryPoints: ["pages/index.tsx"],
  plugins: [
    NodeModulesPolyfillPlugin(),
    NodeGlobalsPolyfillPlugin({
      process: true,
      buffer: true,
    }),
  ],
  loader: {
    ".svg": "dataurl",
  },
  outdir: "public/js",
  metafile: true,
};

run(process.argv[2])
  .then(() => console.log("Built passport client"))
  .catch((err) => console.error(err));

async function run(command: string) {
  switch (command) {
    case "build":
      const passportRes = await build({ ...passportAppOpts, minify: true });
      console.error("Built", passportRes);

      // Bundle size data for use with https://esbuild.github.io/analyze/
      fs.writeFileSync(
        `${passportAppOpts.outdir}/bundle-size.json`,
        JSON.stringify(passportRes.metafile)
      );

      break;
    case "dev":
      const ctx = await context(passportAppOpts);
      await ctx.watch();

      const { host } = await ctx.serve({
        servedir: "public",
        port: 3000,
        host: "0.0.0.0",
      });

      console.log(`Serving passport client on ${host}`);
      break;
    default:
      throw new Error(`Unknown command ${command}`);
  }
}
