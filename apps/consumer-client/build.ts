import { NodeGlobalsPolyfillPlugin } from "@esbuild-plugins/node-globals-polyfill";
import { NodeModulesPolyfillPlugin } from "@esbuild-plugins/node-modules-polyfill";
import { build, BuildOptions, context } from "esbuild";
import fs from "fs";
import esbuildServerProxy from "./serve";

const consumerClientAppOpts: BuildOptions = {
  sourcemap: true,
  bundle: true,
  entryPoints: ["src/main.tsx"],
  plugins: [
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

run(process.argv[2])
  .then(() => console.log("Built consumer client"))
  .catch((err) => console.error(err));

async function run(command: string) {
  switch (command) {
    case "build":
      const clientRes = await build({ ...consumerClientAppOpts, minify: true });
      console.error("Built", clientRes);

      // Bundle size data for use with https://esbuild.github.io/analyze/
      fs.writeFileSync(
        `${consumerClientAppOpts.outdir}/bundle-size.json`,
        JSON.stringify(clientRes.metafile)
      );

      break;
    case "dev":
      const ctx = await context(consumerClientAppOpts);
      await ctx.watch();

      const options = {
        host: "0.0.0.0",
        port: 3003,
        servedir: "public"
      };

      const proxyPort = 3001;

      const { host } = await ctx.serve(options);

      esbuildServerProxy(options, proxyPort);

      console.log(`Serving consumer client on http://${host}:${proxyPort}`);
      break;
    default:
      throw new Error(`Unknown command ${command}`);
  }
}
