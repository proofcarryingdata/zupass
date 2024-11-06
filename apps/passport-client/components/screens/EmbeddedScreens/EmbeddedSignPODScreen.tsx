import { PODData, podToPODData } from "@parcnet-js/podspec";
import { POD, PODEntries, encodePrivateKey } from "@pcd/pod";
import { v3tov4Identity } from "@pcd/semaphore-identity-pcd";
import { ReactNode, useMemo } from "react";
import styled from "styled-components";
import { useIdentityV3, useZappOrigin } from "../../../src/appHooks";
import { useSyncE2EEStorage } from "../../../src/useSyncE2EEStorage";
import { AppContainer } from "../../shared/AppContainer";
import { displayPODValue } from "../../shared/uiUtil";
import { BottomModalHeader } from "../../../new-components/shared/BottomModal";
import { Typography } from "../../../new-components/shared/Typography";
import { Button2 } from "../../../new-components/shared/Button";
import { BANNER_HEIGHT } from "../../../src/sharedConstants";
import { hideScrollCSS } from "../../../new-components/shared/utils";

export function EmbeddedSignPODScreen({
  entries,
  callback,
  onCancel
}: {
  entries: PODEntries;
  callback: (result: PODData) => void;
  onCancel: () => void;
}): ReactNode {
  useSyncE2EEStorage();
  const identity = useIdentityV3();
  const privateKey = useMemo(() => {
    return encodePrivateKey(
      Buffer.from(v3tov4Identity(identity).export(), "base64")
    );
  }, [identity]);
  const zappOrigin = useZappOrigin();
  const pod = useMemo(
    () => POD.sign(entries, privateKey),
    [entries, privateKey]
  );

  return (
    <AppContainer bg="white" noPadding>
      <Container>
        <InnerContainer>
          <BottomModalHeader
            title="SIGN POD"
            description={`${zappOrigin} is requesting that you sign a POD. This POD will contain the following data, along with your signature and public key:`}
          />
          <EntriesGrid>
            {Object.entries(entries).map(([name, entry]) => {
              return (
                <Entry key={name}>
                  <Typography family="Rubik" color="var(--core-accent)">
                    {name}
                  </Typography>
                  <Typography
                    style={{
                      maxWidth: "50%",
                      overflowWrap: "anywhere"
                    }}
                    color="var(--core-accent)"
                    fontWeight={500}
                    family="Rubik"
                  >
                    {displayPODValue(entry)}
                  </Typography>
                </Entry>
              );
            })}
          </EntriesGrid>
        </InnerContainer>
        <ButtonsContainer>
          <Button2 onClick={() => callback(podToPODData(pod))}>Sign</Button2>
          <Button2 onClick={onCancel} variant="secondary">
            Cancel
          </Button2>
        </ButtonsContainer>
      </Container>
    </AppContainer>
  );
}

const Entry = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  align-self: stretch;
`;

const EntriesGrid = styled.div`
  display: flex;
  padding: 12px;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  align-self: stretch;
  border-radius: 8px;
  background: #e9efff;
  overflow: scroll;
  flex: 1; /* this allows the child to take up remaining space */
  overflow-y: auto; /* enables scrolling within the child */
  min-height: 0; /* critical to prevent overflow with flex children */
  ${hideScrollCSS}
`;

const ButtonsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
`;

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  height: calc(100vh - ${BANNER_HEIGHT}px);
  padding: 24px 24px 20px 24px;
  gap: 16px;
`;

const InnerContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  width: 100%;
  min-height: 0; /* critical to prevent overflow with flex children */
`;
