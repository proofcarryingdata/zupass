import { GlobSync } from "glob";
import { readFileSync } from "node:fs";
import { defineConfig, Expression } from "turbowatch";

const packageJsonFiles = new GlobSync("packages/*/package.json").found;
console.log(packageJsonFiles);
type PathToPackageNameMap = Map<string, string>;

const allPackages = packageJsonFiles.reduce<PathToPackageNameMap>(
  (acc, current) => {
    try {
      const packageJson = readFileSync(current, "utf8");
      const packageJsonParsed = JSON.parse(packageJson) as {
        dependencies: Record<string, string>;
        name: string | undefined;
      };

      const packageName = packageJsonParsed.name;

      if (!packageName) {
        return acc;
      }

      acc.set(current, packageName);
      return acc;
    } catch (_) {}

    return acc;
  },
  new Map()
);

const dirList = [...allPackages.keys()].map(
  (dir) => ["dirname", dir.replace("/package.json", "")] satisfies Expression
);
console.log(dirList);
export default defineConfig({
  project: process.cwd(),
  triggers: [
    {
      expression: [
        "allof",
        ["not", ["anyof", ["dirname", "node_modules"], ["dirname", "dist"]]],
        ["anyof", ...dirList],
        [
          "anyof",
          ["match", "*.ts", "basename"],
          ["match", "*.tsx", "basename"],
          ["match", "*.js", "basename"]
        ]
      ],
      interruptible: true,
      name: "build",
      onChange: async ({ spawn, files, abortSignal }) => {
        const changedPackages = new Set<string>();
        for (const file of files) {
          const pkgJsonPath = file.name
            .replace(`${process.cwd()}/`, "")
            .replace(/\/src\/.*/, "/package.json");

          const packageName = allPackages.get(pkgJsonPath);

          if (!packageName) {
            continue;
          }

          changedPackages.add(packageName);
        }

        if (changedPackages.size === 0) {
          return;
        }

        await spawn`turbo run build --parallel --filter=${[
          ...changedPackages
        ].join(",")}`;
        if (abortSignal?.aborted) return;
      }
    }
  ]
});
