import {
  ProtocolWorldsFolderName,
  requestLogToServer
} from "@pcd/passport-interface";
import { Separator, Spacer } from "@pcd/passport-ui";
import { bigintToPseudonymNumber, emailToBigint } from "@pcd/util";
import React, { useEffect } from "react";
import styled from "styled-components";
import { appConfig } from "../../../src/appConfig";
import {
  useLoadedIssuedPCDs,
  usePCDsInFolder,
  useSelf
} from "../../../src/appHooks";
import { TextCenter } from "../../core";
import { RippleLoader } from "../../core/RippleLoader";
import { PCDCardList } from "../../shared/PCDCardList";
import { ProtocolWorldsStyling } from "./ProtocolWorldsStyling";

export function ProtocolWorldsHome(): JSX.Element {
  const pcdsInFolder = usePCDsInFolder(ProtocolWorldsFolderName);
  const loadedIssuedPCDs = useLoadedIssuedPCDs();
  const self = useSelf();

  useEffect(() => {
    requestLogToServer(appConfig.zupassServer, "protocol_worlds_score", {
      score: pcdsInFolder.length,
      commitment: self?.commitment
    });
  }, [pcdsInFolder, self]);

  if (!self) {
    return <></>;
  }

  return (
    <>
      <ProtocolWorldsStyling />
      {pcdsInFolder.length > 0 ? (
        <>
          <Spacer h={24} />
          <TextCenter style={{ fontFamily: "monospace" }}>
            <p>{bigintToPseudonymNumber(emailToBigint(self?.emails?.[0]))}</p>
            {/* <p>Score: {pcdsInFolder.length}</p> */}
            <p style={{ textDecoration: "underline" }}>
              <a target="_blank" href="https://zupass.org/tensions">
                Go to leaderboard
              </a>
            </p>
          </TextCenter>
          <Spacer h={24} />
          <Separator />
          <Spacer h={24} />
          <PCDCardList
            hidePadding
            hideRemoveButton
            allExpanded
            pcds={pcdsInFolder}
          />
        </>
      ) : loadedIssuedPCDs ? (
        <NoPcdsContainer>This folder is empty</NoPcdsContainer>
      ) : (
        <RippleLoader />
      )}
    </>
  );
}

const NoPcdsContainer = styled.div`
  padding: 32;
  display: flex;
  justify-content: center;
  align-items: center;
  user-select: none;
  color: rgba(255, 255, 255, 0.7);
`;
