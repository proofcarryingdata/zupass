import ErrorDialog from "@/components/ui/ErrorDialog";
import { AppHeader } from "@/components/ui/Headers";
import { Card, CardContent } from "@/components/ui/card";
import { useZupassPopupMessages } from "@pcd/passport-interface/PassportPopup/react";
import { LoginConfig } from "@pcd/zupoll-shared";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ContentContainer } from "../../@/components/ui/Elements";
import { LOGIN_GROUPS } from "../../api/loginGroups";
import { LoginState, ZupollError } from "../../types";
import { SavedLoginState, findLoginConfig } from "../../useLoginState";
import { removeQueryParameters } from "../../util";
import { fetchLoginToken } from "../../zupoll-server-api";
import { GuaranteesElement } from "../main/Guarantees";
import { redirectForLogin } from "./LoginButton";
import { LoginWidget } from "./LoginWidget";

export function LoginScreen({
  onLogin,
  logout
}: {
  onLogin: (loginState: LoginState) => void;
  logout: SavedLoginState["logout"];
  title: string;
}) {
  const params = useParams();
  const [serverLoading, setServerLoading] = useState<boolean>(false);
  const [error, setError] = useState<ZupollError>();
  const [loggingIn, setLoggingIn] = useState(false);
  const [pcdStr] = useZupassPopupMessages();
  const [pcdFromUrl, setMyPcdStr] = useState("");
  const [configFromUrl, setMyConfig] = useState<LoginConfig>();

  useEffect(() => {
    const url = new URL(window.location.href);
    // Use URLSearchParams to get the proof query parameter
    const proofString = url.searchParams.get("proof");
    const configString = url.searchParams.get("config");

    if (proofString && configString) {
      // Decode the URL-encoded string
      const decodedProofString = decodeURIComponent(proofString);
      // Parse the decoded string into an object
      const proofObject = JSON.parse(decodedProofString);

      const decodedConfig = decodeURIComponent(configString);
      const configObject = JSON.parse(decodedConfig) as LoginConfig;
      setMyConfig(configObject);
      setMyPcdStr(JSON.stringify(proofObject));
      setLoggingIn(true);
    }

    const loginConfig = findLoginConfig(
      LOGIN_GROUPS,
      url.searchParams.get("configId") ?? undefined,
      url.searchParams.get("ballotConfigId") ?? undefined
    );

    if (loginConfig) {
      redirectForLogin(loginConfig);
    }
  }, [params]);

  useEffect(() => {
    if (!loggingIn) return;
    if (!(pcdStr || pcdFromUrl)) return;
    if (configFromUrl) {
      if (configFromUrl.groupId !== configFromUrl.groupId) return;
    } else {
      return;
    }

    (async () => {
      try {
        setServerLoading(true);
        setLoggingIn(true);
        const token = await fetchLoginToken(
          configFromUrl,
          pcdFromUrl || pcdStr
        );
        setTimeout(() => {
          onLogin({
            token,
            config: configFromUrl
          });
        }, 1000 * 1);
      } catch (err: any) {
        const loginError: ZupollError = {
          title: "Login failed",
          message: err.message
        };
        setError(loginError);
        removeQueryParameters();
      }
      setServerLoading(false);
    })();
  }, [configFromUrl, loggingIn, onLogin, pcdFromUrl, pcdStr]);

  // Chunk the login options into rows of two options

  return (
    <ContentContainer>
      <AppHeader />

      <GuaranteesElement />

      <Card>
        <CardContent className="mt-6">
          <LoginWidget
            loggingIn={loggingIn}
            setServerLoading={setServerLoading}
            serverLoading={serverLoading}
          />
        </CardContent>
      </Card>

      <ErrorDialog
        error={error}
        close={() => setError(undefined)}
        logout={logout}
      />
    </ContentContainer>
  );
}
