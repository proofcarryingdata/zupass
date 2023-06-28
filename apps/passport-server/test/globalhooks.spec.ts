import { EnvironmentVariables } from "../src/types";
import { testingEnv } from "./util/env";

before(() => {
  overrideEnvironment(testingEnv);
});

function overrideEnvironment(envOverrides?: Partial<EnvironmentVariables>) {
  console.log("[INIT] overriding environment variables");
  for (const entry of Object.entries(envOverrides ?? {})) {
    process.env[entry[0]] = entry[1];
    console.log(
      "[INIT] overriding environment variable",
      entry[0],
      "with",
      entry[1]
    );
    if (entry[1] === undefined) {
      delete process.env[entry[0]];
    }
  }
  console.log("[INIT] finished overriding environment variables");
}
