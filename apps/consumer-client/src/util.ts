/**
 * Popup window will redirect to the passport to request a proof.
 * Open the popup window under the current domain, let it redirect there.
 */
export function sendPassportRequest(proofUrl: string) {
  const popupUrl = `#/popup?proofUrl=${encodeURIComponent(proofUrl)}`;
  window.open(popupUrl, "_blank", "width=480,height=800,top=100,popup");
}
