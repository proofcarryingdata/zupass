import { PCDPackage, SerializedPCD } from "@pcd/pcd-types";
import JSONBig from "json-bigint";
import { v4 as uuid } from "uuid";
import {
  InputTestPCD,
  InputTestPCDArgs,
  InputTestPCDClaim,
  InputTestPCDProof,
  InputTestPCDTypeName
} from "./InputTestPCD";

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
