import { NodeGlobalsPolyfillPlugin } from "@esbuild-plugins/node-globals-polyfill";
import { NodeModulesPolyfillPlugin } from "@esbuild-plugins/node-modules-polyfill";
import * as dotenv from "dotenv";
import { build, BuildOptions, context } from "esbuild";

dotenv.config();

const opts: BuildOptions = {
  bundle: true,
  entryPoints: ["pages/index.tsx"],
  plugins: [
    NodeModulesPolyfillPlugin(),
    NodeGlobalsPolyfillPlugin({
      process: true,
    }),
  ],
  loader: {
    ".svg": "dataurl",
  },
  define: {
    "process.env.PASSPORT_SERVER_URL": JSON.stringify(
      process.env.PASSPORT_SERVER_URL || "http://localhost:3002"
    ),
    "process.env.NODE_ENV": JSON.stringify(
      process.env.NODE_ENV || "development"
    ),
    ...(process.env.ROLLBAR_TOKEN !== undefined
      ? {
          "process.env.ROLLBAR_TOKEN": JSON.stringify(
            process.env.ROLLBAR_TOKEN
          ),
        }
      : {}),
  },
  outdir: "public/js",
};

run(process.argv[2])
  .then(() => console.log("Built passport client"))
  .catch((err) => console.error(err));

async function run(command: string) {
  switch (command) {
    case "build":
      const res = await build({ ...opts, minify: true });
      console.error("Built", res);
      break;
    case "dev":
      const ctx = await context(opts);
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
