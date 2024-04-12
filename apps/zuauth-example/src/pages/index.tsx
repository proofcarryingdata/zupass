import { PopupClosedError, zuAuth } from "@pcd/zuauth";
import { Inter } from "next/font/google";
import { useCallback, useEffect, useState } from "react";

const inter = Inter({ subsets: ["latin"] });

export default function Home() {
  const [pcdStr, setPcdStr] = useState<string>("");
  const [authState, setAuthState] = useState<
    "idle" | "auth-start" | "authed" | "error"
  >("idle");

  useEffect(() => {
    (async () => {
      if (authState === "auth-start") {
        try {
          const result = await zuAuth({
            zupassUrl: process.env.NEXT_PUBLIC_ZUPASS_SERVER_URL as string,
            popupRoute: "/popup",
            fieldsToReveal: {
              revealAttendeeEmail: true,
              revealAttendeeName: true
            },
            watermark: "1234",
            eventMetadata: {
              publicKey: [
                "1d47687549cb273b6fed3493de5a954920dd0403f8c7eb67c2ff72a26fa4ab62",
                "1144ef5d44e2d8972d7ade8138629ebefb094025ebb4df00ed02e22d9b68e665"
              ],
              eventId: "536c96f5-feb8-4938-bcac-47d4e13847c6",
              productIds: ["9e39949c-b468-4c7e-a6a2-7735521f0bda"]
            }
          });
          setPcdStr(result);
          setAuthState("authed");
        } catch (error) {
          if (error instanceof PopupClosedError) {
            setAuthState("idle");
          } else {
            setAuthState("error");
          }
        }
      }
    })();
  }, [authState]);

  const auth = useCallback(() => {
    if (authState === "idle" || authState === "error") {
      setAuthState("auth-start");
    }
  }, [authState]);

  return (
    <main
      className={`flex min-h-screen flex-col items-center justify-between p-24 ${inter.className}`}
    >
      <div className="z-10 max-w-5xl w-full text-sm">
        <button onClick={auth}>Click me</button>
        <div>{authState}</div>
        <div>{pcdStr}</div>
      </div>
    </main>
  );
}
