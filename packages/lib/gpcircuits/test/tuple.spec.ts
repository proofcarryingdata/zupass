import { expect } from "chai";
import { WitnessTester } from "circomkit";
import "mocha";
import { poseidon2 } from 'poseidon-lite';
import {
  CircuitSignal,
  TupleModuleInputNamesType,
  TupleModuleInputs,
  TupleModuleOutputNamesType,
  TupleModuleOutputs
} from "../src";
import {
  circomkit,
} from "./common";

describe("tuple.TupleModule should work", function () {
  // Circuit compilation sometimes takes more than the default timeout of 2s.
  let circuit: WitnessTester<
    TupleModuleInputNamesType,
  TupleModuleOutputNamesType
  >;

  const MAX_ARITY = 10;
  
  const sampleInput: TupleModuleInputs = {
    valueHash: [8905486818455134363060055817991647390962079139440460714076410595226736943033n,
		371570493675795085340917563256321114090422950170926983546930236206324642985n,
		21855291653660581372252244680535463430106492049961256436916646040420709922401n,
		17518217940872299898943856612951083413101473252068510221758291357642178243064n,
		19610499204834543146583882237191752133835393319355403157181111118356886459810n,
		2848699043425919377375312612580321790846723000544359289794392166790964760348n,
		15788926410388163208976704675946879822107295126039108337414263085457839536321n,
		6473385158056378321498166954089070167092286576993515546044886732291513707206n,
		10988313713063071867809108687964057220633556390518851184712222931695463056828n,
		12179220660789871085064982589191069349854593972663574521691268918938647150122n],
    isValueEnabled: [1n,
		     0n,
		     0n,
		     1n,
		     1n,
		     0n,
		     1n,
		     1n,
		     0n,
		     0n]
  };
  
  const sampleOutput: TupleModuleOutputs = {
    tupleHash: sampleInput.valueHash
      .map(function(h,i) { return h*sampleInput.isValueEnabled[i]; })
      .reduce(function(a,b) { return poseidon2([a,b]); })
  };

  this.beforeAll(async () => {
    circuit = await circomkit.WitnessTester("TupleModule", {
      file: "tuple",
      template: "TupleModule",
      params: [MAX_ARITY]
    });
  });

  it("should produce expected output", async () => {
    await circuit.expectPass(sampleInput, sampleOutput);
  });
});
