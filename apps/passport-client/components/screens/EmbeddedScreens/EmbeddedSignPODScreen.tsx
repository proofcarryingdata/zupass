import { PODData, podToPODData } from "@parcnet-js/podspec";
import { Button, Spacer } from "@pcd/passport-ui";
import { POD, PODEntries, encodePrivateKey } from "@pcd/pod";
import { v3tov4Identity } from "@pcd/semaphore-identity-pcd";
import { Fragment, ReactNode, useMemo } from "react";
import styled from "styled-components";
import { useIdentityV3, useZapp, useZappOrigin } from "../../../src/appHooks";
import { useSyncE2EEStorage } from "../../../src/useSyncE2EEStorage";
import { H2 } from "../../core";
import { AppContainer } from "../../shared/AppContainer";

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
  const zapp = useZapp();
  const zappOrigin = useZappOrigin();
  const pod = useMemo(
    () => POD.sign(entries, privateKey),
    [entries, privateKey]
  );

  return (
    <AppContainer bg="primary">
      <Spacer h={4} />
      <H2
        style={{
          flex: 1,
          textAlign: "center",
          marginBottom: "8px"
        }}
      >
        Sign POD
      </H2>
      <Spacer h={16} />
      <div>
        <Description>
          {zapp?.name} ({zappOrigin}) is requesting that you sign a POD. This
          POD will contain the following data, along with your signature and
          public key:
        </Description>
        <Spacer h={24} />
        <EntriesGrid>
          {Object.entries(entries).map(([name, entry]) => {
            return (
              <Fragment key={name}>
                <EntryName>{name}</EntryName>{" "}
                <EntryValue>{entry.value.toString()}</EntryValue>
              </Fragment>
            );
          })}
        </EntriesGrid>
        <Spacer h={4} />
        <div>
          {/* @ts-expect-error not a meaningful type mismatch */}
          <Button onClick={() => callback(podToPODData(pod))}>Sign</Button>
          <Spacer h={16} />
          <Button onClick={onCancel} style="secondary">
            Cancel
          </Button>
        </div>
      </div>
    </AppContainer>
  );
}

const Description = styled.div`
  font-size: 14px;
  color: rgba(var(--white-rgb), 0.8);
`;

const EntriesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  align-items: center;
  margin-bottom: 16px;
`;

const EntryName = styled.span`
  font-weight: 600;
`;

const EntryValue = styled.div`
  padding: 2px 8px;
  border-radius: 4px;
  background-color: rgba(var(--black-rgb), 0.3);
  grid-column: span 2;
  overflow-wrap: break-word;
`;
