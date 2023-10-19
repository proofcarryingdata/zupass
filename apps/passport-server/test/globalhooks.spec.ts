import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import spies from "chai-spies";
import deepEqualInAnyOrder from "deep-equal-in-any-order";

/**
 * This is executed once prior to the rest of the test suite.
 */
before(() => {
  chai.use(chaiAsPromised);
  chai.use(spies);
  chai.use(deepEqualInAnyOrder);
});
