import { program } from "commander";
import download from "download";
import { existsSync, writeFileSync } from "fs";
import logger from "js-logger";
import logSymbols from "log-symbols";
import { tmpdir } from "os";
import { zKey } from "@pcd/snarkjs";
import { pkg } from "../config.js";
import Spinner from "../spinner.js";
import { executeCommand, confirm } from "../utils.js";

logger.useDefaults();

program
  .command("generate")
  .description(
    "Generate zero-knowledge unsafe artifacts with a dummy trusted-setup (only for testing)."
  )
  .option(
    "-p, --ptau-power <power>",
    "Power of two of the maximum number of constraints that the ceremony can accept."
  )
  .option(
    "-o, --output <output>",
    "Path to the directory where the output will be written [default: artifacts]."
  )
  .action(async ({ ptauPower = 13, output: outputPath = "artifacts" }) => {
    const ptauFilePath = `${tmpdir()}/${
      pkg.name
    }/powersOfTau28_hez_final_${ptauPower}.ptau`;

    // Download the ptau file if it does not exist.
    if (!existsSync(ptauFilePath)) {
      const spinner = new Spinner(`Downloading ptau file from Hermez...`);

      spinner.start();

      try {
        const ptauUrl = `https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_${ptauPower}.ptau`;

        await download(ptauUrl, `${tmpdir()}/${pkg.name}`);

        spinner.stop();

        console.info(`${logSymbols.success}`, "Ptau file has been downloaded");
      } catch (error) {
        spinner.stop();

        console.info(`${logSymbols.error}`, `${error}`);

        process.exit(1);
      }
    }

    try {
      if (existsSync(outputPath)) {
        if (
          await confirm(
            `The '${outputPath}' directory already exists. Do you want to remove it?`
          )
        ) {
          // Remove old artifacts.
          await executeCommand(`rm -fr ${outputPath}`);
        } else {
          console.info(
            `${logSymbols.info}`,
            "You need to remove the old directory if you want to generate new artifacts"
          );

          process.exit(0);
        }
      }

      // Create the artifacts folder.
      await executeCommand(`mkdir ${outputPath}`);

      // Compile circuit.
      await executeCommand(
        `circom circuits/index.circom --r1cs --wasm -o ${outputPath}`
      );

      // Generate the first zkey file.
      await zKey.newZKey(
        `${outputPath}/index.r1cs`,
        ptauFilePath,
        `${outputPath}/index_0.zkey`,
        logger
      );

      // Dummy contribution.
      await zKey.contribute(
        `${outputPath}/index_0.zkey`,
        `${outputPath}/index_1.zkey`,
        "Unsafe devmode contribution",
        "Random text"
      );

      // Create the final zkey file.
      await zKey.beacon(
        `${outputPath}/index_1.zkey`,
        `${outputPath}/circuit.zkey`,
        "Final beacon",
        "0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f",
        10,
        logger
      );

      // Export the verification key.
      const verificationKey = await zKey.exportVerificationKey(
        `${outputPath}/circuit.zkey`,
        logger
      );

      writeFileSync(
        `${outputPath}/circuit.json`,
        JSON.stringify(verificationKey, null, 4)
      );

      // Remove unnecessary files.
      await executeCommand(
        `mv ${outputPath}/index_js/index.wasm ${outputPath}/circuit.wasm`
      );
      await executeCommand(`rm -fr ${outputPath}/index*`);

      console.info(
        `\n${logSymbols.success}`,
        "Dummy zero-knowledge artifacts have been generated"
      );

      process.exit(0);
    } catch (error) {
      console.info(`${logSymbols.error}`, `${error}`);

      process.exit(1);
    }
  });
