"use client";

import { ContentContainer } from "@/components/ui/Elements";
import ErrorDialog from "@/components/ui/ErrorDialog";
import { AppHeader } from "@/components/ui/Headers";
import { LoadingPlaceholder } from "@/components/ui/LoadingPlaceholder";
import Head from "next/head";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ZUZALU_ADMINS_GROUP_URL } from "../../env";
import { ZupollError } from "../../types";
import { useSavedLoginState } from "../../useLoginState";
import { CreatePost } from "./CreatePost";

export function CreateBotPostPage() {
  const router = useRouter();
  const [error, setError] = useState<ZupollError>();
  const { loginState, logout } = useSavedLoginState(router);

  // Log them out if they're not in a valid group
  useEffect(() => {
    if (
      loginState?.config?.groupUrl !== undefined &&
      loginState.config.groupUrl !== ZUZALU_ADMINS_GROUP_URL
    ) {
      router.push("/");
    }
  }, [loginState, router]);

  return (
    <>
      <Head>
        <title>Post from bot</title>
        <link rel="Zupoll icon" href="/zupoll-icon.ico" />
      </Head>
      {!loginState ? (
        <LoadingPlaceholder />
      ) : (
        <ContentContainer>
          <AppHeader />
          <CreatePost onError={setError} loginState={loginState} />
          <ErrorDialog
            error={error}
            close={() => setError(undefined)}
            logout={logout}
          />
        </ContentContainer>
      )}
    </>
  );
}
