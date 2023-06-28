import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import chaiHttp from "chai-http";
import spies from "chai-spies";
import { overrideEnvironment, zuzaluTestingEnv } from "./util/env";

before(() => {
  chai.use(chaiAsPromised);
  chai.use(spies);
  chai.use(chaiHttp);

  overrideEnvironment(zuzaluTestingEnv);
});
