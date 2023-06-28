import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import chaiHttp from "chai-http";
import spies from "chai-spies";
import { overrideEnvironment, zuzaluTestingEnv } from "./util/env";

/**
 * This is executed once prior to the rest of the test suite.
 */
before(() => {
  chai.use(chaiAsPromised);
  chai.use(spies);
  chai.use(chaiHttp);

  overrideEnvironment(zuzaluTestingEnv);
});
