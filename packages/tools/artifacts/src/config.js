import { readFileSync } from "fs";
import { dirname } from "path";
import { fileURLToPath } from "url";

const pkgPath = `${dirname(fileURLToPath(import.meta.url))}/..`;

export const pkg = JSON.parse(readFileSync(`${pkgPath}/package.json`, "utf8"));

export const R2_BUCKET_URL = "https://artifacts.pcdpass.xyz";
export const R2_BUCKET_NAME = "pcdpass-prod";
export const R2_API_URL =
  "https://d7f42eb033d2e26182d5abb1e233cdfb.r2.cloudflarestorage.com";

export const ARTIFACT_FILES = ["circuit.json", "circuit.zkey", "circuit.wasm"];

// Add new zk PCD packages here:
export const PCD_PACKAGES = ["zk-eddsa-event-ticket-pcd"];
