import path from "path";
import { getWorkspaceRoot } from "workspace-tools";
import { $ } from "zx";

// Prevent colors from being stripped out from child process output
process.env.FORCE_COLOR = "3";

const isUndefined = (value: any): value is undefined =>
  typeof value === "undefined";
const defined = <T>(value: T | undefined) => {
  if (isUndefined(value)) throw new Error("undefined");
  return value;
};

/**
 * This script tests the process of generating a new package and running some
 * basic tests on it.
 * These are:
 * - building the package
 * - linting
 * - running tests
 * In each case, the template package's configuration ought to be the same as
 * the configuration used by other packages, even if the package's
 * implementation is a bare minimum (e.g. the template index.ts file contains
 * just enough code to pass the linter, and there is only one test file which
 * contains a single test that should always pass). The purpose is to ensure
 * that the configuration for newly-generated packages works out-of-the-box.
 */
async function main() {
  const workspaceRoot = defined<string>(
    getWorkspaceRoot(path.dirname(__filename))
  );
  const testPackagePath = path.resolve(
    workspaceRoot,
    "packages/tools/test-package"
  );

  // Run `generate-package`, which wraps `plop` to generate a package
  // By passing in `tools` and `test-package` here, we will generate a package
  // at packages/tools/test-package
  // This command will fail if that directory already exists, which may occur
  // if a previous run failed at the build/lint/test phase
  await $`yarn generate-package tools test-package`;
  // Run build, lint, and test commands
  // If any of these return non-zero exit codes, an exception will be thrown
  await $`cd ${testPackagePath} && yarn build && yarn lint && yarn test`;
  // If an exception occurred, files will not be removed. This will make it
  // possible to investigate the errors quickly. Once errors are fixed in the
  // template files, manually delete the generated package before running it
  // again.
  await $`rm -rf ${testPackagePath}`;
}

main().catch((error) => {
  process.exit(1);
});
