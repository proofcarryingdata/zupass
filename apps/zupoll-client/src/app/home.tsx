"use client";

import Head from "next/head";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import styled from "styled-components";
import { LoginState } from "../types";
import { useSavedLoginState } from "../useLoginState";
import { removeQueryParameters } from "../util";
import { LoginScreen } from "./login/LoginScreen";
import { MainScreen } from "./main/MainScreen";

export function HomePage() {
  const router = useRouter();
  const query = useSearchParams();

  useEffect(() => {
    // Check if the query parameter exists
    if (query?.get("tgWebAppStartParam")) {
      console.log(`got start param`, query?.get("tgWebAppStartParam"));
      router.push(`/ballot?id=${query?.get("tgWebAppStartParam")}`);
    }
  }, [query, router]);

  const {
    loginState,
    replaceLoginState,
    isLoading,
    logout,
    definitelyNotLoggedIn
  } = useSavedLoginState(router);

  useEffect(() => {
    if (definitelyNotLoggedIn) {
      replaceLoginState(undefined);
    }
  }, [definitelyNotLoggedIn, logout, replaceLoginState]);

  let content = <></>;

  if (!isLoading && !loginState) {
    content = (
      <LoginScreen
        title="This app lets Zupass users vote anonymously."
        onLogin={(state: LoginState) => {
          replaceLoginState(state);
          removeQueryParameters();
          const redirectUrl = localStorage.getItem("preLoginRoute") || "/";
          delete localStorage["preLoginRoute"];
          router.push(redirectUrl);
        }}
      />
    );
  } else if (loginState) {
    content = <MainScreen loginState={loginState} logout={logout} />;
  }

  return (
    <>
      <Head>
        <title>Zupoll</title>
        <link rel="Zupoll icon" href="/zupoll-icon.ico" />
      </Head>
      <Wrapper>{content}</Wrapper>
    </>
  );
}

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
`;
