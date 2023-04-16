import { PCD, PCDPackage, SerializedPCD } from "@pcd/pcd-types";
import { startAuthentication } from "@simplewebauthn/browser";
import {
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import {
  AuthenticationResponseJSON,
  AuthenticatorDevice,
} from "@simplewebauthn/typescript-types";
import JSONBig from "json-bigint";
import { v4 as uuid } from "uuid";

export const WebAuthnPCDTypeName = "webauthn-pcd";

export interface WebAuthnPCDArgs {
  rpID: string;
  origin: string;
  challenge: string;
  authenticator: AuthenticatorDevice;
}

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
   * A WebAuthn-compatible device and the information needed to
   * verify assertions by it. Contains the credential ID, counter,
   * and credential public key.
   */
  authenticator: AuthenticatorDevice;
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
  });
  const authenticationResponseJSON = await startAuthentication(
    authenticationOptions
  );
  const claim = {
    rpID: args.rpID,
    origin: args.origin,
    authenticator: args.authenticator,
    challenge: args.challenge,
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
    authenticator: pcd.claim.authenticator,
  });
  return verified;
}

export async function serialize(
  pcd: WebAuthnPCD
): Promise<SerializedPCD<WebAuthnPCD>> {
  return {
    type: WebAuthnPCDTypeName,
    pcd: JSONBig().stringify(pcd),
  } as SerializedPCD<WebAuthnPCD>;
}

export async function deserialize(serialized: string): Promise<WebAuthnPCD> {
  return JSONBig.parse(serialized);
}

/**
 * PCD-conforming wrapper for the Semaphore zero-knowledge protocol. You can
 * find documentation of Semaphore here: https://semaphore.appliedzkp.org/docs/introduction
 */
export const WebAuthnPCDPackage: PCDPackage<
  WebAuthnPCDClaim,
  WebAuthnPCDProof,
  WebAuthnPCDArgs
> = {
  name: WebAuthnPCDTypeName,
  prove,
  verify,
  serialize,
  deserialize,
};
