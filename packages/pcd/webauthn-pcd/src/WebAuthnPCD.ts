import { PCD } from "@pcd/pcd-types";
import {
  AuthenticationResponseJSON,
  AuthenticatorDevice,
  AuthenticatorTransportFuture
} from "@simplewebauthn/typescript-types";

export const WebAuthnPCDTypeName = "webauthn-pcd";

export interface WebAuthnPCDArgs {
  rpID: string;
  origin: string;
  challenge: string;
  authenticator: AuthenticatorDevice;
}

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
