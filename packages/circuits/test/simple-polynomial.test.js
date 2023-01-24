const hre = require("hardhat");
const { assert } = require("chai");

describe("simple-polynomial circuit", () => {
  let circuit;

  const sampleInput = {
    x: 5,
  };
  const sanityCheck = true;

  before(async () => {
    circuit = await hre.circuitTest.setup("simple-polynomial");
  });

  it("produces a witness with valid constraints", async () => {
    const witness = await circuit.calculateWitness(sampleInput, sanityCheck);
    await circuit.checkConstraints(witness);
  });

  it("has expected witness values", async () => {
    const witness = await circuit.calculateLabeledWitness(
      sampleInput,
      sanityCheck
    );
    assert.propertyVal(witness, "main.x", "5");
    assert.propertyVal(witness, "main.x_squared", "25");
    assert.propertyVal(witness, "main.x_cubed", undefined);
    assert.propertyVal(witness, "main.out", "127");
  });

  it("has the correct output", async () => {
    const expected = { out: 127 };
    const witness = await circuit.calculateWitness(sampleInput, sanityCheck);
    await circuit.assertOut(witness, expected);
  });
});
