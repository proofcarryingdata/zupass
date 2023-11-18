import { EdDSAFrogPCD, IFrogData, Rarity } from "@pcd/eddsa-frog-pcd";
import { DexFrog } from "@pcd/passport-interface";
import { Dispatch, SetStateAction, useMemo, useState } from "react";
import styled from "styled-components";
import { useDispatch } from "../../../src/appHooks";
import { RippleLoader } from "../../core/RippleLoader";
import { icons } from "../../icons";
import { Button, ButtonGroup } from "./Button";
import { FrogsModal } from "./FrogsModal";

const RARITIES = {
  [Rarity.Common]: {
    label: "NORM",
    color: "#2D9061"
  },
  [Rarity.Rare]: {
    label: "RARE",
    color: "#4595B2"
  },
  [Rarity.Epic]: {
    label: "EPIC",
    color: "#683EAA"
  },
  [Rarity.Legendary]: {
    label: "LGND",
    color: "#F19E38"
  },
  [Rarity.Mythic]: {
    label: "MYTH",
    color: "linear-gradient(261deg, #D1FFD3 2.82%, #EAF 39.21%, #5BFFFF 99.02%)"
  }
};

/**
 * The FrogeDex tab allows users to view their progress towards collecting all frogs.
 */
export function DexTab({
  possibleFrogs,
  pcds
}: {
  possibleFrogs?: DexFrog[];
  pcds: EdDSAFrogPCD[];
}) {
  const dispatch = useDispatch();
  const [mode, setMode] = useState<"grid" | "list">("list");
  const groupedPCDs = useGroupedPCDs(pcds || []);

  const [focusedFrogs, setFocusedFrogs] = useState<EdDSAFrogPCD[]>(null);

  if (!possibleFrogs) {
    return <RippleLoader />;
  }

  return (
    <>
      <Button
        onClick={() =>
          dispatch({
            type: "set-modal",
            modal: {
              modalType: "frogcrypto-export-pcds"
            }
          })
        }
      >
        Export FrogPCDs
      </Button>

      <ButtonGroup style={{ marginLeft: "auto" }}>
        <span style={{ marginRight: "16px" }}>
          Owned: {Object.keys(groupedPCDs).length.toString().padStart(3, "0")}
        </span>
        <Button onClick={() => setMode("list")} disabled={mode === "list"}>
          <img
            src={icons.inputObject}
            draggable={false}
            width={16}
            height={16}
          />
        </Button>
        <Button onClick={() => setMode("grid")} disabled={mode === "grid"}>
          <img src={icons.grid} draggable={false} width={16} height={16} />
        </Button>
      </ButtonGroup>
      {mode === "grid" && (
        <DexGrid
          possibleFrogs={possibleFrogs}
          pcds={groupedPCDs}
          onClick={setFocusedFrogs}
        />
      )}
      {mode === "list" && (
        <DexList
          possibleFrogs={possibleFrogs}
          pcds={groupedPCDs}
          onClick={setFocusedFrogs}
        />
      )}

      {focusedFrogs && (
        <FrogsModal
          pcds={focusedFrogs}
          onClose={() => setFocusedFrogs(null)}
          color={RARITIES[focusedFrogs[0].claim.data.rarity].color}
        />
      )}
    </>
  );
}

