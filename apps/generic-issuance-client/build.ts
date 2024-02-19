import { NodeGlobalsPolyfillPlugin } from "@esbuild-plugins/node-globals-polyfill";
import { NodeModulesPolyfillPlugin } from "@esbuild-plugins/node-modules-polyfill";
import * as dotenv from "dotenv";
import { build, BuildOptions, context } from "esbuild";
import fs from "fs";

dotenv.config();

const genericIssuanceClientAppOpts: BuildOptions = {
  sourcemap: true,
  bundle: true,
  define: {
    "process.env.NODE_ENV": `'${process.env.NODE_ENV}'`,
    ...(process.env.STYTCH_PUBLIC_TOKEN !== undefined
      ? {
          "process.env.STYTCH_PUBLIC_TOKEN": JSON.stringify(
            process.env.STYTCH_PUBLIC_TOKEN
          )
        }
      : {}),
    "process.env.GENERIC_ISSUANCE_CLIENT_URL": `'${process.env.GENERIC_ISSUANCE_CLIENT_URL}'`,
    "process.env.PASSPORT_SERVER_URL": JSON.stringify(
      process.env.PASSPORT_SERVER_URL || "http://localhost:3002"
    ),
    "process.env.PASSPORT_CLIENT_URL": JSON.stringify(
      process.env.PASSPORT_CLIENT_URL || "http://localhost:3000"
    ),
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
    ...(process.env.PODBOX_TITLE_TAG !== undefined
      ? {
          "process.env.PODBOX_TITLE_TAG": JSON.stringify(
            process.env.PODBOX_TITLE_TAG
          )
        }
      : {})
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
  .then(() => console.log("Built Podbox client"))
  .catch((err) => console.error(err));

async function run(command: string): Promise<void> {
  switch (command) {
    case "build":
      const clientRes = await build({
        ...genericIssuanceClientAppOpts,
        minify: true
      });
      console.error("Built", clientRes);

      // Bundle size data for use with https://esbuild.github.io/analyze/
      fs.writeFileSync(
        `${genericIssuanceClientAppOpts.outdir}/bundle-size.json`,
        JSON.stringify(clientRes.metafile)
      );

      break;
    case "dev":
      const ctx = await context(genericIssuanceClientAppOpts);
      await ctx.watch();

      const options = {
        host: "0.0.0.0",
        port: 3005,
        servedir: "public"
      };

      const { host, port } = await ctx.serve(options);

      console.log(`Serving generic issuance client on http://${host}:${port}`);
      break;
    default:
      throw new Error(`Unknown command ${command}`);
  }
}
