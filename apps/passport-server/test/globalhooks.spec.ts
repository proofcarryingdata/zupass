import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import chaiHttp from "chai-http";
import spies from "chai-spies";

/**
 * This is executed once prior to the rest of the test suite.
 */
before(() => {
  chai.use(chaiAsPromised);
  chai.use(spies);
  chai.use(chaiHttp);
});
