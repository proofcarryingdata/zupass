import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import spies from "chai-spies";

export const mochaHooks = {
  /**
   * This is executed once prior to the rest of the test suite.
   */
  beforeAll(): void {
    chai.use(chaiAsPromised);
    chai.use(spies);
  }
};