const DexList = ({
  possibleFrogs,
  pcds,
  onClick
}: {
  possibleFrogs: DexFrog[];
  pcds: FrogsById;
  onClick: Dispatch<SetStateAction<EdDSAFrogPCD[]>>;
}) => {
  return (
    <table>
      <tbody>
        {possibleFrogs.map(({ id, rarity }) => {
          const frogPCDs = pcds[id];

          if (!frogPCDs) {
            return (
              <tr key={id}>
                <Cell>{id}</Cell>
                <Cell>
                  <UnknownRarityBadge rarity={rarity}>
                    {RARITIES[rarity].label}
                  </UnknownRarityBadge>
                </Cell>
                <UnknownCell>???</UnknownCell>
              </tr>
            );
          }

          return (
            <tr
              key={id}
              onClick={() => onClick(frogPCDs.pcds)}
              style={{ cursor: "pointer" }}
            >
              <Cell>{id}</Cell>
              <Cell>
                <RarityBadge rarity={rarity}>
                  {RARITIES[rarity].label}
                </RarityBadge>
              </Cell>
              <Cell>{frogPCDs.frog.name}</Cell>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

const DexGrid = ({
  possibleFrogs,
  pcds,
  onClick
}: {
  possibleFrogs: DexFrog[];
  pcds: FrogsById;
  onClick: Dispatch<SetStateAction<EdDSAFrogPCD[]>>;
}) => {
  return (
    <CardGrid>
      {possibleFrogs.map(({ id, rarity }) => {
        const frogPCDs = pcds[id];

        if (!frogPCDs) {
          return (
            <CardContainer key={id}>
              <SkeletonCard rarity={rarity}>
                <span>???</span>
                <img
                  src="/images/frogs/pixel_frog.png"
                  draggable={false}
                  style={{ opacity: 0.2 }}
                />
              </SkeletonCard>
              <span></span>
            </CardContainer>
          );
        }

        return (
          <CardContainer key={id}>
            <FrogCard rarity={rarity} onClick={() => onClick(frogPCDs.pcds)}>
              <span>{frogPCDs.frog.name}</span>
              <img src={frogPCDs.frog.imageUrl} draggable={false} />
            </FrogCard>
            <span>x{frogPCDs.pcds.length}</span>
          </CardContainer>
        );
      })}
    </CardGrid>
  );
};

type FrogsById = {
  [frogId: number]: {
    pcds: EdDSAFrogPCD[];
    /**
     * An arbitrary PCD for the frog.
     */
    frog: IFrogData;
  };
};

/**
 * Group PCDs by frog ID.
 */
const useGroupedPCDs = (pcds: EdDSAFrogPCD[]): FrogsById => {
  return useMemo(
    () =>
      pcds.reduce((acc, pcd) => {
        if (!acc[pcd.claim.data.frogId]) {
          acc[pcd.claim.data.frogId] = {
            pcds: [],
            frog: pcd.claim.data
          };
        }
        acc[pcd.claim.data.frogId].pcds.push(pcd);
        return acc;
      }, [] as FrogsById),
    [pcds]
  );
};

const Cell = styled.td`
  padding: 4px;
`;

const RarityBadge = styled.div<{ rarity: Rarity }>`
  padding: 2px;
  border: 1px solid ${({ rarity }) => RARITIES[rarity].color};
  border-radius: 2px;
  font-size: 8px;
  color: var(--white);
  background: ${({ rarity }) => RARITIES[rarity].color};

  text-align: center;
  vertical-align: middle;
`;

const UnknownRarityBadge = styled(RarityBadge)`
  background: rgba(var(--white-rgb), 0.05);
  color: ${({ rarity }) => RARITIES[rarity].color};
`;

const UnknownCell = styled(Cell)`
  color: rgba(var(--white-rgb), 0.5);
`;

const CardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-gap: 10px;
`;

const FrogCard = styled.div<{ rarity: Rarity }>`
  border: 2px solid ${({ rarity }) => RARITIES[rarity].color};
  background-color: ${({ rarity }) => RARITIES[rarity].color};
  background: ${({ rarity }) => RARITIES[rarity].color};

  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: center;
  flex: 1 1 0;
  cursor: pointer;

  > span {
    padding: 4px 2px;
    font-size: 8px;
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
  }

  > img {
    width: 100%;
    height: auto;
    object-fit: cover;
    aspect-ratio: 3 / 2;
    flex: 1;
    border-radius: 0 0 8px 8px;
  }
`;

const SkeletonCard = styled(FrogCard)`
  background: rgba(var(--white-rgb), 0.05);
  border: 2px dashed ${({ rarity }) => RARITIES[rarity].color};

  cursor: unset;
  filter: opacity(40%);
`;

const CardContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: flex-start;
  gap: 4px;
  aspect-ratio: 3 / 4;
  min-width: 0;

  > span {
    font-size: 12px;
    line-height: 16px;
    height: 16px;
    text-align: center;
    color: rgba(var(--white-rgb), 0.8);
  }
`;
