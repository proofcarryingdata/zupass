import { constructPassportPcdGetRequestUrl } from "passport-interface";
import { useEffect, useState } from "react";

export default function Web() {
  const url = constructPassportPcdGetRequestUrl(
    "http://localhost:3000/",
    "http://localhost:3001/",
    "semaphore-group-signature",
    {
      groupUrl: "http://localhost:3002/semaphore/1",
    }
  );

  const [proof, setProof] = useState("");
  useEffect(() => {
    const parts = window.location.search.split("=");
    if (parts[0] === "?proof") setProof(parts[1]);
  }, [setProof]);

  return (
    <div>
      <h1>Welcome to Zuzalu!</h1>
      <button
        onClick={() => {
          window.location.href = url;
        }}
      >
        connect passport
      </button>
      {proof !== "" && (
        <div>
          <h2>Verifying proof...</h2>
          <pre>{proof}</pre>
        </div>
      )}
    </div>
  );
}
