# Zupass Package Template

This directory contains template files for a new package, and a `plopfile` which can be used to generate a package.

## Usage

To generate a new package, run:
```
yarn plop --plop --plopfile 'templates/package/plopfile.mjs
```

You will then be prompted to select the package group (the subdirectory within the `packages` directory), and the package name. If the name is valid and does not collide with another package name, the package will be created automatically.

To generate a new package in a script, where it is not desirable to use keyboard input, the package group and name can be provided on the command line:
```
yarn plop --plop --plopfile 'templates/package/plopfile.mjs
```

## Template package contents

Template packages include all of the necessary `tsconfig`, `eslint` and `package.json` files. They also include a single `src` file and a test file containing one test that passes by default. Out of the box, `yarn build`, `yarn lint`, and `yarn test` all work.
