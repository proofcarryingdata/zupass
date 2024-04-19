import ErrorDialog from "@/components/ui/ErrorDialog";
import { AppHeader } from "@/components/ui/Headers";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useZupassPopupMessages } from "@pcd/passport-interface/PassportPopup/react";
import { LoginConfig } from "@pcd/zupoll-shared";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Center, ContentContainer } from "../../@/components/ui/Elements";
import { LEGACY_LOGIN_CONFIGS } from "../../api/loginGroups";
import { LoginState, ZupollError } from "../../types";
import { removeQueryParameters } from "../../util";
import { fetchLoginToken } from "../../zupoll-server-api";
import { GuaranteesElement } from "../main/Guarantees";
import { LoginWidget } from "./LoginWidget";

export function LoginScreen({
  onLogin
}: {
  onLogin: (loginState: LoginState) => void;
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
    <>
      <AppHeader actions={<Button className="invisible">test</Button>} />
      <Center>
        <ContentContainer>
          <GuaranteesElement />

          <Card className="my-8">
            <CardContent className="mt-6">
              <LoginWidget
                configs={LEGACY_LOGIN_CONFIGS}
                onLogin={onLogin}
                loggingIn={loggingIn}
                setError={setError}
                setServerLoading={setServerLoading}
                serverLoading={serverLoading}
              />
            </CardContent>
          </Card>

          <ErrorDialog error={error} close={() => setError(undefined)} />
        </ContentContainer>
      </Center>
    </>
  );
}
