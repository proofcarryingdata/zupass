import { WitnessTester } from "circomkit";
import "mocha";
import {
  extendedSignalArray,
  ListMembershipModuleInputNamesType,
  ListMembershipModuleInputs,
  ListMembershipModuleOutputNamesType,
  ListMembershipModuleOutputs
} from "../src";
import { circomkit } from "./common";

describe("list-membership.ListMembershipModule should work", function () {
  // Circuit compilation sometimes takes more than the default timeout of 2s.
  let circuit: (
    n: number
  ) => Promise<
    WitnessTester<
      ListMembershipModuleInputNamesType,
      ListMembershipModuleOutputNamesType
    >
  >;

  // Here the list of admissible values contains only 5 elements.
  const sampleList = [
    8905486818455134363060055817991647390962079139440460714076410595226736943033n,
    371570493675795085340917563256321114090422950170926983546930236206324642985n,
    21855291653660581372252244680535463430106492049961256436916646040420709922401n,
    17518217940872299898943856612951083413101473252068510221758291357642178243064n,
    19610499204834543146583882237191752133835393319355403157181111118356886459810n
  ];

  // Sample input with arbitrary padding
  const sampleInput: (n: number) => ListMembershipModuleInputs = (n) => {
    return {
      list: extendedSignalArray(sampleList, n, sampleList[0]), // We fill up the rest with the first element.
      value: sampleList[3]
    };
  };

  // Non-membership case
  const sampleInput2: ListMembershipModuleInputs = {
    list: sampleList,
    value: 0n
  };

  const sampleOutput: ListMembershipModuleOutputs = {
    isMember: BigInt(+true)
  };

  const sampleOutput2: ListMembershipModuleOutputs = {
    isMember: BigInt(+false)
  };

  this.beforeAll(async () => {
    circuit = (n): Promise<WitnessTester> =>
      circomkit.WitnessTester("ListMembershipModule", {
        file: "list-membership",
        template: "ListMembershipModule",
        params: [n]
      });
  });

  it("should successfully verify list membership", async () => {
    await circuit(sampleList.length).then((c) =>
      c.expectPass(sampleInput(sampleList.length), sampleOutput)
    );
  });

  it("should successfully verify list membership with padding of various sizes", async () => {
    for (let i = 0; i < 10; i++) {
      const listLength = 2 * (i + 1) * sampleList.length;
      await circuit(listLength).then((c) =>
        c.expectPass(sampleInput(listLength), sampleOutput)
      );
    }
  });

  it("should successfully verify list non-membership", async () => {
    await circuit(sampleList.length).then((c) =>
      c.expectPass(sampleInput2, sampleOutput2)
    );
  });
});
