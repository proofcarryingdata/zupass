import { expect } from "chai";
import { WitnessTester } from "circomkit";
import "mocha";
import { poseidon2 } from "poseidon-lite";
import {
  CircuitSignal,
  ListMembershipModuleInputNamesType,
  ListMembershipModuleInputs,
  ListMembershipModuleOutputNamesType,
  ListMembershipModuleOutputs
} from "../src";
import { circomkit, extendedSignalArray } from "./common";

describe("list-membership.ListMembershipModule should work", function () {
  // Circuit compilation sometimes takes more than the default timeout of 2s.
  let circuit: WitnessTester<
    ListMembershipModuleInputNamesType,
    ListMembershipModuleOutputNamesType
  >;

  const MAX_ELEMENTS = 10;

  // Here the list of admissible values contains only 5 elements.
  const sampleList = [
    8905486818455134363060055817991647390962079139440460714076410595226736943033n,
    371570493675795085340917563256321114090422950170926983546930236206324642985n,
    21855291653660581372252244680535463430106492049961256436916646040420709922401n,
    17518217940872299898943856612951083413101473252068510221758291357642178243064n,
    19610499204834543146583882237191752133835393319355403157181111118356886459810n
  ];

  const sampleInput: ListMembershipModuleInputs = {
    value: sampleList[3],
    list: extendedSignalArray(sampleList, MAX_ELEMENTS, sampleList[0]) // We fill up the rest with the first element.
  };

  const sampleInput2: ListMembershipModuleInputs = {
    ...sampleInput,
    value: 0n
  };

  const sampleOutput: ListMembershipModuleOutputs = {
    isMember: +sampleList.includes(sampleInput.value)
  };

  const sampleOutput2: ListMembershipModuleOutputs = {
    isMember: +false
  };

  this.beforeAll(async () => {
    circuit = await circomkit.WitnessTester("ListMembershipModule", {
      file: "list-membership",
      template: "ListMembershipModule",
      params: [MAX_ELEMENTS]
    });
  });

  it("should successfully verify list membership", async () => {
    await circuit.expectPass(sampleInput, sampleOutput);
  });

  it("should successfully verify list non-membership", async () => {
    await circuit.expectPass(sampleInput2, sampleOutput2);
  });
});
