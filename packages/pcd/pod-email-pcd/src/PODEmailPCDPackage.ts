import { DisplayOptions, PCDPackage, SerializedPCD } from "@pcd/pcd-types";
import { POD, PODEntries } from "@pcd/pod";
import {
  PODEmailPCD,
  PODEmailPCDArgs,
  PODEmailPCDClaim,
  PODEmailPCDProof,
  PODEmailPCDRequiredEntries,
  PODEmailPCDTypeName
} from "./PODEmailPCD";

function loadPOD(pcd: PODEmailPCD): POD {
  return POD.load(
    pcd.claim.podEntries,
    pcd.proof.signature,
    pcd.claim.signerPublicKey
  );
}

export async function prove(args: PODEmailPCDArgs): Promise<PODEmailPCD> {
  if (!args.privateKey.value) {
    throw new Error("missing private key");
  }

  if (!args.emailAddress.value) {
    throw new Error("missing email value");
  }

  if (!args.semaphoreV4PublicKey.value) {
    throw new Error("missing semaphore v4 public key");
  }

  const podEntries: PODEmailPCDRequiredEntries = {
    emailAddress: {
      type: "string",
      value: args.emailAddress.value
    },
    semaphoreV4PublicKey: {
      type: "eddsa_pubkey",
      value: args.semaphoreV4PublicKey.value
    }
  };

  const pod = POD.sign(podEntries, args.privateKey.value);

  const id = args.id.value ?? pod.signature;

  return new PODEmailPCD(
    id,
    {
      podEntries,
      signerPublicKey: pod.signerPublicKey
    },
    {
      signature: pod.signature
    }
  );
}

export async function verify(pcd: PODEmailPCD): Promise<boolean> {
  return loadPOD(pcd).verifySignature();
}

export async function serialize(
  pcd: PODEmailPCD
): Promise<SerializedPCD<PODEmailPCD>> {
  return {
    type: PODEmailPCDTypeName,
    pcd: JSON.stringify({
      id: pcd.id,
      pod: loadPOD(pcd).toJSON()
    })
  };
}

function checkPODEntries(
  podEntries: PODEntries
): podEntries is PODEntries & PODEmailPCDRequiredEntries {
  if (!podEntries.emailAddress) {
    throw new Error("emailAddress entry is missing");
  }

  if (!podEntries.semaphoreV4PublicKey) {
    throw new Error("semaphoreV4PublicKey entry is missing");
  }

  if (typeof podEntries.emailAddress.value !== "string") {
    throw new Error("emailAddress entry is not a string");
  }

  if (podEntries.semaphoreV4PublicKey.type !== "eddsa_pubkey") {
    throw new Error("semaphoreV4PublicKey entry is not an eddsa public key");
  }

  return true;
}

export async function deserialize(serialized: string): Promise<PODEmailPCD> {
  const wrapper = JSON.parse(serialized);
  const pod = POD.fromJSON(wrapper.pod);
  const podEntries = pod.content.asEntries();

  if (!checkPODEntries(podEntries)) {
    throw new Error("invalid pod entries");
  }

  return new PODEmailPCD(
    wrapper.id,
    {
      podEntries: podEntries,
      signerPublicKey: pod.signerPublicKey
    },
    { signature: pod.signature }
  );
}

export function getDisplayOptions(pcd: PODEmailPCD): DisplayOptions {
  return {
    header: "Verified Email",
    displayName: pcd.claim.podEntries.emailAddress.value
  };
}

export const PODEmailPCDPackage: PCDPackage<
  PODEmailPCDClaim,
  PODEmailPCDProof,
  PODEmailPCDArgs,
  undefined
> = {
  name: PODEmailPCDTypeName,
  getDisplayOptions,
  prove,
  verify,
  serialize,
  deserialize
};
