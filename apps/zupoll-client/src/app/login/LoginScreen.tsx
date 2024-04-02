import { AppHeader } from "@/components/ui/Headers";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useZupassPopupMessages } from "@pcd/passport-interface";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Center, ContentContainer } from "../../@/components/ui/Elements";
import { ErrorOverlay } from "../../@/components/ui/ErrorOverlay";
import {
  DEVCONNECT_ORGANIZER_CONFIG,
  DEVCONNECT_USER_CONFIG,
  EDGE_CITY_ORGANIZER_CONFIG,
  EDGE_CITY_RESIDENT_CONFIG,
  ETH_LATAM_ATTENDEE_CONFIG,
  ETH_LATAM_ORGANIZER_CONFIG,
  ZUZALU_ORGANIZER_LOGIN_CONFIG,
  ZUZALU_PARTICIPANT_LOGIN_CONFIG
} from "../../api/loginConfig";
import {
  LoginConfig,
  LoginConfigurationName,
  LoginState,
  ZupollError
} from "../../types";
import { removeQueryParameters } from "../../util";
import { fetchLoginToken } from "../../zupoll-server-api";
import { GuaranteesElement } from "../main/Guarantees";
import { LoginGroups } from "./LoginGroups";

const allLoginConfigs: LoginConfig[] = [
  ETH_LATAM_ATTENDEE_CONFIG,
  ETH_LATAM_ORGANIZER_CONFIG,
  EDGE_CITY_RESIDENT_CONFIG,
  EDGE_CITY_ORGANIZER_CONFIG,
  ZUZALU_PARTICIPANT_LOGIN_CONFIG,
  ZUZALU_ORGANIZER_LOGIN_CONFIG,
  DEVCONNECT_USER_CONFIG,
  DEVCONNECT_ORGANIZER_CONFIG
];

export function LoginScreen({
  onLogin,
  title = "This app lets Zupass users vote anonymously.",
  // visibleLoginOptions is a set of login config names to show here
  // this supports creating login pages for specific events which only show
  // some login options.
  // if the array is empty, all options are shown.
  visibleLoginOptions
}: {
  onLogin: (loginState: LoginState) => void;
  title: string;
  visibleLoginOptions: LoginConfigurationName[] | undefined;
}) {
  const [serverLoading, setServerLoading] = useState<boolean>(false);
  const [error, setError] = useState<ZupollError>();
  const loginConfigSet = new Set(visibleLoginOptions);
  const visibleLoginRows =
    visibleLoginOptions === undefined
      ? allLoginConfigs
      : allLoginConfigs.filter(
          // If loginConfigSet is zero include everything, otherwise check for
          // inclusion
          (config) =>
            loginConfigSet.size === 0 || loginConfigSet.has(config.name)
        );

  const [loggingIn, setLoggingIn] = useState(false);
  const [pcdStr] = useZupassPopupMessages();
  const [pcdFromUrl, setMyPcdStr] = useState("");
  const [configFromUrl, setMyConfig] = useState<LoginConfig>();

  const params = useParams();

  useEffect(() => {
    console.log("params", params);

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
        const token = await fetchLoginToken(
          configFromUrl,
          pcdFromUrl || pcdStr
        );
        onLogin({
          token,
          config: configFromUrl
        });
      } catch (err: any) {
        const loginError: ZupollError = {
          title: "Login failed",
          message: err.message
        };
        setError(loginError);
        removeQueryParameters();
      }
      setLoggingIn(false);
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
            <CardContent>
              <p className="mt-6">Login with Event Ticket</p>
              <LoginGroups
                configs={visibleLoginRows}
                onLogin={onLogin}
                setError={setError}
                setServerLoading={setServerLoading}
              />
            </CardContent>
          </Card>

          {error && (
            <ErrorOverlay error={error} onClose={() => setError(undefined)} />
          )}
        </ContentContainer>
      </Center>
    </>
  );
}
