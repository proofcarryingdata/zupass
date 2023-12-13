import { PCD, PCDPackage, SerializedPCD } from "@pcd/pcd-types";
import JSONBig from "json-bigint";
import { v4 as uuid } from "uuid";

export const InputTestPCDTypeName = "input-test-pcd";

export type InputTestPCDArgs = Record<string, never>;

export interface InputTestPCDClaim {}

export type InputTestPCDProof = undefined;

export class InputTestPCD implements PCD<InputTestPCDClaim, InputTestPCDProof> {
  type = InputTestPCDTypeName;
  claim: InputTestPCDClaim;
  proof: InputTestPCDProof;
  id: string;

  public constructor(id: string, claim: InputTestPCDClaim) {
    this.claim = claim;
    this.proof = undefined;
    this.id = id;
  }
}

export async function prove(_args: InputTestPCDArgs): Promise<InputTestPCD> {
  return new InputTestPCD(uuid(), {});
}

export async function verify(_pcd: InputTestPCD): Promise<boolean> {
  return true;
}

export async function serialize(
  pcd: InputTestPCD
): Promise<SerializedPCD<InputTestPCD>> {
  return {
    type: InputTestPCDTypeName,
    pcd: JSONBig.stringify({
      type: pcd.type,
      id: pcd.id
    })
  } as SerializedPCD<InputTestPCD>;
}

export async function deserialize(serialized: string): Promise<InputTestPCD> {
  const parsed = JSONBig.parse(serialized);
  return new InputTestPCD(parsed.id, {});
}

/**
 * PCD-conforming wrapper for the Semaphore zero-knowledge protocol. You can
 * find documentation of Semaphore here: https://semaphore.appliedzkp.org/docs/introduction
 */
export const SemaphoreIdentityPCDPackage: PCDPackage<
  InputTestPCDClaim,
  InputTestPCDProof,
  InputTestPCDArgs
> = {
  name: InputTestPCDTypeName,
  prove,
  verify,
  serialize,
  deserialize
};
