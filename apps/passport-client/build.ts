import { NodeGlobalsPolyfillPlugin } from "@esbuild-plugins/node-globals-polyfill";
import { NodeModulesPolyfillPlugin } from "@esbuild-plugins/node-modules-polyfill";
import * as dotenv from "dotenv";
import { build, BuildOptions, context } from "esbuild";
import express from "express";
import fs from "fs";
import Handlebars from "handlebars";
import https from "https";
import * as path from "path";
import { v4 as uuid } from "uuid";

dotenv.config();

const define = {
  "process.env.PASSPORT_SERVER_URL": JSON.stringify(
    process.env.PASSPORT_SERVER_URL || "http://localhost:3002"
  ),
  "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV || "development"),
  ...(process.env.ROLLBAR_TOKEN !== undefined
    ? {
        "process.env.ROLLBAR_TOKEN": JSON.stringify(process.env.ROLLBAR_TOKEN)
      }
    : {}),
  ...(process.env.ROLLBAR_ENV_NAME !== undefined
    ? {
        "process.env.ROLLBAR_ENV_NAME": JSON.stringify(
          process.env.ROLLBAR_ENV_NAME
        )
      }
    : {}),
  ...(process.env.FROGCRYPTO_SERVER_URL !== undefined
    ? {
        "process.env.FROGCRYPTO_SERVER_URL": JSON.stringify(
          process.env.FROGCRYPTO_SERVER_URL
        )
      }
    : {}),
  ...(process.env.DEFAULT_FEED_URLS !== undefined
    ? {
        "process.env.DEFAULT_FEED_URLS": JSON.stringify(
          process.env.DEFAULT_FEED_URLS
        )
      }
    : {}),
  ...(process.env.PODBOX_CLIENT_URL !== undefined
    ? {
        "process.env.PODBOX_CLIENT_URL": JSON.stringify(
          process.env.PODBOX_CLIENT_URL
        )
      }
    : {}),
  ...(process.env.STRICH_LICENSE_KEY !== undefined
    ? {
        "process.env.STRICH_LICENSE_KEY": JSON.stringify(
          process.env.STRICH_LICENSE_KEY
        )
      }
    : {})
};

const appOpts: BuildOptions = {
  sourcemap: true,
  bundle: true,
  entryPoints: ["pages/index.tsx"],
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
  metafile: true,
  define
};

const serviceWorkerOpts: BuildOptions = {
  tsconfig: "./src/worker/tsconfig.json",
  bundle: true,
  entryPoints: ["src/worker/service-worker.ts"],
  plugins: [
    NodeModulesPolyfillPlugin(),
    NodeGlobalsPolyfillPlugin({
      process: true,
      buffer: true
    })
  ],
  // The output directory here needs to be `public/` rather than
  // `public/js` in order for the service worker to be served from
  // the root of the website, which is necessary because service
  // workers are only able to be attached to the same scope as they
  // themselves are served from.
  outdir: "public/",
  // Service workers are only updated when the binary contents of their
  // files changes. The service worker for the website uses this environment
  // variable, which causes its contents to be changed every time `build.ts`
  // is invoked, so that each new production deploy invalidates the previous
  // service worker, which clears the website's application code (html, js, etc.),
  // so that clients are not forever stuck on one version of the code.
  define: { ...define, "process.env.SW_ID": JSON.stringify(uuid()) }
};

run(process.argv[2])
  .then(() => console.log("Built all Zupass client artifacts"))
  .catch((err) => console.error(err));

async function run(command: string): Promise<void> {
  compileHtml();

  switch (command) {
    case "build":
      const appRes = await build({ ...appOpts, minify: true });
      console.error("Built client");

      // Bundle size data for use with https://esbuild.github.io/analyze/
      fs.writeFileSync(
        `${appOpts.outdir}/bundle-size.json`,
        JSON.stringify(appRes.metafile)
      );

      const _serviceWorkerRes = await build({
        ...serviceWorkerOpts,
        minify: true
      });
      console.error("Built service worker");
      break;
    case "dev":
      const serviceWorkerCtx = await context(serviceWorkerOpts);
      await serviceWorkerCtx.watch();

      const ctx = await context(appOpts);
      await ctx.watch();

      const port = 3000;

      if (process.env.IS_LOCAL_HTTPS === "true") {
        console.log(`Serving local HTTPS...`);
        const app = express();
        app.use(express.static("public"));

        const httpsOptions = {
          key: fs.readFileSync("../certificates/dev.local-key.pem"),
          cert: fs.readFileSync("../certificates/dev.local.pem")
        };

        https.createServer(httpsOptions, app).listen(port, () => {
          console.log(`Serving Zupass client on https://dev.local:${port}`);
        });
      } else {
        const { host } = await ctx.serve({
          servedir: "public",
          port,
          host: "0.0.0.0"
        });
        console.log(`Serving Zupass client on ${host}:${port}`);
      }

      break;
    default:
      throw new Error(`Unknown command ${command}`);
  }
}

function compileHtml(): void {
  const indexHtmlTemplateSource = fs
    .readFileSync(path.join("public", "index.hbs"))
    .toString();
  const template = Handlebars.compile(indexHtmlTemplateSource);

  const html = template({});

  fs.writeFileSync(path.join("public", "index.html"), html);
}
