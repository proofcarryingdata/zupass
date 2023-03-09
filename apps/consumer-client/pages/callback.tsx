import { PCDResponse, receiveResponseFromPassport } from "passport-interface";
import { useEffect, useState } from "react";
import { SemaphoreGroupPCDPackage } from "semaphore-group-pcd";

export default function Callback() {
  const [response, setResponse] = useState<PCDResponse | undefined>();

  useEffect(() => {
    const response = receiveResponseFromPassport(window.location.href);
    setResponse(response);
  }, []);

  useEffect(() => {
    if (!response) return;

    const { verify } = SemaphoreGroupPCDPackage;
    console.log(verify);

    // TODO: @dcposch, get the semaphore PCD out of the response, and verify it
    // eg. like:
    //
    // verify(response.pcd);
    //
    // TODO: communicate the result of the verification to the user
    //
  }, [response]);

  return (
    <div>
      <h1>Passport callback</h1>
      <div>you got the following response</div>
      <pre style={{ border: "1px solid black", padding: "8px" }}>
        {JSON.stringify(response, null, 2)}
      </pre>
    </div>
  );
}
