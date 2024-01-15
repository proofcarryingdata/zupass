import { readdirSync, existsSync } from "fs";
import path from "path";
import util from "util";
import * as childProcess from "child_process";
const exec = util.promisify(childProcess.exec);

const { PWD } = process.env;
const pathPostfix = "packages";
const basePath = PWD || "/";
const packagesPath = path.resolve(basePath, pathPostfix);

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

const groupsList = getDirList(packagesPath);

const validateInput = (input) => {
  if (input && input !== "") {
    return /^[a-zA-Z.-]+$/.test(input);
  }
  return false;
};

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

  plop.setActionType("validateFields", function (answers, config, plop) {
    const { group, name } = answers || {};
    const nameValid = validateInput(name);
    const groupValid = validateInput(group);
    if (!nameValid || !groupValid) {
      throw new Error(
        `[${!nameValid && "package name"}${
          !groupValid && ", group name"
        }}] invalid` // can refer to a conventions url here once ready
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
    return exec(`yarn`)
      .then(() => "dependencies installed successfully")
      .catch((err) => `error installing dependencies: ${err}`);
  });

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
        path: `${packagesPath}/{{kebabCase group}}/{{kebabCase name}}/package.json`
      },
      {
        type: "add",
        templateFile: "templates/tsconfig.json.hbs",
        path: `${packagesPath}/{{kebabCase group}}/{{kebabCase name}}/tsconfig.json`
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
