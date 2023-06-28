import { overrideEnvironment, zuzaluTestingEnv } from "./util/env";

before(() => {
  overrideEnvironment(zuzaluTestingEnv);
});
