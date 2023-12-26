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

import * as fs from "fs";
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

  // Do an initial build, which will also populate the Turborepo cache
  await $`yarn turbo build --output-logs=new-only --filter="@pcd/*"`;

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
            ["match", "*.wasm", "basename"]
          ]
        ],
        name: relativePaths[p],
        initialRun: false,
        onChange: async ({ spawn, files }) => {
          console.log(
            `${relativePaths[p]}: changes detected: ${files.map((f) => f.name)}`
          );

          const pkg = packageInfos[p];
          const pkgPath = path.dirname(pkg.packageJsonPath);

          const deps = [
            ...Object.keys(pkg.dependencies ?? {}),
            ...Object.keys(pkg.devDependencies ?? {})
          ];

          const references = deps.reduce((refs, dep) => {
            const depPkg = packageInfos[dep];
            const depPkgPath = path.dirname(depPkg.packageJsonPath);
            const depTsConfig = path.join(depPkgPath, "tsconfig.json");
            if (fs.existsSync(depTsConfig)) {
              refs.push(depTsConfig);
            }
            return refs;
          }, [] as string[]);

          console.log(references);
          // Tell Turbo to rebuild all @pcd/ packages, letting the cache skip
          // the ones that have not changed.
          //
          // If we decide not to use the cache, we could construct a dependency
          // graph based on the package the change has happened in, and filter
          // down to the packages we want to rebuild, but letting Turbo handle
          // this is easier for now.
          await spawn`yarn turbo build --output-logs=new-only --filter="@pcd/*"`;
        }
      }))
  });

  // Run the dev builds for apps
  // watch({
  //   project: workspaceRoot,
  //   triggers: [
  //     {
  //       expression: ["dirname", __dirname],
  //       // Marking this routine as non-interruptible will ensure that
  //       // the apps are not restarted when file changes are detected.
  //       interruptible: false,
  //       name: "start-apps",
  //       // Because this is not interruptible, there will never be a
  //       // 'change', and so the below only runs once, at startup.
  //       // The 'dev' commands for the apps have their own change
  //       // monitoring, e.g. using ts-node or nodemon. We could
  //       // replace that and handle it here, but it doesn't seem
  //       // necessary to.
  //       onChange: async ({ spawn }) => {
  //         await spawn`yarn dev:apps`;
  //       },
  //       // Enabling this option modifies what Turbowatch logs and warns
  //       // you if your configuration is incompatible with persistent tasks.
  //       persistent: true
  //     }
  //   ]
  // });
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
