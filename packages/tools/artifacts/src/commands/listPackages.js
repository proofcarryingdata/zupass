import { PCD_PACKAGES } from "../config.js";
import { program } from "commander";

program
  .command("list-packages")
  .description(
    "List supported PCD packages containing artifacts for downloading."
  )
  .action(async () => {
    const content = PCD_PACKAGES.map((packageName) => packageName).join("\n");

    console.info(`\n${content}\n`);
  });
