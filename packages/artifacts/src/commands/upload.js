import { PutObjectCommand } from "@aws-sdk/client-s3";
import { program } from "commander";
import { existsSync, readFileSync } from "fs";
import logSymbols from "log-symbols";
import { PCD_PACKAGES, R2_BUCKET_NAME, ARTIFACT_FILES } from "../config.js";
import { getS3ClientInstance } from "../utils.js";
import Spinner from "../spinner.js";

program
  .command("upload")
  .description("Upload artifacts of a PCD package into an R2 instance.")
  .argument("[pcd-package]", "Supported PCD package.")
  .option(
    "-a, --artifacts <artifacts-path>",
    "Path to the directory containing the artifacts [default: artifacts]."
  )
  .action(async (packageName, { artifacts: artifactsPath = "artifacts" }) => {
    const client = await getS3ClientInstance();

    if (!packageName) {
      console.info(
        `${logSymbols.error}`,
        `Error: you must define a valid PCD package`
      );

      process.exit(1);
    }

    if (!PCD_PACKAGES.includes(packageName)) {
      console.info(
        `${logSymbols.error}`,
        `Error: package '${packageName}' is not supported`
      );

      process.exit(1);
    }

    if (!existsSync(artifactsPath)) {
      console.info(
        `${logSymbols.error}`,
        `Error: The '${artifactsPath}' folder does not exist`
      );

      process.exit(1);
    }

    for (const fileName of ARTIFACT_FILES) {
      if (!existsSync(`${artifactsPath}/circuit.json`)) {
        console.info(
          `${logSymbols.error}`,
          `Error: '${fileName}' file does not exist within the '${artifactsPath}' directory`
        );

        process.exit(1);
      }
    }

    const spinner = new Spinner(`Uploading artifacts...`);

    spinner.start();

    try {
      for await (const fileName of ARTIFACT_FILES) {
        const command = new PutObjectCommand({
          Bucket: R2_BUCKET_NAME,
          Key: `${packageName}/latest/${fileName}`,
          Body: readFileSync(`./${artifactsPath}/${fileName}`)
        });

        await client.send(command);
      }

      spinner.stop();

      console.info(`${logSymbols.success}`, "Artifacts have been uploaded");
    } catch (error) {
      spinner.stop();

      console.info(
        `${logSymbols.error}`,
        `Error: unexpected error uploading files`
      );

      console.log(error);

      process.exit(1);
    }
  });
