import { PODValue, podValueHash } from "@pcd/pod";
import { BABY_JUB_NEGATIVE_ONE } from "@pcd/util";
import { expect } from "chai";
import { WitnessTester } from "circomkit";
import "mocha";
import { poseidon2, poseidon3, poseidon4 } from "poseidon-lite";
import {
  MultiTupleModuleInputNamesType,
  MultiTupleModuleInputs,
  MultiTupleModuleOutputNamesType,
  MultiTupleModuleOutputs,
  computeTupleIndices,
  hashTuple,
  maxTupleArity,
  multiTupleHasher,
  padArray,
  requiredNumTuples,
  tupleHasher
} from "../src/index.js";
import { circomkit } from "./common.js";

describe("MultiTuple helpers should work", function () {
  it("should compute the right number of required tuples for different input tuple arities", () => {
    [
      [2, 1, 0],
      [3, 1, 0],
      [4, 1, 0],
      [2, 2, 1],
      [3, 3, 1],
      [4, 4, 1],
      [2, 5, 4],
      [3, 5, 2],
      [4, 5, 2]
    ].forEach((triple) =>
      expect(requiredNumTuples(triple[0], triple[1])).to.equal(triple[2])
    );
  });

  it("should compute the right maximum tuple arity representable by different parameters", () => {
    [
      [0, 2, 0],
      [0, 3, 0],
      [0, 4, 0],
      [1, 2, 2],
      [1, 3, 3],
      [1, 4, 4],
      [4, 2, 5],
      [2, 3, 5],
      [2, 4, 7]
    ].forEach((triple) =>
      expect(maxTupleArity(triple[0], triple[1])).to.equal(triple[2])
    );
  });

  it("should compute the right tuple indices for different input tuples and parameters", () => {
    [
      {
        paramTupleArity: 2,
        firstAvailableTupleIndex: 4,
        indices: [0, 1],
        result: [[0, 1]]
      },
      {
        paramTupleArity: 3,
        firstAvailableTupleIndex: 4,
        indices: [0, 1, 2],
        result: [[0, 1, 2]]
      },
      {
        paramTupleArity: 4,
        firstAvailableTupleIndex: 4,
        indices: [0, 1, 2, 3],
        result: [[0, 1, 2, 3]]
      },
      {
        paramTupleArity: 2,
        firstAvailableTupleIndex: 5,
        indices: [1, 3, 4],
        result: [
          [1, 3],
          [5, 4]
        ]
      },
      {
        paramTupleArity: 3,
        firstAvailableTupleIndex: 5,
        indices: [0, 1, 4, 2],
        result: [
          [0, 1, 4],
          [5, 2, 0]
        ]
      },
      {
        paramTupleArity: 4,
        firstAvailableTupleIndex: 6,
        indices: [3, 4, 2, 1, 5],
        result: [
          [3, 4, 2, 1],
          [6, 5, 3, 3]
        ]
      }
    ].forEach((obj) =>
      expect(
        computeTupleIndices(
          obj.paramTupleArity,
          obj.firstAvailableTupleIndex,
          obj.indices
        )
      ).to.deep.equal(obj.result)
    );
  });

  it("should compute the right tuple hashes", () => {
    const input = [98n, 37n, 0n, BABY_JUB_NEGATIVE_ONE];
    const inputAsInts: PODValue[] = input.map((value) => {
      return { type: "int", value };
    });
    const inputAsCryptographics: PODValue[] = input.map((value) => {
      return { type: "cryptographic", value };
    });
    const inputAsStrings: PODValue[] = input.map((value) => {
      return { type: "string", value: value.toString() };
    });
    for (const input of [inputAsInts, inputAsCryptographics, inputAsStrings]) {
      const inputHashes = input.map(podValueHash);
      [
        [2, input.slice(0, 2), poseidon2(inputHashes.slice(0, 2))],
        [3, input.slice(0, 3), poseidon3(inputHashes.slice(0, 3))],
        [4, input, poseidon4(inputHashes)],
        [
          2,
          input,
          poseidon2([
            poseidon2([
              poseidon2([inputHashes[0], inputHashes[1]]),
              inputHashes[2]
            ]),
            inputHashes[3]
          ])
        ],
        [
          3,
          input,
          poseidon3([
            poseidon3([inputHashes[0], inputHashes[1], inputHashes[2]]),
            inputHashes[3],
            inputHashes[0]
          ])
        ],
        [
          4,
          input.concat([input[1]]),
          poseidon4([
            poseidon4([
              inputHashes[0],
              inputHashes[1],
              inputHashes[2],
              inputHashes[3]
            ]),
            inputHashes[1],
            inputHashes[0],
            inputHashes[0]
          ])
        ]
      ]
        .map((triple) => triple as [number, PODValue[], bigint])
        .forEach((triple) =>
          expect(hashTuple(triple[0], triple[1])).to.equal(triple[2])
        );
    }
  });
});

