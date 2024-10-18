import { startApplication } from "../../src/application";
import { APIs, ServerMode, Zupass } from "../../src/types";

export async function startTestingApp(
  apiOverrides?: Partial<APIs>
): Promise<Zupass> {
  const application = await startApplication(ServerMode.UNIFIED, apiOverrides);
  return application;
}
