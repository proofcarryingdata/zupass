import { ONE_HOUR_MS } from "@pcd/util";

interface AppConfig {
  // Development mode lets you bypass email auth, etc.
  devMode: boolean;
  // The URL of the Zupass server.
  zupassServer: string;
  // The URL of the FrogCrypto feed host server.
  frogCryptoServer: string;
  // The amount of time a zuzalu qr code proof is valid for
  maxIdentityProofAgeMs: number;
  // token that allows the client to upload errors to rollbar
  rollbarToken: string | undefined;
  // the environment to which the client uploads errors in rollbar
  rollbarEnvName: string | undefined;
  // restrict origins allowed to sign PODs to the ones in ZAPP_ALLOWED_SIGNER_ORIGINS?
  zappRestrictOrigins: boolean;
  // origins that are allowed to sign PODs without user approval
  zappAllowedSignerOrigins: string[];
  // folder name -> zapp URL
  embeddedZapps: Record<string, string>;
}

if (
  !process.env.PASSPORT_SERVER_URL &&
  global.window &&
  !!global.window.alert
) {
  alert("PASSPORT_SERVER_URL not set");
}

if (
  !process.env.FROGCRYPTO_SERVER_URL &&
  global.window &&
  !!global.window.alert
) {
  alert("FROGCRYPTO_SERVER_URL not set");
}

let zappAllowedSignerOrigins: string[];

try {
  zappAllowedSignerOrigins = process.env.ZAPP_ALLOWED_SIGNER_ORIGINS
    ? JSON.parse(process.env.ZAPP_ALLOWED_SIGNER_ORIGINS)
    : [];
  if (!Array.isArray(zappAllowedSignerOrigins)) {
    throw new Error("ZAPP_ALLOWED_SIGNER_ORIGINS is not an array");
  }
} catch (e) {
  console.error("Failed to parse ZAPP_ALLOWED_SIGNER_ORIGINS", e);
  zappAllowedSignerOrigins = [];
}

let embeddedZapps: Record<string, string> = {};

try {
  embeddedZapps = process.env.EMBEDDED_ZAPPS
    ? JSON.parse(process.env.EMBEDDED_ZAPPS)
    : {};
} catch (e) {
  console.error("Failed to parse EMBEDDED_ZAPPS", e);
  embeddedZapps = {};
}

export const appConfig: AppConfig = {
  devMode: process.env.NODE_ENV !== "production",
  zupassServer: process.env.PASSPORT_SERVER_URL as string,
  frogCryptoServer: process.env.FROGCRYPTO_SERVER_URL as string,
  maxIdentityProofAgeMs: ONE_HOUR_MS * 4,
  rollbarToken: process.env.ROLLBAR_TOKEN,
  rollbarEnvName: process.env.ROLLBAR_ENV_NAME,
  zappRestrictOrigins: process.env.ZAPP_RESTRICT_ORIGINS === "true",
  zappAllowedSignerOrigins: zappAllowedSignerOrigins,
  embeddedZapps: embeddedZapps
};

console.log("App Config: " + JSON.stringify(appConfig));
