"use client";

import { LoadingPlaceholder } from "@/components/ui/LoadingPlaceholder";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useSavedLoginState } from "../../useLoginState";
import { BallotScreen } from "./BallotScreen";

export function BallotPage() {
  const router = useRouter();
  const query = useSearchParams();
  const pathname = usePathname();
  const [ballotURL, setBallotURL] = useState<string | null>(null);
  const { loginState, logout, definitelyNotLoggedIn } =
    useSavedLoginState(router);

  useEffect(() => {
    if (definitelyNotLoggedIn) {
      logout(ballotURL ?? undefined);
    }
  }, [ballotURL, definitelyNotLoggedIn, logout]);

  useEffect(() => {
    const id = query?.get("id");
    if (id == null) {
      // window.location.href = "/";
    } else {
      if (!loginState || definitelyNotLoggedIn) {
        console.log(`[STORING BALLOT URL]`, pathname);
        localStorage.setItem("preLoginRoute", pathname ?? "");
      }
      setBallotURL(id.toString());
    }
  }, [loginState, definitelyNotLoggedIn, query, pathname]);

  return (
    <div className="min-h-screen ">
      {ballotURL === null || !loginState ? (
        <LoadingPlaceholder />
      ) : (
        <BallotScreen
          logout={logout}
          loginState={loginState}
          ballotURL={ballotURL.toString()}
        />
      )}
    </div>
  );
}
