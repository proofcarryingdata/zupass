import { AuthenticatorDevice } from "@simplewebauthn/typescript-types";

export const WebAuthnPCDTypeName = "webauthn-pcd";

export interface WebAuthnPCDArgs {
  rpID: string;
  origin: string;
  challenge: string;
  authenticator: AuthenticatorDevice;
}
