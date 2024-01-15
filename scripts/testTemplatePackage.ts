import { $ } from "zx";
import path from "path";
import { getWorkspaceRoot } from "workspace-tools";

// Prevent colors from being stripped out from child process output
process.env.FORCE_COLOR = "3";

async function main() {
  const workspaceRoot = getWorkspaceRoot(path.dirname(__filename));
  const testPackagePath = path.resolve(
    workspaceRoot,
    "packages/tools/test-package"
  );

  try {
    await $`yarn plop --no-progress --plopfile 'templates/package/plopfile.mjs' tools test-package`;
    await $`cd ${testPackagePath} && yarn build && yarn lint && yarn test`;
  } catch (p) {
    // Do nothing
  } finally {
    $`rm -rf ${testPackagePath}`;
  }
}

main().catch((error) => {
  process.exit(1);
});
