import path from "path";
import { watch } from "turbowatch";
import {
  createPackageGraph,
  getPackageInfos,
  getWorkspaceRoot
} from "workspace-tools";
import { $ } from "zx";

const isUndefined = (value: any): value is undefined =>
  typeof value === "undefined";
const defined = <T>(value: T | undefined) => {
  if (isUndefined(value)) throw new Error("undefined");
  return value;
};
const buildGetLeaves = (dependents: { [key: string]: string[] }) => {
  const inner = (node: string): string[] => {
    if (isUndefined(dependents[node])) return [node];
    return dependents[node]
      .map(inner)
      .reduce((a, d) => a.concat(d), [])
      .reduce((a, d) => (a.includes(d) ? a : a.concat([d])), []);
  };
  return inner;
};
const buildMakeFilterFlags =
  (relativePaths: { [key: string]: string }) => (leaves: string[]) =>
    leaves.map((l) => `--filter=./${relativePaths[l]}`);

const main = async () => {
  const workspaceRoot = defined(getWorkspaceRoot(path.dirname(__filename)));
  const packageInfos = getPackageInfos(workspaceRoot);
  const packageGraph = createPackageGraph(packageInfos);
  const dependents = packageGraph.dependencies.reduce(
    (a, d) => ({
      ...a,
      [d.dependency]: (isUndefined(a[d.dependency])
        ? []
        : a[d.dependency]
      ).concat([d.name])
    }),
    {}
  );

  const getLeaves = buildGetLeaves(dependents);
  const leaves = Object.fromEntries(
    packageGraph.packages.map((p) => [p, getLeaves(p)])
  );
  const allLeaves = Object.values(leaves)
    .reduce((a, d) => a.concat(d), [])
    .reduce((a, d) => (a.includes(d) ? a : a.concat([d])), [] as string[]);
  const relativePaths = Object.fromEntries(
    packageGraph.packages.map((p) => [
      p,
      path.relative(
        workspaceRoot,
        path.dirname(packageInfos[p].packageJsonPath)
      )
    ])
  );
  const makeFilterFlags = buildMakeFilterFlags(relativePaths);

  const filterFlags = makeFilterFlags(allLeaves);
  await $`yarn turbo build --output-logs=new-only ${filterFlags}`;

  watch({
    project: workspaceRoot,
    triggers: packageGraph.packages.map((p) => ({
      expression: [
        "allof",
        ["not", ["anyof", ["dirname", "node_modules"], ["dirname", "lib"]]],
        ["dirname", path.join(relativePaths[p], "src")],
        ["match", "*.ts", "basename"]
      ],
      name: relativePaths[p],
      initialRun: false,
      onChange: async ({ spawn, files }) => {
        console.log(
          `${relativePaths[p]}: changes detected: ${files.map((f) => f.name)}`
        );
        const filterFlags = makeFilterFlags(leaves[p]);
        await spawn`yarn turbo build --output-logs=new-only ${filterFlags}`;
        console.log("Build complete");
      }
    }))
  });
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
