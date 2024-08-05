#!/usr/bin/env node

import { program } from "commander";
import logSymbols from "log-symbols";
import "./timer.js";

program
  .name("pcd-perftest")
  .description("Command line tool for testing PCD performance.")
  .version("0.0.1", "-v, --version", "Show PCD perftest CLI version.")
  .configureOutput({
    outputError: (message) => {
      console.info(`\n ${logSymbols.error}`, message);
    }
  });

program.parse(process.argv);
