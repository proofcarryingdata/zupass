import { readdirSync, existsSync } from "fs";
import path from "path";
import util from "util";
import * as childProcess from "child_process";
import { getWorkspaceRoot, getPackageInfos } from "workspace-tools";

/**
 * Heavily inspired by https://github.com/lomri123/monorepo-component-generator/blob/main/plop/plopfile.mjs
 * This is a `plopfile`, used by Plop (https://plopjs.com/) to generate a
 * package scaffold from template files (see the `templates` directory).
*/

const exec = util.promisify(childProcess.exec);

const workspaceRoot = getWorkspaceRoot(process.env.PWD);
const packagesPath = path.resolve(workspaceRoot, "packages");
const packageInfo = getPackageInfos(packagesPath);

const tsConfigVersion = packageInfo["@pcd/tsconfig"].version;
const eslintConfigVersion = packageInfo["@pcd/eslint-config-custom"].version;

const toKebabCase = (string) =>
  string
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .toLowerCase();

const isFileExists = (filePath) => {
  try {
    return existsSync(filePath);
  } catch (err) {
    console.error("isFileExists error:", err);
  }
  return false;
};

const getDirList = (path) => {
  return readdirSync(path, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);
};

// The list of package "groups" (subdirectories of /packages/)
const groupsList = getDirList(packagesPath);

// Check validity of package names
const validateInput = (input) => {
  if (input && input !== "") {
    return /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/.test(input);
  }
  return false;
};

// Check that nothing exists at the package's intended location
const checkDuplicateComponent = (name) => {
  let message = "";
  const status = groupsList.some((group) => {
    const groupPath = path.resolve(packagesPath, group);
    const dirList = getDirList(groupPath);
    if (dirList.includes(name)) {
      message = `Duplicate package name ${name} at ${groupPath}`;
      return true;
    }
  });
  return { status, message };
};

export default function (plop) {
  plop.setDefaultInclude({ helpers: true });

  // Set up the "validateFields" action
  plop.setActionType("validateFields", function (answers, config, plop) {
    const { group, name } = answers || {};
    const nameValid = validateInput(name);
    const groupValid = validateInput(group);
    if (!nameValid || !groupValid) {
      console.log(name);
      throw new Error(
        `[${!nameValid ? "package name" : ""}${
          !groupValid ? ", group name" : ""
        }] invalid`
      );
    }
    const { status, message } = checkDuplicateComponent(
      name
        .replace(/([a-z])([A-Z])/g, "$1-$2")
        .replace(/[\s_]+/g, "-")
        .toLowerCase()
    );
    if (status) {
      throw new Error(message);
    }
    return "Valid package name!";
  });

  plop.setActionType("installDependencies", function (answers, config, plop) {
    console.log("installing dependencies");
    return exec(`yarn install --non-interactive`)
      .then(() => "dependencies installed successfully")
      .catch((err) => `error installing dependencies: ${err}`);
  });

  /**
   * Configures the "package" generator.
   * This prompts for two inputs, then:
   * - Validates the inputs
   * - Generates a set of files from templates
   * - Uses yarn to install dependencies for the new package
   */
  plop.setGenerator("package", {
    description: "Creating new package",
    prompts: [
      {
        type: "list",
        message: "Choose package group",
        name: "group",
        choices: groupsList
      },
      {
        type: "input",
        message: "Enter package name",
        name: "name"
      }
    ],
    actions: [
      {
        type: "validateFields"
      },
      {
        type: "add",
        templateFile: "templates/package.json.hbs",
        path: `${packagesPath}/{{kebabCase group}}/{{kebabCase name}}/package.json`,
        data: { tsConfigVersion, eslintConfigVersion }
      },
      {
        type: "add",
        templateFile: "templates/tsconfig.json.hbs",
        path: `${packagesPath}/{{kebabCase group}}/{{kebabCase name}}/tsconfig.json`
      },
      {
        type: "add",
        templateFile: "templates/turbo.json.hbs",
        path: `${packagesPath}/{{kebabCase group}}/{{kebabCase name}}/turbo.json`
      },
      {
        type: "add",
        templateFile: "templates/tsconfig.esm.json.hbs",
        path: `${packagesPath}/{{kebabCase group}}/{{kebabCase name}}/tsconfig.esm.json`
      },
      {
        type: "add",
        templateFile: "templates/tsconfig.cjs.json.hbs",
        path: `${packagesPath}/{{kebabCase group}}/{{kebabCase name}}/tsconfig.cjs.json`
      },
      {
        type: "add",
        templateFile: "templates/.eslintrc.js.hbs",
        path: `${packagesPath}/{{kebabCase group}}/{{kebabCase name}}/.eslintrc.js`
      },
      {
        type: "add",
        templateFile: "templates/.gitignore.hbs",
        path: `${packagesPath}/{{kebabCase group}}/{{kebabCase name}}/.gitignore`
      },
      {
        type: "add",
        templateFile: "templates/LICENSE.hbs",
        path: `${packagesPath}/{{kebabCase group}}/{{kebabCase name}}/LICENSE`
      },
      {
        type: "add",
        templateFile: "templates/typedoc.json.hbs",
        path: `${packagesPath}/{{kebabCase group}}/{{kebabCase name}}/typedoc.json`
      },
      {
        type: "add",
        templateFile: "templates/src/index.ts.hbs",
        path: `${packagesPath}/{{kebabCase group}}/{{kebabCase name}}/src/index.ts`
      },
      {
        type: "add",
        templateFile: "templates/test/base.spec.ts.hbs",
        path: `${packagesPath}/{{kebabCase group}}/{{kebabCase name}}/test/{{kebabCase name}}.spec.ts`
      },
      {
        type: "installDependencies"
      }
    ]
  });
}
