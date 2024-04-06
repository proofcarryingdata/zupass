"use client";

import { AppHeader, SubpageActions } from "@/components/ui/Headers";
import { LoadingPlaceholder } from "@/components/ui/LoadingPlaceholder";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Center, ContentContainer } from "../../@/components/ui/Elements";
import { ErrorOverlay } from "../../@/components/ui/ErrorOverlay";
import { ZupollError } from "../../types";
import { useSavedLoginState } from "../../useLoginState";
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
        <Center>
          <AppHeader title=" " actions={<SubpageActions />} />
          <ContentContainer>
            <CreateBallot loginState={loginState} onError={setError} />
            {error && (
              <ErrorOverlay error={error} onClose={() => setError(undefined)} />
            )}
          </ContentContainer>
        </Center>
      )}
    </>
  );
}
