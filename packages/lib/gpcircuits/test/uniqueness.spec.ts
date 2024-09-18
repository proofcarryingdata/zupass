import { BABY_JUB_NEGATIVE_ONE } from "@pcd/util";
import { WitnessTester } from "circomkit";
import "mocha";
import {
  UniquenessModuleInputNamesType,
  UniquenessModuleOutputNamesType
} from "../src";
import { circomkit } from "./common";

const circuit = async (
  numElements: number
): Promise<
  WitnessTester<UniquenessModuleInputNamesType, UniquenessModuleOutputNamesType>
> =>
  circomkit.WitnessTester("UniquenessModule", {
    file: "uniqueness",
    template: "UniquenessModule",
    params: [numElements]
  });

describe("uniqueness.UniquenessModule should work", async function () {
  it("should return 1 for unique list elements", async () => {
    const lists = [
      [1n],
      [1n, 2n],
      [47n, 27n, 11n],
      [898n, 8283n, 16n],
      [1923n, 2736n, 192n, 837n]
    ];

    for (const list of lists) {
      await circuit(list.length).then((c) =>
        c.expectPass({ values: list }, { valuesAreUnique: 1n })
      );
    }
  });

  it("should return 0 for non-unique list elements", async () => {
    const lists = [
      [1n, 1n],
      [47n, 47n, 11n],
      [47n, 11n, 47n],
      [11n, 47n, 47n],
      [1923n, 1923n, 192n, 837n],
      [192n, 837n, 1923n, 1923n],
      [1923n, 837n, 1923n, 192n],
      [837n, 1923n, 192n, 1923n],
      [
        1n << 250n,
        (1n << 251n) + 5n,
        BABY_JUB_NEGATIVE_ONE,
        12348712934821734981n,
        BABY_JUB_NEGATIVE_ONE - 1n,
        BABY_JUB_NEGATIVE_ONE - 7n,
        987123948273498234729384273498273n,
        6473467364736473647348923847239487n,
        1233439487878787n,
        1n << 250n
      ],
      [
        1n << 250n,
        (1n << 251n) + 5n,
        BABY_JUB_NEGATIVE_ONE,
        12348712934821734981n,
        BABY_JUB_NEGATIVE_ONE - 1n,
        BABY_JUB_NEGATIVE_ONE - 7n,
        BABY_JUB_NEGATIVE_ONE,
        6473467364736473647348923847239487n,
        1233439487878787n,
        48738473658934759238472938n
      ]
    ];

    for (const list of lists) {
      await circuit(list.length).then((c) =>
        c.expectPass({ values: list }, { valuesAreUnique: 0n })
      );
    }
  });
});
