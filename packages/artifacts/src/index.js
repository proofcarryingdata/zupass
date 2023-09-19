#!/usr/bin/env node

import { program } from "commander";
import download from "download";
import { readFileSync } from "fs";
import logSymbols from "log-symbols";
import { dirname } from "path";
import { fileURLToPath } from "url";

const packagePath = `${dirname(fileURLToPath(import.meta.url))}/..`;
const { description, version } = JSON.parse(
  readFileSync(`${packagePath}/package.json`, "utf8")
);

const artifactsURL = "https://artifacts.pcdpass.xyz";
const pcdPackages = ["zk-eddsa-ticket-pcd", "zk-eddsa-event-ticket-pcd"];

program
  .name("pcd-artifacts")
  .description(description)
  .version(version, "-v, --version", "Show PCD artifacts CLI version.")
  .configureOutput({
    outputError: (message) => {
      console.info(`\n ${logSymbols.error}`, message);
    }
  });

program
  .command("download")
  .description(
    "Download zero-knowledge artifacts for 1 or all PCD zk packages (wasm/zkey files)."
  )
  .argument("[pcd-package]", "Specific PCD package for artifact retrieval.")
  .option(
    "-o, --output <output>",
    "Path to the directory where the output will be written [default: .]."
  )
  .action(async (pcdPackage, { output }) => {
    if (!output) {
      output = ".";
    }

    try {
      if (pcdPackage) {
        download(
          `${artifactsURL}/${pcdPackage}/latest/circuit.zkey`,
          `${output}/artifacts`
        );
        download(
          `${artifactsURL}/${pcdPackage}/latest/circuit.wasm`,
          `${output}/artifacts`
        );
        download(
          `${artifactsURL}/${pcdPackage}/latest/circuit.json`,
          `${output}/artifacts`
        );
      } else {
        pcdPackages.map((packageName) => {
          download(
            `${artifactsURL}/${packageName}/latest/circuit.zkey`,
            `${output}/artifacts/${packageName}`
          );
          download(
            `${artifactsURL}/${packageName}/latest/circuit.wasm`,
            `${output}/artifacts/${packageName}`
          );
          download(
            `${artifactsURL}/${packageName}/latest/circuit.json`,
            `${output}/artifacts/${packageName}`
          );
        });
      }
    } catch {
      console.info(
        `\n ${logSymbols.error}`,
        "error: some error occurred while downloading the artifacts\n"
      );
    }
  });

program.parse(process.argv);
