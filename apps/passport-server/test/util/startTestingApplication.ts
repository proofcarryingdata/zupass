import { startApplication } from "../../src/application";
import { PCDPass } from "../../src/types";
import { mockAPIs } from "./mockApis";

export async function startTestingApp(): Promise<PCDPass> {
  const application = await startApplication(mockAPIs());
  return application;
}
