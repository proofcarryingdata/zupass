import { fetchUser, User } from "@pcd/passport-interface";
import { decodeQRPayload } from "@pcd/passport-ui";
import {
  SemaphoreSignaturePCDPackage,
  SemaphoreSignaturePCDTypeName,
} from "@pcd/semaphore-signature-pcd";
import { useContext, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { appConfig } from "../../src/appConfig";
import { QRPayload } from "../../src/createQRProof";
import { DispatchContext } from "../../src/dispatch";
import { getVisitorStatus, VisitorStatus } from "../../src/user";
import { bigintToUuid } from "../../src/util";
import {
  BackgroundGlow,
  CenterColumn,
  H4,
  Placeholder,
  Spacer,
  TextCenter,
} from "../core";
import { LinkButton } from "../core/Button";
import { icons } from "../icons";
import { AppContainer } from "../shared/AppContainer";
import { MainIdentityCard } from "../shared/MainIdentityCard";
import {
  CardContainerExpanded,
  CardHeader,
  CardOutlineExpanded,
} from "../shared/PCDCard";

/** You can either prove who you are, or you can prove anonymously that you're a Zuzalu resident or visitor. */
type VerifyType = "identity-proof" | "anon-proof";

type VerifyResult =
  | { valid: false; type: VerifyType; message: string }
  | { valid: true; type: "identity-proof"; user: User }
  | { valid: true; type: "anon-proof"; role: string };

// Shows whether a proof is valid. On success, shows the PCD claim visually.
export function VerifyScreen() {
  const location = useLocation();
  const [_, dispatch] = useContext(DispatchContext);

  const params = new URLSearchParams(location.search);
  const encodedQRPayload = params.get("pcd");
  console.log(
    `Verifying Zuzalu ID proof, ${encodedQRPayload.length}b gzip+base64`
  );

  const [result, setResult] = useState<VerifyResult>();

  useEffect(() => {
    deserializeAndVerify(encodedQRPayload)
      .then((res: VerifyResult) => {
        console.log("Verification result", res);
        setResult(res);
      })
      .catch((err: Error) => {
        console.error(err);
        dispatch({
          type: "error",
          error: {
            title: "Verification error",
            message: err.message,
            stack: err.stack,
          },
        });
      });
  }, [encodedQRPayload, setResult, dispatch]);

  const [from, to, bg]: [string, string, "primary" | "gray"] = result?.valid
    ? ["var(--bg-lite-primary)", "var(--bg-dark-primary)", "primary"]
    : ["var(--bg-lite-gray)", "var(--bg-dark-gray)", "gray"];

  const icon = {
    true: icons.verifyValid,
    false: icons.verifyInvalid,
    undefined: icons.verifyInProgress,
  }["" + result?.valid];

  return (
    <AppContainer bg={bg}>
      <BackgroundGlow y={96} {...{ from, to }}>
        <Spacer h={48} />
        <TextCenter>
          <img width="90" height="90" src={icon} />
          <Spacer h={24} />
          {result == null && <H4>VERIFYING PROOF...</H4>}
          {result?.valid && <H4 col="var(--accent-dark)">PROOF VERIFIED.</H4>}
          {result?.valid === false && <H4>PROOF INVALID.</H4>}
        </TextCenter>
        <Spacer h={48} />
        <Placeholder minH={160}>
          {result?.valid === false && <TextCenter>{result.message}</TextCenter>}
          {result && result.valid && getCard(result)}
        </Placeholder>
        <Spacer h={64} />
        {result != null && (
          <CenterColumn w={280}>
            <LinkButton to="/scan">Verify another</LinkButton>
            <Spacer h={8} />
            <LinkButton to="/">Back to Passport</LinkButton>
            <Spacer h={24} />
          </CenterColumn>
        )}
      </BackgroundGlow>
    </AppContainer>
  );
}

function getCard(result: VerifyResult) {
  if (!result.valid) throw new Error("Invalid proof");
  if (result.type !== "identity-proof") throw new Error("Not an ID proof");

  return (
    <CardContainerExpanded>
      <CardOutlineExpanded>
        <CardHeader col="var(--accent-lite)">
          VERIFIED ZUZALU PASSPORT
        </CardHeader>
        <MainIdentityCard showQrCode={false} user={result.user} />
      </CardOutlineExpanded>
    </CardContainerExpanded>
  );
}

async function deserializeAndVerify(pcdStr: string): Promise<VerifyResult> {
  const { deserialize, verify } = SemaphoreSignaturePCDPackage;
  const decodedPCD = decodeQRPayload(pcdStr);
  const deserializedPCD = await deserialize(JSON.parse(decodedPCD).pcd);
  console.log(
    `Got PCD, should be a Zuzalu ID semaphore proof`,
    deserializedPCD
  );

  if (deserializedPCD.type !== SemaphoreSignaturePCDTypeName) {
    throw new Error(
      `PCD type '${deserializedPCD.type}' is not a Zuzalu ID proof`
    );
  }

  const valid = await verify(deserializedPCD);
  if (!valid) {
    return { valid: false, type: "identity-proof", message: "Invalid proof" };
  }

  // Verify identity proof
  const payload = JSON.parse(deserializedPCD.claim.signedMessage) as QRPayload;

  const uuid = bigintToUuid(BigInt(payload.uuid));
  const user = await fetchUser(appConfig.passportServer, uuid);

  if (user == null) {
    return {
      valid: false,
      type: "identity-proof",
      message: "User not found",
    };
  }

  if (user.commitment !== deserializedPCD.claim.identityCommitment) {
    return {
      valid: false,
      type: "identity-proof",
      message: "User doesn't match proof",
    };
  }

  const timeDifferenceMs = Date.now() - payload.timestamp;

  if (timeDifferenceMs >= appConfig.maxIdentityProofAgeMs) {
    return {
      valid: false,
      type: "identity-proof",
      message: "Proof expired",
    };
  }

  const visitorStatus = getVisitorStatus(user);

  if (
    visitorStatus !== undefined &&
    visitorStatus.isVisitor &&
    visitorStatus.status !== VisitorStatus.Current
  ) {
    return {
      valid: false,
      type: "identity-proof",
      message: "Expired visitor.",
    };
  }

  return { valid: true, type: "identity-proof", user: user };
}
