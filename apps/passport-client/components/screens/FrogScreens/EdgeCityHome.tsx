import { EdgeCityFolderName } from "@pcd/passport-interface";
import styled from "styled-components";
import { usePCDsInFolder } from "../../../src/appHooks";
import { H1 } from "../../core";
import { PCDCardList } from "../../shared/PCDCardList";

const _TABS = [
  {
    tab: "get",
    label: "get frogs"
  },
  {
    tab: "score",
    label: "hi scores"
  },
  {
    tab: "dex",
    label: "frogedex"
  }
] as const;

/**
 * Renders FrogCrypto UI including rendering all EdDSAFrogPCDs.
 */
export function EdgeCityHome(): JSX.Element {
  const edgeCityPCDs = usePCDsInFolder(EdgeCityFolderName);

  return (
    <Container>
      <H1 style={{ margin: "0 auto", whiteSpace: "nowrap" }}>
        🏔️ EDGE CITY 🏔️
      </H1>

      {
        <Score>
          You have collected <strong>196</strong> points.
        </Score>
      }
      <Score>
        You earned these points by checking into activities, voting in polls,
        and adding contacts.
      </Score>
      <PCDCardList pcds={edgeCityPCDs} />

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
