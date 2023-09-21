import { S3Client } from "@aws-sdk/client-s3";
import { exec } from "child_process";
import Conf from "conf";
import download from "download";
import inquirer from "inquirer";
import { promisify } from "util";
import { ARTIFACT_FILES, pkg, R2_API_URL } from "./config.js";

export const fsConf = new Conf({ projectName: pkg.name });

export async function downloadArtifacts(r2BucketUrl, packageName, outputPath) {
  for await (const fileName of ARTIFACT_FILES) {
    await download(
      `${r2BucketUrl}/${packageName}/latest/${fileName}`,
      outputPath
    );
  }
}

export async function confirm(message) {
  const { confirmation } = await inquirer.prompt({
    name: "confirmation",
    type: "confirm",
    message,
    default: true
  });

  return confirmation;
}

export async function getAccessKeyIdFromUser() {
  const { accessKeyId } = await inquirer.prompt({
    name: "accessKeyId",
    type: "input",
    message: "Enter the R2 access key:"
  });

  return accessKeyId;
}

export async function getSecretAccessKeyFromUser() {
  const { secretAccessKey } = await inquirer.prompt({
    name: "secretAccessKey",
    type: "input",
    message: "Enter the R2 access key secret:"
  });

  return secretAccessKey;
}

export async function getS3ClientInstance() {
  let accessKeyId = fsConf.get("access-key");
  let secretAccessKey = fsConf.get("access-key-secret");

  if (!accessKeyId || !secretAccessKey) {
    accessKeyId = await getAccessKeyIdFromUser();
    secretAccessKey = await getSecretAccessKeyFromUser();

    fsConf.set("access-key", accessKeyId);
    fsConf.set("access-key-secret", secretAccessKey);
  }

  return new S3Client({
    credentials: {
      accessKeyId,
      secretAccessKey
    },
    region: "auto",
    endpoint: R2_API_URL
  });
}

export async function executeCommand(command) {
  const { stdout, stderr } = await promisify(exec)(command);

  if (stdout) {
    console.log(stdout);
  }

  if (stderr) {
    console.error(stderr);
  }
}
