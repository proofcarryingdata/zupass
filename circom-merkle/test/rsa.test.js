const hre = require("hardhat");
const { assert } = require("chai");

describe("rsa signature verification circuit", () => {
  let circuit;

  const sanityCheck = true;

  before(async () => {
    circuit = await hre.circuitTest.setup("main");
  });

  it("produces a witness with valid constraints", async () => {
    // const witness = await circuit.calculateWitness(sampleInput, sanityCheck);
    // await circuit.checkConstraints(witness);
  });

  it("has expected witness values", async () => {
    // const witness = await circuit.calculateLabeledWitness(
    //   sampleInput,
    //   sanityCheck
    // );
    // assert.propertyVal(witness, "main.x1", sampleInput.x1);
    // assert.propertyVal(witness, "main.x2", sampleInput.x2);
    // assert.propertyVal(witness, "main.x3", sampleInput.x3);
    // assert.propertyVal(witness, "main.x4", sampleInput.x4);
    // assert.propertyVal(witness, "main.y1", undefined);
    // assert.propertyVal(witness, "main.y2", undefined);
    // assert.propertyVal(witness, "main.out", "3");
  });

  it("has the correct output", async () => {
    // const expected = { out: 3 };
    // const witness = await circuit.calculateWitness(sampleInput, sanityCheck);
    // await circuit.assertOut(witness, expected);
  });
});
