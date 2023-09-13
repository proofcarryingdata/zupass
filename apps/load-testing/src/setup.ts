import { PCDCrypto } from "@pcd/passport-crypto";
import { Identity } from "@semaphore-protocol/identity";
import * as fs from "fs";
import * as path from "path";

const SAVED_DATA_DIR = path.join(process.cwd(), "DATA");

export interface Config {
  userCount: number;
}

export interface UserConfig {
  email: string;
  encryptionKey: string;
  serializedIdentity: string;
  salt: string;
}

export interface TestSetupData {
  config: Config;
  users: UserConfig[];
}

export interface TestRuntimeData {
  crypto: PCDCrypto;
}

export interface TestData {
  setupData: TestSetupData;
  runtimeData: TestRuntimeData;
}

async function setupLoadTestData(
  config: Config,
  runtimeData: TestRuntimeData
): Promise<TestSetupData> {
  const users: UserConfig[] = [];

  for (let i = 0; i < config.userCount; i++) {
    const identity = new Identity();

    users.push({
      email: `ivan+${Math.random()}@0xparc.org`,
      encryptionKey: runtimeData.crypto.generateRandomKey(),
      serializedIdentity: identity.toString(),
      salt: runtimeData.crypto.generateSalt()
    });
  }

  const data: TestSetupData = {
    config,
    users
  };

  return data;
}

function getConfigFilePath(config: Config): string {
  return path.join(SAVED_DATA_DIR, `${config.userCount}-users.json`);
}

async function saveLoadTestData(data: TestSetupData): Promise<void> {
  const stringified = JSON.stringify(data, null, 2);
  fs.mkdirSync(SAVED_DATA_DIR, { recursive: true });
  const filePath = getConfigFilePath(data.config);
  console.log(`SAVING TEST DATA TO ${filePath}`);
  fs.writeFileSync(filePath, stringified);
}

async function loadLoadTestData(
  config: Config
): Promise<TestSetupData | undefined> {
  try {
    const data = fs.readFileSync(getConfigFilePath(config)).toString();
    return JSON.parse(data);
  } catch (e) {
    return undefined;
  }
}

async function setupRuntimeData(): Promise<TestRuntimeData> {
  return {
    crypto: await PCDCrypto.newInstance()
  };
}

export async function getLoadTestData(config: Config): Promise<TestData> {
  const runtimeData = await setupRuntimeData();
  const savedData = await loadLoadTestData(config);

  if (savedData != null) {
    console.log("LOADED CACHED TEST DATA");
    return { setupData: savedData, runtimeData };
  }

  console.log("CACHE MISS - GENERATING NEW TEST DATA");
  const generatedData = await setupLoadTestData(config, runtimeData);
  await saveLoadTestData(generatedData);

  return { setupData: generatedData, runtimeData };
}
