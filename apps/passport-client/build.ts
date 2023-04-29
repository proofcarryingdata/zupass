import { NodeGlobalsPolyfillPlugin } from "@esbuild-plugins/node-globals-polyfill";
import { NodeModulesPolyfillPlugin } from "@esbuild-plugins/node-modules-polyfill";
import * as dotenv from "dotenv";
import { build, BuildOptions, context } from "esbuild";
import http from "http";

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
  define,
};

const serviceWorkerOpts: BuildOptions = {
  tsconfig: "./service-worker-tsconfig.json",
  bundle: true,
  entryPoints: ["src/service-worker.ts"],
  plugins: [
    NodeModulesPolyfillPlugin(),
    NodeGlobalsPolyfillPlugin({
      process: true,
      buffer: true,
    }),
  ],
  // The output directory here needs to be `public/` rather than
  // `public/js` in order for the service worker to be served from
  // the root of the website, which is necessary because service
  // workers are only able to be attached to the same scope as they
  // themselves are served from.
  outdir: "public/",
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
      const serviceWorkerRes = await build({
        ...serviceWorkerOpts,
        minify: true,
      });
      console.error("Built", serviceWorkerRes);
      break;
    case "dev":
      const serviceWorkerCtx = await context(serviceWorkerOpts);
      await serviceWorkerCtx.watch();

      const ctx = await context(passportAppOpts);
      await ctx.watch();

      const { host } = await ctx.serve({
        servedir: "public",
        port: 2999,
        host: "0.0.0.0",
      });

      // Then start a proxy server on port 3000
      console.log("starting server");
      http
        .createServer((req, res) => {
          const options = {
            hostname: host,
            port: 2999,
            path: req.url,
            method: req.method,
            headers: req.headers,
          };

          console.log(`${options.method} - ${options.path}`);

          const proxyReq = http.request(options, (proxyRes) => {
            if (options.path === "/js/service-worker.js") {
              console.log("updating content type");
              // proxyRes.headers["content-type"] = "application/javascript";
              proxyRes.headers["Service-Worker-Allowed"] = "/";
            }

            res.writeHead(proxyRes.statusCode, proxyRes.headers);
            proxyRes.pipe(res, { end: true });
          });

          req.pipe(proxyReq, { end: true });
        })
        .listen(3000);

      console.log(`Serving passport client on ${host}`);
      break;
    default:
      throw new Error(`Unknown command ${command}`);
  }
}
