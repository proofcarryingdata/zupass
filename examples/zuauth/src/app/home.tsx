"use client";

import { config } from "@/config/zuauth";
import { zuAuthPopup } from "@pcd/zuauth/client";
import { useCallback, useEffect, useReducer, useState } from "react";

type AuthState =
  | "logged out"
  | "auth-start"
  | "authenticating"
  | "authenticated"
  | "error";

export default function Home() {
  const [pcdStr, setPcdStr] = useState<string>("");
  const [authState, setAuthState] = useState<AuthState>("logged out");
  const [log, addLog] = useReducer((currentLog: string, toAdd: string) => {
    return `${currentLog}${currentLog === "" ? "" : "\n"}${toAdd}`;
  }, "");
  const [user, setUser] = useState<Record<string, string> | undefined>();

  useEffect(() => {
    (async () => {
      if (authState === "auth-start") {
        addLog("Fetching watermark");
        const watermark = (await (await fetch("/api/watermark")).json())
          .watermark;
        addLog("Got watermark");
        addLog("Opening popup window");
        setAuthState("authenticating");
        const result = await zuAuthPopup({
          zupassUrl: process.env.NEXT_PUBLIC_ZUPASS_SERVER_URL as string,
          fieldsToReveal: {
            revealAttendeeEmail: true,
            revealAttendeeName: true
          },
          watermark,
          config: config,
          multi: true
        });

        if (result.type === "pcd") {
          addLog("Received PCD");
          setPcdStr(result.pcdStr);

          const loginResult = await fetch("/api/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pcd: result.pcdStr })
          });

          setUser((await loginResult.json()).user);
          addLog("Authenticated successfully");
          setAuthState("authenticated");
        } else if (result.type === "popupBlocked") {
          addLog("The popup was blocked by your browser");
          setAuthState("error");
        } else if (result.type === "popupClosed") {
          addLog("The popup was closed before a result was received");
          setAuthState("error");
        } else if (result.type === "multi-pcd") {
          addLog("The popup was closed before a result was received");
          setPcdStr(JSON.stringify(result.pcds));
          setAuthState("authenticated");
        } else {
          addLog(`Unexpected result type from zuAuth: ${result.type}`);
          setAuthState("error");
        }
      }
    })();
  }, [addLog, authState]);

  const auth = useCallback(() => {
    if (authState === "logged out" || authState === "error") {
      addLog("Beginning authentication");
      setAuthState("auth-start");
    }
  }, [addLog, authState]);

  const logout = useCallback(() => {
    setUser(undefined);
    setPcdStr("");
    setAuthState("logged out");
    addLog("Logged out");
  }, []);

  const stateClasses: Record<AuthState, string> = {
    "logged out": "",
    "auth-start": "text-blue-300",
    authenticated: "text-green-300",
    error: "text-red-300",
    authenticating: "text-blue-300"
  };

  return (
    <main
      className={`flex min-h-screen flex-col items-center justify-between p-24`}
    >
      <div className="z-10 max-w-5xl w-full text-sm">
        <button
          onClick={authState === "authenticated" ? logout : auth}
          className="border rounded border-gray-400 px-4 py-2 font-medium text-md"
          disabled={
            authState === "auth-start" || authState === "authenticating"
          }
        >
          {authState === "authenticated" ? `Log out` : `Authenticate`}
        </button>
        <div className="my-4">
          Current authentication state is{" "}
          <span className={`font-semibold ${stateClasses[authState]}`}>
            {authState}
          </span>{" "}
          {user && (
            <>
              as{" "}
              <span className="font-medium text-yellow-200">{`${user.attendeeName} (${user.attendeeEmail})`}</span>
            </>
          )}
        </div>
        <h3 className="text-lg font-semibold my-2">Log</h3>
        <pre className="whitespace-pre-line border rounded-md border-gray-500 px-2 py-1">
          {log}
        </pre>
        <h3 className="text-lg font-semibold mt-2">PCD</h3>
        <pre className="whitespace-pre-line border rounded-md border-gray-500 px-2 py-1">
          {pcdStr}
        </pre>
      </div>
    </main>
  );
}
