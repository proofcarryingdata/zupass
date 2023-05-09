import { NodeGlobalsPolyfillPlugin } from "@esbuild-plugins/node-globals-polyfill";
import { NodeModulesPolyfillPlugin } from "@esbuild-plugins/node-modules-polyfill";
import * as dotenv from "dotenv";
import { build, BuildOptions, context } from "esbuild";
import fs from "fs";

dotenv.config();

const define = {
  "process.env.PASSPORT_SERVER_URL": JSON.stringify(
    process.env.PASSPORT_SERVER_URL || "http://localhost:3002"
  ),
  "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV || "development"),
  ...(process.env.ROLLBAR_TOKEN !== undefined
    ? {
        "process.env.ROLLBAR_TOKEN": JSON.stringify(process.env.ROLLBAR_TOKEN),
      }
    : {}),
};

const passportAppOpts: BuildOptions = {
  sourcemap: true,
  bundle: true,
  minify: false,
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
  define,
};

const containerOpts: BuildOptions = {
  sourcemap: true,
  bundle: true,
  minify: false,
  entryPoints: ["pages/container.tsx"],
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
  define,
};

run(process.argv[2])
  .then(() => console.log("Built passport client"))
  .catch((err) => console.error(err));

async function run(command: string) {
  switch (command) {
    case "build":
      const passportRes = await build({ ...passportAppOpts, minify: true });
      console.error("Built", passportRes);

      const containerRes = await build({...containerOpts})
      console.log("Built container");

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
