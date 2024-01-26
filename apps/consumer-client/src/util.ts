/**
 * Popup window will redirect to Zupass to request a proof.
 * Open the popup window under the current domain, let it redirect there.
 */
export function sendZupassRequest(proofUrl: string): void {
  const popupUrl = `#/popup?proofUrl=${encodeURIComponent(proofUrl)}`;
  window.open(popupUrl, "_blank", "width=450,height=600,top=100,popup");
}
