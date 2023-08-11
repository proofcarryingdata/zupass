import {
  openGroupMembershipPopup,
  usePassportPopupMessages,
  useSemaphoreGroupProof,
} from "@pcd/passport-interface";
import {
  SemaphoreGroupPCDTypeName
} from "@pcd/semaphore-group-pcd";
import { useCallback, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  BackgroundGlow,
  H1,
  H4,
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

  const onVerified = useCallback(async (valid: boolean) => {
    setValid(valid);

    if (!valid) return;
    const url = `${process.env.PASSPORT_SERVER_URL}/discord/authorize`;
    const request = {
      pcdType: SemaphoreGroupPCDTypeName,
      serializedPCD: pcdStr,
      discordUserId: userId,
      discordGuildId: guildId
    }
    await fetch(url, {
      method: "POST",
      body: JSON.stringify(request),
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      }
    });
  }, [pcdStr, userId, guildId]);

  const { proof, group } = useSemaphoreGroupProof(
    pcdStr,
    semaphoreGroupUrl,
    "passport-client",
    onVerified,
    // generateMessageHash(userId).toString()
  );

  const [from, to, bg]: [string, string, "primary" | "gray"] = valid
    ? ["var(--bg-lite-primary)", "var(--bg-dark-primary)", "primary"]
    : ["var(--bg-lite-gray)", "var(--bg-dark-gray)", "gray"];

  return (
    <AppContainer bg={bg}>
      <BackgroundGlow y={96} {...{ from, to }}>
        <Spacer h={48} />
        <H1>Verify Group Membership for the Discord Role</H1>
        <Spacer h={48} />
        <H4>
          Click the button below to generate Semaphore Group Membership Proof.
          The proof will be sent to the server.
          Once verified, the corresponding role will be assigned to the user
          in the Discord server.
        </H4>
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
          <Spacer h={48} />
          {proof != null && (
            <>
              <p>Got PCDPass Membership Proof from Passport</p>
              {group && <p>✅ Loaded group, {group.members.length} members</p>}
              {valid === undefined && <p>❓ Proof verifying</p>}
              {valid === false && <p>❌ Proof is invalid</p>}
              {valid === true && <p>✅ Proof is valid</p>}
            </>
          )}
          <Spacer h={48} />
          {valid && <H4>Sent Proof to the server, check your new role in Discord</H4>}
          {valid === false && <H4>Failed to verify</H4>}
        </TextCenter>
        <Spacer h={48} />
      </BackgroundGlow>
    </AppContainer>
  );
}
