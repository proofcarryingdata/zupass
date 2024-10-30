import { NodeGlobalsPolyfillPlugin } from "@esbuild-plugins/node-globals-polyfill";
import { NodeModulesPolyfillPlugin } from "@esbuild-plugins/node-modules-polyfill";
import * as dotenv from "dotenv";
import { build, BuildOptions, context } from "esbuild";
import express from "express";
import fs from "fs";
import Handlebars from "handlebars";
import http from "http";
import https from "https";
import * as path from "path";
import { v4 as uuid } from "uuid";
import {
  ZUPASS_GPC_ARTIFACT_BASE_PATH,
  ZUPASS_GPC_ARTIFACT_PATH
} from "./src/sharedConstants";

dotenv.config();

const define = {
  "process.env.ONE_CLICK_LOGIN_ENABLED":
    process.env.ONE_CLICK_LOGIN_ENABLED === "true" ? '"true"' : '"false"',
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
  ...(process.env.ENABLE_LOCAL_DEV_SERVICE_WORKER !== undefined
    ? {
        "process.env.ENABLE_LOCAL_DEV_SERVICE_WORKER": JSON.stringify(
          process.env.ENABLE_LOCAL_DEV_SERVICE_WORKER
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
  ...(process.env.GPC_ARTIFACTS_CONFIG_OVERRIDE !== undefined
    ? {
        "process.env.GPC_ARTIFACTS_CONFIG_OVERRIDE": JSON.stringify(
          process.env.GPC_ARTIFACTS_CONFIG_OVERRIDE
        )
      }
    : {}),
  ...(process.env.ZAPP_RESTRICT_ORIGINS !== undefined
    ? {
        "process.env.ZAPP_RESTRICT_ORIGINS": JSON.stringify(
          process.env.ZAPP_RESTRICT_ORIGINS
        )
      }
    : {}),
  ...(process.env.ZAPP_ALLOWED_SIGNER_ORIGINS !== undefined
    ? {
        "process.env.ZAPP_ALLOWED_SIGNER_ORIGINS": JSON.stringify(
          process.env.ZAPP_ALLOWED_SIGNER_ORIGINS
        )
      }
    : {}),
  ...(process.env.EMBEDDED_ZAPPS !== undefined
    ? {
        "process.env.EMBEDDED_ZAPPS": JSON.stringify(process.env.EMBEDDED_ZAPPS)
      }
    : {}),
  ...(process.env.DEVCON_TICKET_QUERY_ORIGINS !== undefined
    ? {
        "process.env.DEVCON_TICKET_QUERY_ORIGINS": JSON.stringify(
          process.env.DEVCON_TICKET_QUERY_ORIGINS
        )
      }
    : {})
};

const APP_OUT_DIR = "public/js";
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
  outdir: APP_OUT_DIR,
  metafile: true,
  define,
  splitting: true,
  format: "esm",
  drop: process.env.DISABLE_CONSOLE_LOG === "true" ? ["console"] : []
};

const serviceWorkerOpts: BuildOptions = {
  tsconfig: "./src/worker/tsconfig.json",
  bundle: true,
  entryPoints: ["src/worker/service-worker.ts"],
  plugins: [NodeModulesPolyfillPlugin(), NodeGlobalsPolyfillPlugin({})],
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
  define: {
    ...define,
    "process.env.SW_ID": JSON.stringify(uuid()),
    "process.env.GENERATED_CHUNKS": JSON.stringify("[]")
  }
};

run(process.argv[2])
  .then(() => console.log("Built all Zupass client artifacts"))
  .catch((err) => console.error(err));

async function run(command: string): Promise<void> {
  clearBuildDirectory(APP_OUT_DIR);
  compileHtml();
  copyGPCArtifacts();

  switch (command) {
    case "build":
      const appRes = await build({ ...appOpts, minify: true });
      console.error("Built client");

      // Bundle size data for use with https://esbuild.github.io/analyze/
      fs.writeFileSync(
        `${appOpts.outdir}/bundle-size.json`,
        JSON.stringify(appRes.metafile)
      );

      // Create a array of generated chunks for use with the service worker
      const generatedChunks = Object.keys(appRes.metafile?.outputs || {})
        .filter((output) => !output.endsWith(".map")) // Exclude .map files
        .map((output) => output.replace("public", ""));

      const _serviceWorkerRes = await build({
        ...serviceWorkerOpts,
        define: {
          ...serviceWorkerOpts.define,
          "process.env.GENERATED_CHUNKS": JSON.stringify(
            JSON.stringify(generatedChunks)
          )
        },
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
        // start the esbuild server on a random port. this is the process
        // that watches the source files, rebuilds them, and serves/hosts
        // the built artifacts over HTTP. this is NOT the server that
        // developers will be hitting with their browsers during local
        // development. for that, we run a proxy server on port 3000 that
        // forwards requests to the esbuild server. The reason we do that
        // is so that we can also intercept requests to the one-click-preview
        // page, to emulate how it will behave in production. This is useful
        // because it allows developers to test the url-rewritten one-click-preview
        // flow in local development, which in particular lets them test the
        // service worker's offline caching behavior.
        const { host, port: hiddenPort } = await ctx.serve({
          servedir: "public",
          host: "0.0.0.0"
        });

        // start a proxy server on port 3000
        http
          .createServer(async (req, res) => {
            const url = new URL(req.url ?? "/", `http://${req.headers.host}`);

            // forward one-click-preview requests to the local passport-server/podbox-server
            if (url.pathname.startsWith("/one-click-preview")) {
              if (req.url?.includes("?slow")) {
                const delaySeconds = 30;
                console.log(
                  `proxying to passport server - simulating slow response ${delaySeconds}s - ${url.pathname}`
                );
                await sleep(1000 * delaySeconds);
                console.log(
                  `proxying to passport server - continuing slow response ${delaySeconds}s - ${url.pathname}`
                );
              } else {
                console.log(
                  `proxying to passport server - not slow response - ${url.pathname}`
                );
              }

              const proxyReq = http.request(
                {
                  hostname: host,
                  port: 3002,
                  path: "/generic-issuance" + req.url,
                  method: req.method,
                  headers: req.headers
                },
                (proxyRes) => {
                  res.writeHead(proxyRes.statusCode ?? 200, proxyRes.headers);
                  proxyRes.pipe(res, { end: true });
                }
              );

              proxyReq.on("error", (err) => {
                console.error(
                  "Error proxying to passport server:",
                  err.message
                );
                res.writeHead(502, { "Content-Type": "text/plain" });
                res.end("Failed to connect to passport server");
              });

              // Forward the body of the request to esbuild
              req.pipe(proxyReq, { end: true });

              return;
            }

            // Forward each incoming request to esbuild
            const proxyReq = http.request(
              {
                hostname: host,
                port: hiddenPort,
                path: req.url,
                method: req.method,
                headers: req.headers
              },
              (proxyRes) => {
                res.writeHead(proxyRes.statusCode ?? 200, proxyRes.headers);
                proxyRes.pipe(res, { end: true });
              }
            );

            // Forward the body of the request to esbuild
            req.pipe(proxyReq, { end: true });
          })
          .listen(3000);

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

function copyGPCArtifacts(): void {
  fs.rmSync(path.join("public" + ZUPASS_GPC_ARTIFACT_BASE_PATH), {
    recursive: true,
    force: true
  });
  fs.cpSync(
    path.join("../../node_modules/@pcd/proto-pod-gpc-artifacts"),
    path.join("public" + ZUPASS_GPC_ARTIFACT_PATH),
    { recursive: true }
  );
}

// Function to clear the previous build directory
function clearBuildDirectory(outDir: string): void {
  fs.rmSync(outDir, { recursive: true, force: true });
  console.log(`Cleared build directory: ${outDir}`);
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
