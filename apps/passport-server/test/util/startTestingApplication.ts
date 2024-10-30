import { startApplication } from "../../src/application";
import { APIs, ServerMode, Zupass } from "../../src/types";
import { mockAPIs } from "./mockApis";

export async function startTestingApp(
  apiOverrides?: Partial<APIs>
): Promise<Zupass> {
  const application = await startApplication(
    ServerMode.UNIFIED,
    mockAPIs(apiOverrides)
  );
  return application;
}
