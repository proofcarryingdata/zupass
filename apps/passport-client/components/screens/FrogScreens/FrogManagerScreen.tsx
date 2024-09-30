import { useState } from "react";
import styled from "styled-components";
import { useIsSyncSettled } from "../../../src/appHooks";
import { useSyncE2EEStorage } from "../../../src/useSyncE2EEStorage";
import { AppContainer } from "../../shared/AppContainer";
import { SyncingPCDs } from "../../shared/SyncingPCDs";
import { Button, ButtonGroup } from "./Button";
import { ManageFeedsSection } from "./ManageFeedsSection";
import { ManageFrogsSection } from "./ManageFrogsSection";

export function FrogManagerScreen(): JSX.Element {
  useSyncE2EEStorage();
  const syncSettled = useIsSyncSettled();

  const [tab, setTab] = useState<"frogs" | "feeds">("frogs");

  if (!syncSettled) {
    return <SyncingPCDs />;
  }

  return (
    <AppContainer bg="primary">
      <ButtonGroup>
        <Button
          disabled={tab === "frogs"}
          onClick={(): void => setTab("frogs")}
        >
          Frogs
        </Button>
        <Button
          disabled={tab === "feeds"}
          onClick={(): void => setTab("feeds")}
        >
          Feeds
        </Button>
      </ButtonGroup>

      <Container>
        {tab === "frogs" && <ManageFrogsSection />}
        {tab === "feeds" && <ManageFeedsSection />}
      </Container>
    </AppContainer>
  );
}

const Container = styled.div`
  padding: 16px;
  width: 100vw;
  max-width: 100vw;
  overflow-x: auto;

  display: flex;
  flex-direction: column;
  gap: 16px;
`;
