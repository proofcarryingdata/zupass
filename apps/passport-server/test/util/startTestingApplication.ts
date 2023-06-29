import { startApplication } from "../../src/application";
import { APIs, PCDPass } from "../../src/types";
import { mockAPIs } from "./mockApis";

export async function startTestingApp(
  apiOverrides?: Partial<APIs>
): Promise<PCDPass> {
  const application = await startApplication(mockAPIs(apiOverrides));
  return application;
}
