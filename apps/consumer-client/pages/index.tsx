import { constructPassportPcdGetRequestUrl } from "passport-interface";

export default function Web() {
  const url = constructPassportPcdGetRequestUrl(
    "http://localhost:3000/",
    "http://localhost:3001/",
    "semaphore-group-signature",
    {
      groupUrl: "http://localhost:3002/semaphore/1",
    }
  );

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
    </div>
  );
}
