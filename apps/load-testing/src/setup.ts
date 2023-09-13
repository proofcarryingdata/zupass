import * as fs from "fs";
import * as path from "path";

const SAVED_DATA_DIR = path.join(process.cwd(), "DATA");
const SAVED_DATA_FILE_NAME = "GENERATED.json";
const SAVED_DATA_FILE_PATH = path.join(SAVED_DATA_DIR, SAVED_DATA_FILE_NAME);

export interface LoadTestConfig {
  userCount: number;
}

export interface LoadTestSetupData {}

async function setupLoadTestData(): Promise<LoadTestSetupData> {
  const data: LoadTestSetupData = {};

  return data;
}

async function saveLoadTestData(data: LoadTestSetupData): Promise<void> {
  const stringified = JSON.stringify(data, null, 2);
  fs.mkdirSync(SAVED_DATA_DIR, { recursive: true });
  fs.writeFileSync(SAVED_DATA_FILE_PATH, stringified);
}

async function loadLoadTestData(): Promise<LoadTestSetupData | undefined> {
  try {
    const data = fs.readFileSync(SAVED_DATA_FILE_PATH).toString();
    return JSON.parse(data);
  } catch (e) {
    return undefined;
  }
}

export async function getLoadTestData(): Promise<LoadTestSetupData> {
  const savedData = await loadLoadTestData();

  if (savedData != null) {
    return savedData;
  }

  const generatedData = await setupLoadTestData();
  await saveLoadTestData(generatedData);

  return savedData;
}
