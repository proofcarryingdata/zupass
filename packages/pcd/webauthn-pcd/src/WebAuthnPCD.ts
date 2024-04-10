import { arrayBufferToBase64, base64ToArrayBuffer } from "@pcd/passport-crypto";
import { DisplayOptions, PCD, PCDPackage, SerializedPCD } from "@pcd/pcd-types";
import { requireDefinedParameter } from "@pcd/util";
import { startAuthentication } from "@simplewebauthn/browser";
import {
  generateAuthenticationOptions,
  verifyAuthenticationResponse
} from "@simplewebauthn/server";
import {
  AuthenticationResponseJSON,
  AuthenticatorTransportFuture
} from "@simplewebauthn/typescript-types";
import JSONBig from "json-bigint";
import { v4 as uuid } from "uuid";
import { WebAuthnPCDArgs, WebAuthnPCDTypeName } from "./args";

type Base64String = string;

export interface WebAuthnPCDClaim {
  /**
   * The challenge that is claimed to be signed by the credential.
   */
  challenge: string;
  /**
   * The origin(s) of this WebAuthn credential, e.g. google.com.
   */
  origin: string | string[];
  /**
   * The relying party ID(s) of this WebAuthn credential
   * (https://www.w3.org/TR/webauthn-2/#relying-party-identifier).
   */
  rpID: string | string[];
  /**
   * The WebAuthn credential information associated with this PCD.
   * Storing bytes as Base64 encoded string to ensure serializability.
   */
  credentialDetails: {
    credentialID: Base64String;
    credentialPublicKey: Base64String;
    counter: number;
    transports?: AuthenticatorTransportFuture[];
  };
}

export type WebAuthnPCDProof = AuthenticationResponseJSON;

export class WebAuthnPCD implements PCD<WebAuthnPCDClaim, WebAuthnPCDProof> {
  type = WebAuthnPCDTypeName;
  claim: WebAuthnPCDClaim;
  proof: WebAuthnPCDProof;
  id: string;

  public constructor(
    id: string,
    claim: WebAuthnPCDClaim,
    proof: WebAuthnPCDProof
  ) {
    this.claim = claim;
    this.proof = proof;
    this.id = id;
  }
}

export async function prove(args: WebAuthnPCDArgs): Promise<WebAuthnPCD> {
  const authenticationOptions = await generateAuthenticationOptions({
    rpID: args.rpID,
    challenge: args.challenge,
    allowCredentials: [
      {
        id: args.authenticator.credentialID,
        type: "public-key"
      }
    ]
  });
  const authenticationResponseJSON = await startAuthentication(
    authenticationOptions
  );
  const claim: WebAuthnPCDClaim = {
    rpID: args.rpID,
    origin: args.origin,
    credentialDetails: {
      credentialID: arrayBufferToBase64(args.authenticator.credentialID),
      credentialPublicKey: arrayBufferToBase64(
        args.authenticator.credentialPublicKey
      ),
      counter: args.authenticator.counter,
      transports: args.authenticator.transports
    },
    challenge: args.challenge
  };
  const proof = authenticationResponseJSON;
  return new WebAuthnPCD(uuid(), claim, proof);
}

export async function verify(pcd: WebAuthnPCD): Promise<boolean> {
  const { verified } = await verifyAuthenticationResponse({
    response: pcd.proof,
    expectedChallenge: pcd.claim.challenge,
    expectedOrigin: pcd.claim.origin,
    expectedRPID: pcd.claim.rpID,
    authenticator: {
      credentialID: base64ToArrayBuffer(
        pcd.claim.credentialDetails.credentialID
      ),
      credentialPublicKey: base64ToArrayBuffer(
        pcd.claim.credentialDetails.credentialPublicKey
      ),
      counter: pcd.claim.credentialDetails.counter,
      transports: pcd.claim.credentialDetails.transports
    }
  });
  return verified;
}

export async function serialize(
  pcd: WebAuthnPCD
): Promise<SerializedPCD<WebAuthnPCD>> {
  return {
    type: WebAuthnPCDTypeName,
    pcd: JSONBig().stringify(pcd)
  } as SerializedPCD<WebAuthnPCD>;
}

export async function deserialize(serialized: string): Promise<WebAuthnPCD> {
  const { id, claim, proof } = JSONBig().parse(serialized);

  requireDefinedParameter(id, "id");
  requireDefinedParameter(claim, "claim");
  requireDefinedParameter(proof, "proof");

  return new WebAuthnPCD(id, claim, proof);
}

export function getDisplayOptions(pcd: WebAuthnPCD): DisplayOptions {
  return {
    header: "WebAuthn Credential Signature",
    displayName: "webauthn-" + pcd.id.substring(0, 4)
  };
}

/**
 * PCD-conforming wrapper for the Semaphore zero-knowledge protocol. You can
 * find documentation of Semaphore here: https://semaphore.appliedzkp.org/docs/introduction
 */
export const WebAuthnPCDPackage: PCDPackage<
  WebAuthnPCDClaim,
  WebAuthnPCDProof,
  // @ts-expect-error https://github.com/proofcarryingdata/zupass/issues/830
  WebAuthnPCDArgs
> = {
  name: WebAuthnPCDTypeName,
  prove,
  verify,
  serialize,
  deserialize,
  getDisplayOptions
};
