import { ArgumentTypeName } from "@pcd/pcd-types";
import { RSAPCDPackage } from "@pcd/rsa-pcd";
import "mocha";
import NodeRSA from "node-rsa";
import { v4 as uuid } from "uuid";

export async function newPCD(id?: string) {
  id = id ?? uuid();
  const pkey = new NodeRSA({ b: 512 });

  const pcd = await RSAPCDPackage.prove({
    id: {
      argumentType: ArgumentTypeName.String,
      value: id
    },
    privateKey: {
      argumentType: ArgumentTypeName.String,
      value: pkey.exportKey("private")
    },
    signedMessage: {
      argumentType: ArgumentTypeName.String,
      value: "signed message"
    }
  });

  return pcd;
}
