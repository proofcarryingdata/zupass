import { program } from "commander";
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
    "Path to the directory where the output will be written [default: .]."
  )
  .action(async (packageName, { output: outputPath }) => {
    if (!outputPath) {
      outputPath = ".";
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

      spinner.stop();

      console.info(
        `${logSymbols.success}`,
        `Artifacts have been downloaded on '${outputPath}/artifacts'`
      );
    } catch (error) {
      spinner.stop();

      console.info(`${logSymbols.error}`, `${error}`);

      process.exit(1);
    }
  });
