export const IS_PROD = process.env.NODE_ENV === "production";

export const PASSPORT_URL = IS_PROD
  ? "https://zupass.org/"
  : "http://localhost:3000/";

export const PASSPORT_SERVER_URL = IS_PROD
  ? "https://api.pcd-passport.com/"
  : "http://localhost:3002/";

export const CONFESSIONS_SERVER_URL =
  "http://localhost:3005/";

// Popup window will redirect to the passport to request a proof.
// Open the popup window under the current domain, let it redirect there:
export function requestProofFromPassport(proofUrl: string) {
  const popupUrl = `/popup?proofUrl=${encodeURIComponent(proofUrl)}`;
  window.open(popupUrl, "_blank", "width=360,height=480,top=100,popup");
}
