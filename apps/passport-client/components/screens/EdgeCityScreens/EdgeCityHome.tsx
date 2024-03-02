import { EdDSATicketPCD, EdDSATicketPCDTypeName } from "@pcd/eddsa-ticket-pcd";
import {
  BADGES_EDGE_CITY,
  CONTACT_EVENT_NAME,
  EdgeCityBalance,
  EdgeCityFolderName,
  TOKEN_LONG_NAME,
  TOTAL_SUPPLY,
  requestEdgeCityBalances
} from "@pcd/passport-interface";
import { sha256 } from "js-sha256";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { appConfig } from "../../../src/appConfig";
import {
  useFolders,
  usePCDCollection,
  usePCDsInFolder,
  useSelf
} from "../../../src/appHooks";
import { RippleLoader } from "../../core/RippleLoader";
import { AdhocModal } from "../../modals/AdhocModal";
import { PCDCardList } from "../../shared/PCDCardList";
import { BalancesTab } from "./BalancesTab";
import { ExperienceModal } from "./ExperienceModal";

const TABS = [
  {
    tab: "ticket",
    label: "ticket"
  },
  {
    tab: "experiences",
    label: "inventory"
  },
  {
    tab: "score",
    label: "hi score"
  }
] as const;
type TabId = (typeof TABS)[number]["tab"];

interface GroupedEvent {
  eventName: string;
  total: number;
  imageUrl: string;
  hiddenWhenEmpty: boolean;
  infinite: boolean;
}

const groupedResult: GroupedEvent[] = BADGES_EDGE_CITY.reduce((acc, item) => {
  const existingIndex = acc.findIndex(
    (event) => event.eventName === item.eventName
  );
  if (existingIndex > -1) {
    acc[existingIndex].total += 1;
  } else {
    acc.push({
      eventName: item.eventName,
      total: 1,
      imageUrl: item.imageUrl,
      hiddenWhenEmpty: !!item.hiddenWhenEmpty,
      infinite: !!item.infinite
    });
  }
  return acc;
}, []);

/**
 * Renders EdgeCity UI.
 */
