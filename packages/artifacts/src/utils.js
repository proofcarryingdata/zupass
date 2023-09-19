import download from "download";
import inquirer from "inquirer";

export async function downloadArtifacts(r2BucketUrl, packageName, outputPath) {
  await download(
    `${r2BucketUrl}/${packageName}/latest/circuit.zkey`,
    outputPath
  );
  await download(
    `${r2BucketUrl}/${packageName}/latest/circuit.wasm`,
    outputPath
  );
  await download(
    `${r2BucketUrl}/${packageName}/latest/circuit.json`,
    outputPath
  );
}

export async function getAccessKey() {
  const { accessKey } = await inquirer.prompt({
    name: "accessKey",
    type: "input",
    message: "Enter the R2 access key:"
  });

  return accessKey;
}

export async function getSecretAccessKey() {
  const { secretAccessKey } = await inquirer.prompt({
    name: "secretAccessKey",
    type: "input",
    message: "Enter the R2 access key secret:"
  });

  return secretAccessKey;
}
