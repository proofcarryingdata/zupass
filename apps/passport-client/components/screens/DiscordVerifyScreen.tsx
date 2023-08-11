import {
  openGroupMembershipPopup,
  usePassportPopupMessages,
  useSemaphoreGroupProof,
} from "@pcd/passport-interface";
import { SemaphoreGroupPCDTypeName } from "@pcd/semaphore-group-pcd";
import { useState } from "react";
import { useLocation } from "react-router-dom";
import {
  BackgroundGlow,
  Spacer,
  TextCenter
} from "../core";
import { AppContainer } from "../shared/AppContainer";

// Gets redirected here when clicking on the Discord bot verify button
// Only SemaphoreGroupPCD is supported for now
export function DiscordVerifyScreen() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const userId = params.get("user_id");
  const guildId = params.get("guild_id");
  const semaphoreGroupUrl = params.get("group_url");

  // Populate PCD from either client-side or server-side proving using passport popup
  const [pcdStr, _passportPendingPCDStr] = usePassportPopupMessages();

  const [valid, setValid] = useState<boolean | undefined>();
  const onVerified = async(valid: boolean) => {
    setValid(valid);
    // TODO (veronica): edit URL, format
    // sent twice
    const url = "http://localhost:3002/discord/authorize";
    const request = {
      pcdType: SemaphoreGroupPCDTypeName,
      serializedPCD: pcdStr,
      discordUserId: userId,
      discordGuildId: guildId
    }
    const response = await fetch(url, {
      method: "POST",
      body: JSON.stringify(request),
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      }
    });
    console.log(response.status);
  };
 
  const { proof, group } = useSemaphoreGroupProof(
    pcdStr,
    semaphoreGroupUrl,
    "passport-client",
    onVerified
  );

  const [from, to, bg]: [string, string, "primary" | "gray"] = valid
    ? ["var(--bg-lite-primary)", "var(--bg-dark-primary)", "primary"]
    : ["var(--bg-lite-gray)", "var(--bg-dark-gray)", "gray"];

  return (
    <AppContainer bg={bg}>
      <BackgroundGlow y={96} {...{ from, to }}>
        <Spacer h={48} />
        <TextCenter>
        <button
          onClick={() =>
            openGroupMembershipPopup(
              window.location.origin,
              "http://localhost:3001/popup",
              semaphoreGroupUrl,
              "passport-client"
            )
          }
          disabled={valid}
        >
          Request PCDPass Membership Proof
        </button>
        {proof != null && (
          <>
            <p>Got PCDPass Membership Proof from Passport</p>
            {group && <p>✅ Loaded group, {group.members.length} members</p>}
            {valid === undefined && <p>❓ Proof verifying</p>}
            {valid === false && <p>❌ Proof is invalid</p>}
            {valid === true && <p>✅ Proof is valid</p>}
          </>
        )}
        {valid && <p>Welcome, anon</p>}
        </TextCenter>
        <Spacer h={48} />
      </BackgroundGlow>
    </AppContainer>
  );
}
