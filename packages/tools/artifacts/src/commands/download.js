import { program } from "commander";
import { existsSync } from "fs";
import logSymbols from "log-symbols";
import { PCD_PACKAGES, R2_BUCKET_URL } from "../config.js";
import Spinner from "../spinner.js";
import { downloadArtifacts } from "../utils.js";

program
  .command("download")
  .description("Download artifacts for 1 or all PCD supported packages.")
  .argument("[pcd-package]", "Supported PCD package.")
  .option(
    "-o, --output <output>",
    "Path to the directory where the output will be written [default: artifacts]."
  )
  .option(
    "-nc, --no-clobber",
    "Prevent this command from overwriting existing files if they already exist."
  )
  .action(
    async (packageName, { output: outputPath = "artifacts", clobber }) => {
      if (!clobber && existsSync(outputPath)) {
        console.info(
          `${logSymbols.info}`,
          `The '${outputPath}' directory already exists, artifacts may already have been downloaded`
        );

        process.exit(0);
      }

      const spinner = new Spinner(`Downloading artifacts...`);

      spinner.start();

      try {
        if (packageName) {
          if (!PCD_PACKAGES.includes(packageName)) {
            spinner.stop();

            console.info(
              `${logSymbols.error}`,
              `Error: package '${packageName}' is not supported`
            );

            process.exit(1);
          }

          await downloadArtifacts(R2_BUCKET_URL, packageName, outputPath);
        } else {
          for await (const packageName of PCD_PACKAGES) {
            await downloadArtifacts(
              R2_BUCKET_URL,
              packageName,
              `${outputPath}/${packageName}`
            );
          }
        }

        spinner.stop();

        console.info(
          `${logSymbols.success}`,
          `Artifacts have been downloaded on '${outputPath}'`
        );
      } catch (error) {
        spinner.stop();

        console.info(`${logSymbols.error}`, `${error}`);

        process.exit(1);
      }
    }
  );
