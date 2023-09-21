#!/usr/bin/env node

import { program } from "commander";
import logSymbols from "log-symbols";
import "./commands/download.js";
import "./commands/generate.js";
import "./commands/listPackages.js";
import "./commands/upload.js";
import { pkg } from "./config.js";

program
  .name("pcd-artifacts")
  .description(pkg.description)
  .version(pkg.version, "-v, --version", "Show PCD artifacts CLI version.")
  .configureOutput({
    outputError: (message) => {
      console.info(`\n ${logSymbols.error}`, message);
    }
  });

program.parse(process.argv);
