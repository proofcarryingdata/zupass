import * as fs from "fs"
import JSONBig from "json-bigint";

import {
    BigIntArgument,
    ObjectArgument,
    PCD,
    PCDArgument,
    PCDPackage,
    SerializedPCD,
    StringArgument,
} from "@pcd/pcd-types";
import {
    RLN,
    RLNFullProof,
} from "rlnjs";
import { Identity } from '@semaphore-protocol/identity'
import { v4 as uuid } from "uuid";
import {
    SemaphoreIdentityPCD,
    SemaphoreIdentityPCDPackage,
} from "@pcd/semaphore-identity-pcd";
import { MerkleProof } from '@zk-kit/incremental-merkle-tree'

let initArgs: RLNPCDInitArgs | undefined = undefined;

export const RLNPCDTypeName = "rln-pcd";

export interface RLNPCDInitArgs {
    zkeyFilePath: string;
    wasmFilePath: string;
    verificationKeyPath: string;
}

export interface RLNPCDArgs {
    // App
    rlnIdentifier: BigIntArgument;

    // User
    identity: PCDArgument<SemaphoreIdentityPCD>;
    // Merkle Proof
    merkleProof: ObjectArgument<MerkleProof>

    // Inputs
    signal: StringArgument;
    epoch: BigIntArgument;
}

export interface RLNPCDClaim {
    // TODO: Figure out what to put here
}

export interface RLNPCDProof {
    proof: RLNFullProof;
}

export class RLNPCD implements PCD<RLNPCDClaim, RLNPCDProof>
{
  type = RLNPCDTypeName;

  public constructor(
    readonly id: string,
    readonly claim: RLNPCDClaim,
    readonly proof: RLNPCDProof
  ) {
  }
}

export async function init(args: RLNPCDInitArgs) {
    initArgs = args;
}

// https://github.com/Rate-Limiting-Nullifier/rlnjs/blob/97fe15e04428c6adf81dbc856859e07527a063c9/src/types.ts#L59-L66
export async function prove(args: RLNPCDArgs): Promise<RLNPCD> {
    if (!initArgs) {
        throw new Error("cannot make proof: init has not been called yet");
    }

    // Make sure all arguments are provided
    const rlnIdentifier = args.rlnIdentifier.value;
    if (!rlnIdentifier) {
        throw new Error("cannot make proof: rlnIdentifier is not provided");
    }
    const serializedIdentityPCD = args.identity.value?.pcd;
    if (!serializedIdentityPCD) {
        throw new Error("cannot make proof: missing semaphore identity PCD");
    }
    const identityPCD = await SemaphoreIdentityPCDPackage.deserialize(
        serializedIdentityPCD
    );
    const merkleProof = args.merkleProof.value;
    if (!merkleProof) {
        throw new Error("cannot make proof: merkleProof is not provided");
    }
    const epoch = args.epoch.value;
    if (!epoch) {
        throw new Error("cannot make proof: epoch is not provided");
    }
    const signal = args.signal.value;
    if (!signal) {
        throw new Error("cannot make proof: signal is not provided");
    }
    const rln = getRLNInstance(BigInt(rlnIdentifier), identityPCD.claim.identity)
    const fullProof = await rln.generateProof(signal, merkleProof, epoch);
    // TODO: Confirm what should be put in a claim
    const claim = {}
    return new RLNPCD(uuid(), claim, { proof: fullProof });
}

export async function verify(pcd: RLNPCD): Promise<boolean> {
    if (!initArgs) {
        throw new Error("cannot verify proof: init has not been called yet");
    }
    const fullProof = pcd.proof.proof;
    const rlnIdentifier = fullProof.rlnIdentifier;
    const rln = getRLNInstance(BigInt(rlnIdentifier))
    return await rln.verifyProof(fullProof);
}

function getRLNInstance(rlnIdentifier: bigint, identity?: Identity) {
    if (!initArgs) {
        throw new Error("cannot make proof: init has not been called yet");
    }
    const verificationKeyJSON = JSON.parse(
        fs.readFileSync(initArgs.verificationKeyPath, "utf-8")
    )
    // NOTE: here we preprocess output from `Identity.toString` in order to make it accepted
    // by `Identity.constructor` in RLN. This is a temporary workaround since if the output
    // from `identity.toString()` is directly passed to `RLN` we'll get an error like this:
    // 'Error: invalid BigNumber string (argument="value", value="0x0xc3443f53e7bc98ca74270fdc822b2750c500e66e0d685649c418d8dc813f86", code=INVALID_ARGUMENT, version=bignumber/5.7.0)'
    // TODO: This preprocessing will be unnecessary when we make RLN accept `Identity` directly.
    let identityStr: string | undefined;
    if (identity) {
        // Preprocess output from `Identity.toString` in order to make it accepted by `Identity.constructor` in RLN
        const obj: string[] = JSON.parse(identity.toString())
        identityStr = JSON.stringify(obj.map(e => BigInt(e).toString(16)))
    } else {
        // Leave it undefined and let RLN handle it
        identityStr = undefined;
    }

    return new RLN(
        initArgs.wasmFilePath,
        initArgs.zkeyFilePath,
        verificationKeyJSON,
        rlnIdentifier,
        identityStr,
    );
}

export async function serialize(pcd: RLNPCD): Promise<SerializedPCD<RLNPCD>> {
    return {
        type: RLNPCDTypeName,
        pcd: JSONBig().stringify(pcd),
    } as SerializedPCD<RLNPCD>;
}

export async function deserialize(
    serialized: string
): Promise<RLNPCD> {
    return JSONBig().parse(serialized);
}


/**
 * PCD-conforming wrapper for the RLN protocol. You can
 * find documentation of RLN here: https://rate-limiting-nullifier.github.io/rln-docs/what_is_rln.html
 */
export const RLNPCDPackage: PCDPackage<
    RLNPCDClaim,
    RLNPCDProof,
    RLNPCDArgs,
    RLNPCDInitArgs
> = {
    name: RLNPCDTypeName,
    init,
    prove,
    verify,
    serialize,
    deserialize,
}
