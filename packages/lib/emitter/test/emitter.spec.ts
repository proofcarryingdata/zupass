import chai, { expect } from "chai";
import spies from "chai-spies";
import "mocha";
import { Emitter } from "../src";

chai.use(spies);

describe("Emitter", async function () {
  it("should call listeners on event emission", function () {
    const emitter = new Emitter<number>();

    const callback = function (_number: number) {
      //
    };

    const spy = chai.spy(callback);
    const unsubscribe = emitter.listen(spy);
    expect(spy).to.not.have.been.called;

    emitter.emit(5);
    expect(spy).to.have.been.called.with(5);

    unsubscribe();

    emitter.emit(7);
    expect(spy).to.not.have.been.called.with(7);
  });
});
