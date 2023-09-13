import * as fs from "fs";
import * as path from "path";

const SAVED_DATA_DIR = path.join(process.cwd(), "DATA");

export interface LoadTestConfig {
  userCount: number;
}

export interface LoadTestSetupData {
  config: LoadTestConfig;
}

export interface LoadTestRuntimeData {}

export interface LoadTestData {
  setupData: LoadTestSetupData;
  runtimeData: LoadTestRuntimeData;
}

async function setupLoadTestData(
  config: LoadTestConfig,
  runtimeData: LoadTestRuntimeData
): Promise<LoadTestSetupData> {
  const data: LoadTestSetupData = {
    config
  };

  return data;
}

function getConfigFilePath(config: LoadTestConfig): string {
  return path.join(SAVED_DATA_DIR, `${config.userCount}-users.json`);
}

async function saveLoadTestData(data: LoadTestSetupData): Promise<void> {
  const stringified = JSON.stringify(data, null, 2);
  fs.mkdirSync(SAVED_DATA_DIR, { recursive: true });
  fs.writeFileSync(getConfigFilePath(data.config), stringified);
}

async function loadLoadTestData(
  config: LoadTestConfig
): Promise<LoadTestSetupData | undefined> {
  try {
    const data = fs.readFileSync(getConfigFilePath(config)).toString();
    return JSON.parse(data);
  } catch (e) {
    return undefined;
  }
}

async function setupRuntimeData(): Promise<LoadTestRuntimeData> {
  return {};
}

export async function getLoadTestData(
  config: LoadTestConfig
): Promise<LoadTestData> {
  const runtimeData = await setupRuntimeData();
  const savedData = await loadLoadTestData(config);

  if (savedData != null) {
    return { setupData: savedData, runtimeData };
  }

  const generatedData = await setupLoadTestData(config, runtimeData);
  await saveLoadTestData(generatedData);

  return { setupData: generatedData, runtimeData };
}
