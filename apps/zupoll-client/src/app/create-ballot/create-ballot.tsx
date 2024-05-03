"use client";

import ErrorDialog from "@/components/ui/ErrorDialog";
import { AppHeader } from "@/components/ui/Headers";
import { LoadingPlaceholder } from "@/components/ui/LoadingPlaceholder";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ContentContainer } from "../../@/components/ui/Elements";
import { ZupollError } from "../../types";
import { useSavedLoginState } from "../../useLoginState";
import { LoggedInAs } from "../main/LoggedInAs";
import { CreateBallot } from "./CreateBallot";

export function CreateBallotPage() {
  const router = useRouter();
  const [error, setError] = useState<ZupollError>();
  const { loginState, definitelyNotLoggedIn, logout } =
    useSavedLoginState(router);

  useEffect(() => {
    if (definitelyNotLoggedIn) {
      logout();
    }
  }, [definitelyNotLoggedIn, logout]);

  return (
    <>
      {!loginState ? (
        <LoadingPlaceholder />
      ) : (
        <ContentContainer>
          <AppHeader />

          <ContentContainer>
            <div className="flex flex-col gap-2">
              <LoggedInAs
                loginState={loginState}
                logout={logout}
                showHomeButton={true}
              />
              <CreateBallot loginState={loginState} onError={setError} />
            </div>
            <ErrorDialog error={error} close={() => setError(undefined)} />
          </ContentContainer>
        </ContentContainer>
      )}
    </>
  );
}
