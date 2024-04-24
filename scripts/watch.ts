/**
 * Watches the project during development mode, and triggers builds of our
 * packages when they change.
 *
 * Begins by running a build of the packages, then sets up a watcher to run
 * the build again if any package changes.
 *
 * In parallel, runs the apps using their `dev` scripts, which will cause them
 * to reload/rebuild when they detect changes in their dependencies.
 */

import path from "path";
import { watch } from "turbowatch";
import {
  createPackageGraph,
  getPackageInfos,
  getWorkspaceRoot
} from "workspace-tools";
import { $ } from "zx";

// Prevent colors from being stripped out from child process output
process.env.FORCE_COLOR = "3";

const isUndefined = (value: any): value is undefined =>
  typeof value === "undefined";
const defined = <T>(value: T | undefined) => {
  if (isUndefined(value)) throw new Error("undefined");
  return value;
};

const main = async () => {
  const workspaceRoot = defined(getWorkspaceRoot(path.dirname(__filename)));
  const packageInfos = getPackageInfos(workspaceRoot);
  const packageGraph = createPackageGraph(packageInfos);

  // Find the paths for each of our packages
  const relativePaths = Object.fromEntries(
    packageGraph.packages.map((p) => [
      p,
      path.relative(
        workspaceRoot,
        path.dirname(packageInfos[p].packageJsonPath)
      )
    ])
  );

  // Build the root tsconfig.cjs.json and tsconfig.esm.json files.
  // Because these have references to all of our other TypeScript packages,
  // this builds all of the TypeScript packages under packages/*.
  // This does not build the apps, which have their own build commands.
  await $`yarn tsc -b tsconfig.cjs.json tsconfig.esm.json`;

  // See documentation at https://github.com/gajus/turbowatch
  watch({
    project: workspaceRoot,
    // Detect changes in any of the @pcd/ packages
    // This will ignore changes in apps, which are handled elsewhere
    triggers: [...new Set(packageGraph.packages).values()]
      .filter((p) => p.startsWith("@pcd/"))
      .map((p) => ({
        // Only trigger a rebuild if matching files change
        expression: [
          "allof",
          ["not", ["anyof", ["dirname", "node_modules"]]],
          ["dirname", path.join(relativePaths[p], "src")],
          [
            "anyof",
            ["match", "*.ts", "basename"],
            ["match", "*.tsx", "basename"],
            ["match", "*.js", "basename"],
            ["match", "*.json", "basename"],
            ["match", "*.wasm", "basename"],
            ["match", "*.svg", "basename"]
          ]
        ],
        name: relativePaths[p],
        initialRun: false,
        onChange: async ({ spawn, files }) => {
          console.log(
            `${relativePaths[p]}: changes detected: ${files.map((f) => f.name)}`
          );

          // Build the root tsconfig.cjs.json and tsconfig.esm.json files.
          // Because these have references to all of our other TypeScript
          // packages, this builds all of the TypeScript packages under
          // packages/*. This does not build the apps, which have their own
          // build commands.
          // Packages which do not have tsconfig.cjs.json or tsconfig.esm.json
          // files are not built here. These are the packages in the "tooling"
          // directory, which are either command-line tools like `artifacts` or
          // configuration packages like `tsconfig` and `eslint-config-custom`
          // which do not have their own build/transpilation outputs.
          await spawn`yarn tsc -b tsconfig.cjs.json tsconfig.esm.json`;
        }
      }))
  });

  // Run the dev builds for apps
  watch({
    project: workspaceRoot,
    triggers: [
      {
        expression: ["dirname", __dirname],
        // Marking this routine as non-interruptible will ensure that
        // the apps are not restarted when file changes are detected.
        interruptible: false,
        name: "start-apps",
        // Because this is not interruptible, there will never be a
        // 'change', and so the below only runs once, at startup.
        // The 'dev' commands for the apps have their own change
        // monitoring, e.g. using ts-node or nodemon. We could
        // replace that and handle it here, but it doesn't seem
        // necessary to.
        onChange: async ({ spawn }) => {
          await spawn`yarn turbo run dev --filter=!./apps/anon-message-client --filter=!./apps/anon-message-client --filter=!./examples/*`;
        },
        // Enabling this option modifies what Turbowatch logs and warns
        // you if your configuration is incompatible with persistent tasks.
        persistent: true
      }
    ]
  });
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
