import { useEffect, useState } from "react";

/**
 * This page is necessary to receive PCDs from the passport after requesting
 * a PCD from the passport. It uses the window messaging API to communicate
 * the PCD it received back to the requesting tab.
 */
export default function AuthPopup() {
  useEffect(() => {
    if (window.opener == null) {
      setErr("Not a popup window");
      return;
    }

    const search = window.location.search;
    const params = new URLSearchParams(search);

    const paramsProofUrl = params.get("proofUrl");
    const paramsProof = params.get("proof");
    const paramsEncodingPendingPCD = params.get("encodedPendingPCD");

    // First, this page is window.open()-ed. Redirect to the Passport app.
    if (paramsProofUrl != null) {
      window.location.href = decodeURIComponent(paramsProofUrl);
    } else if (paramsProof != null) {
      // Later, the Passport redirects back with a proof. Send it to our parent.
      window.opener.postMessage({ encodedPCD: paramsProof }, "*");
      window.close();
    } else if (paramsEncodingPendingPCD != null) {
      // Later, the Passport redirects back with a encodedPendingPCD. Send it to our parent.
      window.opener.postMessage(
        { encodedPendingPCD: paramsEncodingPendingPCD },
        "*"
      );
      window.close();
    }
  }, []);

  // In the happy case, this page redirects immediately.
  // If not, show an error.
  const [err, setErr] = useState("");

  return <div>{err}</div>;
}
