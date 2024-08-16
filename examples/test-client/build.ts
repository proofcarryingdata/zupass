import { NodeGlobalsPolyfillPlugin } from "@esbuild-plugins/node-globals-polyfill";
import { NodeModulesPolyfillPlugin } from "@esbuild-plugins/node-modules-polyfill";
import * as dotenv from "dotenv";
import { build, BuildOptions, context } from "esbuild";
import { tailwindPlugin } from "esbuild-plugin-tailwindcss";
import fs from "fs";

dotenv.config();

const define = {
  "process.env.ZUPASS_URL": JSON.stringify(
    process.env.ZUPASS_URL ?? "https://zupass.org"
  )
};

const testClientAppOpts: BuildOptions = {
  sourcemap: true,
  bundle: true,
  define: {
    ...define,
    "process.env.NODE_ENV": `'${process.env.NODE_ENV}'`
  },
  entryPoints: ["src/main.tsx"],
  plugins: [
    tailwindPlugin(),
    NodeModulesPolyfillPlugin(),
    NodeGlobalsPolyfillPlugin({
      process: true,
      buffer: true
    })
  ],
  loader: {
    ".svg": "dataurl"
  },
  outdir: "public/js",
  metafile: true
};

run(process.argv[2] ?? "")
  .then(() => console.log("Built test client artifacts"))
  .catch((err) => console.error(err));

async function run(command: string): Promise<void> {
  switch (command) {
    case "build":
      const clientRes = await build({
        ...testClientAppOpts,
        minify: true
      });
      console.error("Built client");

      // Bundle size data for use with https://esbuild.github.io/analyze/
      fs.writeFileSync(
        `${testClientAppOpts.outdir}/bundle-size.json`,
        JSON.stringify(clientRes.metafile)
      );

      break;
    case "dev":
      const ctx = await context(testClientAppOpts);
      await ctx.watch();

      const options = {
        host: "0.0.0.0",
        port: 3200,
        servedir: "public"
      };

      const { host, port } = await ctx.serve(options);

      console.log(`Serving test client on http://${host}:${port}`);
      break;
    default:
      throw new Error(`Unknown command ${command}`);
  }
}