export function EdgeCityHome(): JSX.Element {
  const edgeCityPCDs = usePCDsInFolder(EdgeCityFolderName);
  const [tab, setTab] = useState<TabId>("ticket");
  const [selectedExperience, setSelectedExperience] =
    useState<EdDSATicketPCD>(null);
  const [selectedExperienceIsContact, setSelectedExperienceIsContact] =
    useState(false);
  const [selectedExperienceIsStar, setSelectedExperienceIsStar] =
    useState(false);

  const [infoOpen, setInfoOpen] = useState(false);
  const pcds = usePCDCollection();
  const [scores, setScores] = useState<EdgeCityBalance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [score, setScore] = useState<EdgeCityBalance | undefined>();
  const { email } = useSelf();

  useEffect(() => {
    setLoading(true);
    requestEdgeCityBalances(appConfig.zupassServer).then((res) => {
      if (res.success) {
        setScores(
          res.value.map((s) => ({
            ...s,
            balance:
              (s.balance /
                res.value.map((x) => x.balance).reduce((x, y) => x + y)) *
              TOTAL_SUPPLY
          }))
        );
      } else {
        setError(res.error);
      }
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!scores.length || !email) {
      setScore(undefined);
      return;
    }
    const emailHash = `0x${sha256(`edgecity${email}`)}`;
    setScore(scores.find((s) => s.email_hash === emailHash));
  }, [scores, email]);

  useEffect(() => {
    // Set CSS variables on the html element to change into dark mode.
    const rootStyle = document.documentElement.style;
    rootStyle.setProperty("--bg-dark-primary", "black");
    rootStyle.setProperty("--bg-lite-primary", "black");
    rootStyle.setProperty("--primary-dark", "black");
    rootStyle.setProperty("--accent-dark", "white");
    rootStyle.setProperty("--accent-lite", "white");

    return () => {
      rootStyle.removeProperty("--bg-dark-primary");
      rootStyle.removeProperty("--bg-lite-primary");
      rootStyle.removeProperty("--primary-dark");
      rootStyle.removeProperty("--accent-dark");
      rootStyle.removeProperty("--accent-lite");
      rootStyle.removeProperty("background");
    };
  }, []);
  const folders = useFolders(EdgeCityFolderName);

  const pcdsByEventName: Record<string, EdDSATicketPCD[]> = folders
    .flatMap((folder) => pcds.getAllPCDsInFolder(folder))
    .filter((pcd): pcd is EdDSATicketPCD => pcd.type === EdDSATicketPCDTypeName)
    .reduce((acc, pcd) => {
      // Check if the accumulator already has the eventName key
      if (!acc[pcd.claim.ticket.eventName]) {
        // If not, create it and initialize with the current item in an array
        acc[pcd.claim.ticket.eventName] = [pcd];
      } else {
        // If it exists, push the current item to the corresponding array
        acc[pcd.claim.ticket.eventName].push(pcd);
      }
      return acc; // Return the accumulator for the next iteration
    }, {}); // Initial value of the accumulator is an empty object

  if (loading) {
    return <RippleLoader />;
  }
  if (error) {
    return (
      <Container>
        <Title>EDGE CITY</Title>
        <CenteredText style={{ color: "red" }}>
          Oh no! An error occurred. Please refresh to see your $ZUCASH.
        </CenteredText>

        <PCDCardList hideRemoveButton pcds={edgeCityPCDs} />
      </Container>
    );
  }

  return (
    <Container>
      <AdhocModal
        open={infoOpen}
        showCloseIcon={false}
        onClose={(): void => setInfoOpen(false)}
        center
        styles={{
          modal: {
            maxWidth: "400px"
          }
        }}
      >
        <div>
          <strong>${TOKEN_LONG_NAME}</strong> will be available to use soon.
          Keep an eye out starting Friday, March 1st. 🐸
        </div>
      </AdhocModal>
      <Title
        style={{
          margin: "0 auto",
          whiteSpace: "nowrap",
          fontFamily: "PressStart2P"
        }}
      >
        EDGE CITY
      </Title>
      <div style={{ width: "100%" }} onClick={(): void => setInfoOpen(true)}>
        <Caption>
          Balance <span style={{ cursor: "pointer" }}>ⓘ</span>
        </Caption>
        <CenteredText style={{ fontSize: 20 }}>
          <span>🐸</span>{" "}
          <span>
            {score?.balance?.toFixed(2) ?? "0.00"}{" "}
            <ColorText>${TOKEN_LONG_NAME}</ColorText>{" "}
          </span>
        </CenteredText>
      </div>
      <ButtonGroup>
        {TABS.map(({ tab: t, label }) => (
          <Button
            style={{ border: "1px white solid" }}
            key={t}
            disabled={tab === t}
            onClick={(): void => setTab(t)}
          >
            {label}
          </Button>
        ))}
      </ButtonGroup>
      {tab === "ticket" && <PCDCardList hideRemoveButton pcds={edgeCityPCDs} />}
      {tab === "experiences" && (
        <div>
          <ExperiencesHeader>
            <p>
              Earn <strong>${TOKEN_LONG_NAME}</strong> by participating in
              community experiences. Your experiences are recorded below.
            </p>
          </ExperiencesHeader>
          <div>
            <CategoryHeader>
              <span>{CONTACT_EVENT_NAME}</span>
              <span>{`${
                (pcdsByEventName[CONTACT_EVENT_NAME] ?? []).length
              }/${"∞"}`}</span>
            </CategoryHeader>
            <ItemContainer>
              {(pcdsByEventName[CONTACT_EVENT_NAME] ?? []).flatMap((pcd) => (
                <ItemCard
                  key={pcd.id}
                  onClick={(): void => {
                    setSelectedExperience(pcd);
                    setSelectedExperienceIsContact(true);
                    setSelectedExperienceIsStar(false);
                  }}
                >
                  <img src={pcd.claim.ticket?.imageUrl} draggable={false} />
                </ItemCard>
              ))}
              <Link to="/scan">
                <ItemCard>
                  <img src="/images/plus.webp" draggable={false} />
                </ItemCard>
              </Link>
            </ItemContainer>
          </div>
          {groupedResult.map(
            ({ eventName, total, imageUrl, hiddenWhenEmpty, infinite }) => {
              const pcds = pcdsByEventName[eventName] ?? [];
              if (hiddenWhenEmpty && pcds.length === 0) {
                return null;
              }
              return (
                <div key={eventName}>
                  <CategoryHeader>
                    <span>{eventName}</span>
                    <span>{`${pcds.length}/${
                      infinite ? "∞" : total || "∞"
                    }`}</span>
                  </CategoryHeader>
                  <ItemContainer>
                    {pcds.flatMap((pcd) => (
                      <ItemCard
                        key={pcd.id}
                        onClick={(): void => {
                          setSelectedExperience(pcd);
                          setSelectedExperienceIsContact(false);
                          setSelectedExperienceIsStar(eventName === "Stars");
                        }}
                      >
                        <img
                          src={pcd.claim.ticket?.imageUrl}
                          draggable={false}
                        />
                      </ItemCard>
                    ))}
                    {Array.from({ length: total - pcds.length }).map((_, i) => (
                      <ItemCard style={{ cursor: "default" }} key={i}>
                        <img
                          src={imageUrl}
                          draggable={false}
                          style={{ opacity: 0.5 }}
                        />
                      </ItemCard>
                    ))}
                  </ItemContainer>
                </div>
              );
            }
          )}

          {selectedExperience && (
            <ExperienceModal
              color="black"
              pcd={selectedExperience}
              isContact={selectedExperienceIsContact}
              isStar={selectedExperienceIsStar}
              onClose={(): void => {
                setSelectedExperience(null);
                setSelectedExperienceIsContact(false);
                setSelectedExperienceIsStar(false);
              }}
            />
          )}
        </div>
      )}
      {tab === "score" && <BalancesTab scores={scores} score={score} />}
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

const ExperiencesHeader = styled.div`
  padding-bottom: 16px;
  border-bottom: 1px solid grey;
  margin-bottom: 16px;
`;

const Caption = styled.div`
  font-family: monospace;
  font-size: 16px;
  color: grey;
  text-align: center;
`;

const CenteredText = styled.div`
  font-size: 16px;
  text-align: center;
  font-family: monospace;
`;

const Title = styled.div`
  letter-spacing: 3.5px;
  font-size: 36px;
  font-weight: 200;
  margin: 0 auto;
  white-space: nowrap;
  font-family: "PressStart2P";
`;

const CategoryHeader = styled.div`
  font-weight: bold;
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
`;

const ItemContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  grid-row-gap: 0px;
  grid-column-gap: 10px;
`;

const ItemCard = styled.div`
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: flex-start;
  gap: 4px;
  aspect-ratio: 3 / 4;
  min-width: 0;
  cursor: pointer;
`;

const lightGreen = "#94EF69";
const darkGreen = "#406F3A";

const ColorText = styled.span`
  -webkit-animation: green-color-change 1s infinite alternate;
  -moz-animation: green-color-change 1s infinite alternate;
  -ms-animation: green-color-change 1s infinite alternate;
  -o-animation: green-color-change 1s infinite alternate;
  animation: green-color-change 1s infinite alternate;

  @-webkit-keyframes green-color-change {
    from {
      color: ${lightGreen};
    }
    to {
      color: ${darkGreen};
    }
  }
  @-moz-keyframes green-color-change {
    from {
      color: ${lightGreen};
    }
    to {
      color: ${darkGreen};
    }
  }
  @-ms-keyframes green-color-change {
    from {
      color: ${lightGreen};
    }
    to {
      color: ${darkGreen};
    }
  }
  @-o-keyframes green-color-change {
    from {
      color: ${lightGreen};
    }
    to {
      color: ${darkGreen};
    }
  }
  @keyframes green-color-change {
    from {
      color: ${lightGreen};
    }
    to {
      color: ${darkGreen};
    }
  }
`;

const Button = styled.button<{ pending?: boolean }>`
  font-size: 16px;
  padding: 8px;
  border: none;
  border-radius: 4px;
  background-color: var(--black);
  color: var(--white);
  cursor: pointer;
  flex: 1;
  user-select: none;
  font-family: monospace;

  &:disabled {
    background-color: rgba(var(--white-rgb), 0.2);
    filter: drop-shadow(0px 4px 4px rgba(0, 0, 0, 0.25));
    cursor: ${(props): string => (props.pending ? "wait" : "unset")};
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  align-items: stretch;
  height: min-content;
  gap: 8px;
`;
