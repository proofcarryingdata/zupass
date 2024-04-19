import { NodeGlobalsPolyfillPlugin } from "@esbuild-plugins/node-globals-polyfill";
import { NodeModulesPolyfillPlugin } from "@esbuild-plugins/node-modules-polyfill";
import * as dotenv from "dotenv";
import { build, BuildOptions, context } from "esbuild";
import express from "express";
import fs from "fs";
import https from "https";
import { IS_LOCAL_HTTPS } from "./src/constants";

console.log("building kudosbot-client");

dotenv.config();

const consumerClientAppOpts: BuildOptions = {
  sourcemap: true,
  bundle: true,
  define: {
    "process.env.NODE_ENV": `'${process.env.NODE_ENV}'`
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
  .then(() => console.log("Built kudosbot artifacts"))
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
      const port = 3004;

      if (IS_LOCAL_HTTPS === "true") {
        console.log(`Serving local HTTPS...`);
        const app = express();
        app.use(express.static("public"));
        const httpsOptions = {
          key: fs.readFileSync("../certificates/dev.local-key.pem"),
          cert: fs.readFileSync("../certificates/dev.local.pem")
        };

        https.createServer(httpsOptions, app).listen(port, () => {
          console.log(`Serving Kudosbot client on https://0.0.0.0:${port}`);
        });
      } else {
        await ctx.serve({
          servedir: "public",
          port,
          host: "0.0.0.0"
        });
        console.log(`Serving Kudosbot client on http://0.0.0.0:${port}`);
      }
      break;
    default:
      throw new Error(`Unknown command ${command}`);
  }
}
