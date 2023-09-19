#!/usr/bin/env node

import { program } from "commander";
import Conf from "conf";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { readFileSync, existsSync } from "fs";
import logSymbols from "log-symbols";
import { dirname } from "path";
import { fileURLToPath } from "url";
import {
  downloadArtifacts,
  getAccessKey,
  getSecretAccessKey
} from "./utils.js";

const PCD_PACKAGES = ["zk-eddsa-ticket-pcd", "zk-eddsa-event-ticket-pcd"];
const R2_BUCKET_URL = "https://artifacts.pcdpass.xyz";
const R2_BUCKET_NAME = "pcdpass-prod";
const R2_API_URL =
  "https://d7f42eb033d2e26182d5abb1e233cdfb.r2.cloudflarestorage.com";

const packagePath = `${dirname(fileURLToPath(import.meta.url))}/..`;
const { name, description, version } = JSON.parse(
  readFileSync(`${packagePath}/package.json`, "utf8")
);

const config = new Conf({ projectName: name });

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
  .description("Download artifacts for 1 or all PCD supported packages.")
  .argument("[pcd-package]", "Supported PCD package.")
  .option(
    "-o, --output <output>",
    "Path to the directory where the output will be written [default: .]."
  )
  .action(async (packageName, { output: outputPath }) => {
    if (!outputPath) {
      outputPath = ".";
    }

    try {
      if (packageName) {
        if (!PCD_PACKAGES.includes(packageName)) {
          console.info(
            `\n ${logSymbols.error}`,
            `Error: package '${packageName}' is not supported\n`
          );

          process.exit(1);
        }

        await downloadArtifacts(
          R2_BUCKET_URL,
          packageName,
          `${outputPath}/artifacts`
        );
      } else {
        for await (const packageName of PCD_PACKAGES) {
          await downloadArtifacts(
            R2_BUCKET_URL,
            packageName,
            `${outputPath}/artifacts/${packageName}`
          );
        }
      }

      console.info(
        `\n ${logSymbols.success}`,
        `Artifacts have been downloaded on '${outputPath}/artifacts'\n`
      );
    } catch (error) {
      console.info(`\n ${logSymbols.error}`, `${error}\n`);

      process.exit(1);
    }
  });

program
  .command("upload")
  .description("Upload artifacts of a PCD package into an R2 instance.")
  .argument("[pcd-package]", "Supported PCD package.")
  .option(
    "-a, --artifacts <artifacts-path>",
    "Path to the directory containing the artifacts [default: artifacts]."
  )
  .action(async (packageName, { artifacts: artifactsPath }) => {
    let accessKey = config.get("access-key");
    let accessKeySecret = config.get("access-key-secret");

    if (!accessKey || !accessKeySecret) {
      accessKey = await getAccessKey();
      accessKeySecret = await getSecretAccessKey();

      config.set("access-key", accessKey);
      config.set("access-key-secret", accessKeySecret);
    }

    const client = new S3Client({
      credentials: {
        accessKeyId: accessKey,
        secretAccessKey: accessKeySecret
      },
      region: "auto",
      endpoint: R2_API_URL
    });

    if (!artifactsPath) {
      artifactsPath = "artifacts";
    }

    if (!packageName) {
      console.info(
        `\n ${logSymbols.error}`,
        `Error: you must define a valid PCD package\n`
      );

      process.exit(1);
    }

    if (!PCD_PACKAGES.includes(packageName)) {
      console.info(
        `\n ${logSymbols.error}`,
        `Error: package '${packageName}' is not supported\n`
      );

      process.exit(1);
    }

    if (!existsSync(`${artifactsPath}`)) {
      console.info(
        `\n ${logSymbols.error}`,
        `Error: The '${artifactsPath}' folder does not exist\n`
      );

      process.exit(1);
    }

    if (!existsSync(`${artifactsPath}/circuit.json`)) {
      console.info(
        `\n ${logSymbols.error}`,
        `Error: 'circuit.json' file does not exist within the '${artifactsPath}' directory\n`
      );

      process.exit(1);
    }

    if (!existsSync(`${artifactsPath}/circuit.zkey`)) {
      console.info(
        `\n ${logSymbols.error}`,
        `Error: 'circuit.zkey' file does not exist within the '${artifactsPath}' directory\n`
      );

      process.exit(1);
    }

    if (!existsSync(`${artifactsPath}/circuit.wasm`)) {
      console.info(
        `\n ${logSymbols.error}`,
        `Error: 'circuit.wasm' file does not exist within the '${artifactsPath}' directory\n`
      );

      process.exit(1);
    }

    try {
      const command1 = new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: `${packageName}/latest/circuit.wasm`,
        Body: readFileSync(`./${artifactsPath}/circuit.wasm`)
      });

      const command2 = new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: `${packageName}/latest/circuit.zkey`,
        Body: readFileSync(`./${artifactsPath}/circuit.zkey`)
      });

      const command3 = new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: `${packageName}/latest/circuit.json`,
        Body: readFileSync(`./${artifactsPath}/circuit.json`)
      });

      await client.send(command1);
      await client.send(command2);
      await client.send(command3);

      console.info(
        `\n ${logSymbols.success}`,
        "Artifacts have been uploaded\n"
      );
    } catch (error) {
      console.info(
        `\n ${logSymbols.error}`,
        `Error: unexpected error uploading files\n`
      );

      console.log(error);

      process.exit(1);
    }
  });

program
  .command("list-packages")
  .description(
    "List supported PCD packages containing artifacts for downloading."
  )
  .action(async () => {
    const content = PCD_PACKAGES.map((packageName) => packageName).join("\n");

    console.info(`\n${content}\n`);
  });

program.parse(process.argv);
