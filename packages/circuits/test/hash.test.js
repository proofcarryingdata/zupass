const hre = require("hardhat");
const { assert } = require("chai");
const { buildMimcSponge } = require("circomlibjs");

describe("hash circuit", () => {
  let circuit;
  let mimc;

  const mimcKey = 0;
  const mimcNumOutputs = 1;
  const sampleInput = {
    x: "1764",
  };
  const sanityCheck = true;

  before(async () => {
    mimc = await buildMimcSponge();
    circuit = await hre.circuitTest.setup("hash");
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
    assert.propertyVal(witness, "main.x", sampleInput.x);
    // You might want to test some intermediate values in the mimc sponge
    assert.propertyVal(
      witness,
      "main.out",
      "15893827533473716138720882070731822975159228540693753428689375377280130954696"
    );
  });

  it("has the correct output", async () => {
    const mimcResult = mimc.multiHash([sampleInput.x], mimcKey, mimcNumOutputs);
    const expected = { out: mimc.F.toObject(mimcResult) };
    const witness = await circuit.calculateWitness(sampleInput, sanityCheck);
    await circuit.assertOut(witness, expected);
  });
});
