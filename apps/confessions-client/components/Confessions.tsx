import { useEffect, useState } from "react";
import { listConfessions } from "../src/api";
  
export function Confessions({
    accessToken,
}: {
    accessToken: string | null;
}) {
  const [confessions, setConfessions] = useState<any>(null);

  useEffect(() => {
    console.log("load confessions");
    if (!accessToken) {
      setConfessions(null)
      return;
    }
  
    (async () => {
      // TODO: paging
      const conf = await listConfessions(accessToken, 1, 30);
      setConfessions(conf);
    })();
  }, [accessToken]);
  
  return (
    <>
      <h2>Confessions</h2>
      {confessions != null && (
        <pre>{JSON.stringify(confessions, null, 2)}</pre>
      )}
    </>
  );
}
