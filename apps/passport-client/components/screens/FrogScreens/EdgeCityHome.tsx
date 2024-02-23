import { EdgeCityFolderName } from "@pcd/passport-interface";
import { Separator } from "@pcd/passport-ui";
import { joinPath, normalizePath } from "@pcd/pcd-collection";
import { useState } from "react";
import styled from "styled-components";
import { useFolders, usePCDsInFolder } from "../../../src/appHooks";
import { PCDCardList } from "../../shared/PCDCardList";
import { FolderCard, FolderDetails } from "../HomeScreen/Folder";
import { Button, ButtonGroup } from "./Button";

const TABS = [
  {
    tab: "ticket",
    label: "id"
  },
  {
    tab: "folders",
    label: "items"
  },
  {
    tab: "score",
    label: "scores"
  },
  {
    tab: "contacts",
    label: "contacts"
  }
] as const;
type TabId = (typeof TABS)[number]["tab"];

/**
 * Renders FrogCrypto UI including rendering all EdDSAFrogPCDs.
 */
export function EdgeCityHome(): JSX.Element {
  const edgeCityPCDs = usePCDsInFolder(EdgeCityFolderName);
  const [tab, setTab] = useState<TabId>("ticket");
  // TODO: Query param
  const [browsingFolder, setBrowsingFolder] = useState(EdgeCityFolderName);
  const folders = useFolders(browsingFolder);
  const folderPCDs = usePCDsInFolder(browsingFolder);
  const isRoot = normalizePath(browsingFolder) === EdgeCityFolderName;
  const contactPCDs = usePCDsInFolder(joinPath(EdgeCityFolderName, "Contacts"));
  console.log({ folders, folderPCDs, isRoot, browsingFolder });

  return (
    <Container>
      {/* <H1 style={{ margin: "0 auto", whiteSpace: "nowrap" }}>
        🏔️ EDGE CITY 🏔️
      </H1> */}
      <img src="/images/edgecity/edgecity-banner.png" draggable={false} />

      {
        <Score>
          You have collected <strong>196</strong> points.
        </Score>
      }
      <Score>
        Earn points by checking into activities, voting in polls, and adding
        contacts.
      </Score>
      <ButtonGroup>
        {TABS.map(({ tab: t, label }) => (
          <Button key={t} disabled={tab === t} onClick={(): void => setTab(t)}>
            {label}
          </Button>
        ))}
      </ButtonGroup>
      {tab === "ticket" && <PCDCardList hideRemoveButton pcds={edgeCityPCDs} />}
      {tab === "folders" && (
        <div>
          {!isRoot && (
            <FolderDetails
              noChildFolders={
                browsingFolder !== EdgeCityFolderName || folderPCDs.length === 0
              }
              folder={browsingFolder}
              displayFolder={browsingFolder.replace(
                new RegExp(`^${EdgeCityFolderName}\\/`),
                ""
              )}
              onFolderClick={setBrowsingFolder}
            />
          )}
          {folders
            .sort((a, b) => a.localeCompare(b))
            .map((folder) => (
              <FolderCard
                key={folder}
                onFolderClick={setBrowsingFolder}
                folder={folder}
              />
            ))}
          {!isRoot && folderPCDs.length > 0 && <Separator />}
          {!isRoot && <PCDCardList allExpanded pcds={folderPCDs} />}
        </div>
      )}
      {tab === "score" && <div>Score goes here</div>}
      {tab === "contacts" && (
        <PCDCardList hideRemoveButton pcds={contactPCDs} allExpanded />
      )}

      {/* {frogSubs.length > 0 &&
        (frogPCDs.length === 0 && !myScore ? (
          <>
            <TypistText
              onInit={(typewriter): TypewriterClass => {
                const text = isFromSubscriptionRef.current
                  ? `you hear a whisper. "come back again when you're stronger."`
                  : "you're certain you saw a frog wearing a monocle.";

                return typewriter
                  .typeString(text)
                  .pauseFor(500)
                  .changeDeleteSpeed(20)
                  .deleteChars(text.length)
                  .typeString(
                    retreatRef.current
                      ? "retreat was ineffective. you enter the SWAMP."
                      : "you enter the SWAMP."
                  );
              }}
            >
              <GetFrogTab
                subscriptions={frogSubs}
                userState={userState}
                refreshUserState={refreshUserState}
                pcds={frogPCDs}
              />
            </TypistText>
          </>
        ) : (
          <>
            {
              // show frog card on first pull
              // show tabs on second pull
              myScore >= 2 && (
                <ButtonGroup>
                  {TABS.map(({ tab: t, label }) => (
                    <Button
                      key={t}
                      disabled={tab === t}
                      onClick={(): void => setTab(t)}
                    >
                      {label}
                    </Button>
                  ))}
                </ButtonGroup>
              )
            }

            {tab === "get" && (
              <GetFrogTab
                subscriptions={frogSubs}
                userState={userState}
                refreshUserState={refreshUserState}
                pcds={frogPCDs}
              />
            )}
            {tab === "score" && (
              <ScoreTab
                score={userState?.myScore}
                refreshScore={refreshUserState}
              />
            )}
            {tab === "dex" && (
              <DexTab possibleFrogs={userState.possibleFrogs} pcds={frogPCDs} />
            )}
          </>
        ))} */}
    </Container>
  );
}

const Container = styled.div`
  padding: 16px;
  width: 100%;
  height: 100%;
  max-width: 100%;
  font-family: monospace;
  font-variant-numeric: tabular-nums;

  display: flex;
  flex-direction: column;
  gap: 32px;
`;

const Score = styled.div`
  font-size: 16px;
  text-align: center;
`;
