"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useSavedLoginState } from "../../useLoginState";
import { BallotScreen } from "./BallotScreen";

export function BallotPage() {
  const router = useRouter();
  const query = useSearchParams();
  const pathname = usePathname();
  const [ballotURL, setBallotURL] = useState<string | undefined>(undefined);
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
      window.location.href = "/";
    } else {
      if (!loginState || definitelyNotLoggedIn) {
        console.log(`[STORING BALLOT URL]`, pathname);
        localStorage.setItem("preLoginRoute", pathname ?? "");
      }
      setBallotURL(id.toString());
    }
  }, [loginState, definitelyNotLoggedIn, query, pathname]);

  if (!loginState || !ballotURL) {
    return null;
  }

  return (
    <BallotScreen
      logout={logout}
      loginState={loginState}
      ballotURL={ballotURL}
    />
  );
}
