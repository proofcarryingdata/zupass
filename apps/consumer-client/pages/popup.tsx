import { useEffect, useState } from "react";

export default function AuthPopup() {
  useEffect(() => {
    if (window.opener == null) {
      setErr("Not a popup window");
      return;
    }

    const search = window.location.search;
    const params = new URLSearchParams(search);

    // First, this page is window.open()-ed. Redirect to the Passport app.
    if (params.get("proofUrl") != null) {
      window.location.href = decodeURIComponent(params.get("proofUrl")!);
    } else if (params.get("proof") != null) {
      // Later, the Passport redirects back with a proof. Send it to our parent.
      window.opener.postMessage(params.get("proof")!, "*");
      window.close();
    }
  }, []);

  // In the happy case, this page redirects immediately.
  // If not, show an error.
  const [err, setErr] = useState("");

  return <div>{err}</div>;
}
