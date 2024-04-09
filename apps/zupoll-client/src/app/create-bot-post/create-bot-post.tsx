"use client";

import Head from "next/head";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Center } from "../../@/components/ui/Elements";

import { AppHeader, SubpageActions } from "@/components/ui/Headers";
import { LoadingPlaceholder } from "@/components/ui/LoadingPlaceholder";
import { ErrorOverlay } from "../../@/components/ui/ErrorOverlay";
import { ZUZALU_ADMINS_GROUP_URL } from "../../env";
import { ZupollError } from "../../types";
import { useSavedLoginState } from "../../useLoginState";
import { CreatePost } from "./CreatePost";

export function CreateBotPostPage() {
  const router = useRouter();
  const [error, setError] = useState<ZupollError>();
  const { loginState } = useSavedLoginState(router);

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
        <Center>
          <AppHeader actions={<SubpageActions />} />
          <CreatePost onError={setError} loginState={loginState} />
          {error && (
            <ErrorOverlay error={error} onClose={() => setError(undefined)} />
          )}
        </Center>
      )}
    </>
  );
}
