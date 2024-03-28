import { NodeGlobalsPolyfillPlugin } from "@esbuild-plugins/node-globals-polyfill";
import { NodeModulesPolyfillPlugin } from "@esbuild-plugins/node-modules-polyfill";
import { build, BuildOptions, context } from "esbuild";
import fs from "fs";

const consumerClientAppOpts: BuildOptions = {
  sourcemap: true,
  bundle: true,
  define: {
    "process.env.NODE_ENV": `'${process.env.NODE_ENV}'`,
    "process.env.CONSUMER_SERVER_URL": `'${process.env.CONSUMER_SERVER_URL}'`,
    "process.env.ZUPASS_CLIENT_URL_CONSUMER": `'${process.env.ZUPASS_CLIENT_URL_CONSUMER}'`,
    "process.env.ZUPASS_SERVER_URL_CONSUMER": `'${process.env.ZUPASS_SERVER_URL_CONSUMER}'`
  },
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
  .then(() => console.log("Built consumer client artifacts"))
  .catch((err) => console.error(err));

async function run(command: string): Promise<void> {
  switch (command) {
    case "build":
      const clientRes = await build({ ...consumerClientAppOpts, minify: true });
      console.error("Built client");

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
        port: 3001,
        servedir: "public"
      };

      const { host, port } = await ctx.serve(options);

      console.log(`Serving consumer client on http://${host}:${port}`);
      break;
    default:
      throw new Error(`Unknown command ${command}`);
  }
}
