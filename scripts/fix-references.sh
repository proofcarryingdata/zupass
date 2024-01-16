#!/bin/sh
# This script sets up TypeScript references between each workspace in our
# monorepo. With references in place, TypeScript's language server can track
# types across packages, even when those packages do not have type declaration
# files on-disk. The "generic" project references support this, and are held
# in the tsconfig.json file for each workspace.
#
# For packaging, we do two kinds of build for our packages: CJS and ESM.
# Because these have slightly different configuration, they need different
# tsconfig files - tsconfig.cjs.json, and tsconfig.esm.json respectively.
# For these files, we also pass "--includesRoot", which updates both a
# tsconfig.cjs.json and tsconfig.esm.json at the root of the repository.
# Because this has references to all of our packages, we can pass this file to
# `tsc -b` and have it build *all* packages simultaneously, in a single
# process. This is much faster and more memory-efficient than spawning a
# separate process to build each package (or two processes, one for
# transpilation and one for type generation, as we previously did).
#
# After updating, we run `prettier` to ensure that the formatting of the files
# is not negatively affected.
#
# This script should be run regularly to ensure that project references remain
# up to date, especially when:
# - Adding or removing dependencies between packages
# - Adding or removing entire packages from the repository

echo "Fixing references for base tsconfig (used by the TS Language Server/VSCode)\r\n"
yarn workspaces-to-typescript-project-references --tsconfigPath tsconfig.json && yarn prettier -w "{apps/*,packages/*/*}/tsconfig.esm.json"

echo "\r\nFixing references for ESM builds\r\n"
yarn workspaces-to-typescript-project-references --tsconfigPath tsconfig.esm.json --includesRoot && yarn prettier -w "{apps/*,packages/*/*}/tsconfig.esm.json"

echo "\r\nFixing references for CJS builds\r\n"
yarn workspaces-to-typescript-project-references --tsconfigPath tsconfig.cjs.json --includesRoot && yarn prettier -w "{apps/*,packages/*/*}/tsconfig.cjs.json"