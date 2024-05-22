import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import spies from "chai-spies";
import deepEqualInAnyOrder from "deep-equal-in-any-order";

export const mochaHooks = {
  /**
   * This is executed once prior to the rest of the test suite.
   */
  beforeAll(): void {
    chai.config.truncateThreshold = 0;
    chai.use(chaiAsPromised);
    chai.use(spies);
    chai.use(deepEqualInAnyOrder);
  }
};
