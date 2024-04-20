import { CircuitSignal } from "./types";

export type ListMembershipModuleInputs = {
    valueHash: CircuitSignal;
    list: CircuitSignal[];
};

export type ListMembershipModuleInputNamesType = [
  "valueHash",
  "list"
];

export type ListMembershipModuleOutputs = { isMember: CircuitSignal };

export type ListMembershipModuleOutputNamesType = ["isMember"];
