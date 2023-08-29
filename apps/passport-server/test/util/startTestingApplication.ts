import { startApplication } from "../../src/application";
import { APIs, PCDpass } from "../../src/types";
import { mockAPIs } from "./mockApis";

export async function startTestingApp(
  apiOverrides?: Partial<APIs>
): Promise<PCDpass> {
  const application = await startApplication(mockAPIs(apiOverrides));
  return application;
}