describe("multituple.MultiTupleModule should work", function () {
  // Circuit compilation sometimes takes more than the default timeout of 2s.
  let circuit: WitnessTester<
    MultiTupleModuleInputNamesType,
    MultiTupleModuleOutputNamesType
  >;

  const MAX_TUPLES = 1;
  const TUPLE_ARITY = 3;
  const MAX_VALUES = 10;

  const sampleInput: MultiTupleModuleInputs = {
    tupleElements: [
      8905486818455134363060055817991647390962079139440460714076410595226736943033n,
      371570493675795085340917563256321114090422950170926983546930236206324642985n,
      21855291653660581372252244680535463430106492049961256436916646040420709922401n,
      17518217940872299898943856612951083413101473252068510221758291357642178243064n,
      19610499204834543146583882237191752133835393319355403157181111118356886459810n,
      2848699043425919377375312612580321790846723000544359289794392166790964760348n,
      15788926410388163208976704675946879822107295126039108337414263085457839536321n,
      6473385158056378321498166954089070167092286576993515546044886732291513707206n,
      10988313713063071867809108687964057220633556390518851184712222931695463056828n,
      12179220660789871085064982589191069349854593972663574521691268918938647150122n
    ],
    tupleIndices: [[0n, 3n, 5n]]
  };

  const sampleOutput: MultiTupleModuleOutputs = {
    tupleHashes: [
      15125314487994541926652962289334348955866307223539330915627677810216053745980n
    ]
  };

  this.beforeAll(async () => {
    circuit = await circomkit.WitnessTester("MultiTupleModule", {
      file: "multituple",
      template: "MultiTupleModule",
      params: [MAX_TUPLES, TUPLE_ARITY, MAX_VALUES]
    });
  });

  it("should produce expected output for one tuple", async () => {
    await circuit.expectPass(sampleInput, sampleOutput);
  });

  it("should produce expected output for multiple tuples", async () => {
    const elements: PODValue[] = [98n, 9867n, 227n, 3877n, 6536n, 2n].map(
      (value) => {
        return { type: "int", value };
      }
    );
    const maxTuples = 5;
    for (const tuple of [
      [1, 0],
      [0, 5, 2],
      [3, 1, 0, 2],
      [5, 2, 4, 3, 0],
      [4, 2, 1, 3, 0, 5]
    ]) {
      for (const tupleArity of [2, 3, 4]) {
        const inputs: MultiTupleModuleInputs = {
          tupleElements: elements.map(podValueHash),
          tupleIndices: padArray(
            computeTupleIndices(tupleArity, elements.length, tuple).map((x) =>
              x.map(BigInt)
            ),
            maxTuples,
            padArray([], tupleArity, 0n)
          )
        };
        const outputs: MultiTupleModuleOutputs = {
          tupleHashes: padArray(
            multiTupleHasher(
              tupleArity,
              tuple.map((i) => elements[i])
            ),
            maxTuples,
            tupleHasher(padArray([], tupleArity, podValueHash(elements[0])))
          )
        };

        circuit = await circomkit.WitnessTester("MultiTupleModule", {
          file: "multituple",
          template: "MultiTupleModule",
          params: [maxTuples, tupleArity, elements.length]
        });

        await circuit.expectPass(inputs, outputs);
      }
    }
  });
});
