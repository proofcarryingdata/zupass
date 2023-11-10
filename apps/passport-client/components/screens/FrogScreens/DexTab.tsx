import { EdDSAFrogPCD, Rarity } from "@pcd/eddsa-frog-pcd";
import { DexFrog } from "@pcd/passport-interface";
import { useMemo } from "react";
import styled from "styled-components";
import { RippleLoader } from "../../core/RippleLoader";

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
  const names = useMemo(() => {
    const names: string[] = [];

    pcds.forEach((pcd) => {
      names[pcd.claim.data.frogId] = pcd.claim.data.name;
    });

    return names;
  }, [pcds]);

  if (!possibleFrogs) {
    return <RippleLoader />;
  }

  return (
    <table>
      <tbody>
        {possibleFrogs.map(({ id, rarity }) => (
          <tr key={id}>
            <Cell>{id}</Cell>
            {names[id] ? (
              <>
                <Cell>
                  <RarityBadge rarity={rarity}>
                    {RARITIES[rarity].label}
                  </RarityBadge>
                </Cell>
                <Cell>{names[id]}</Cell>
              </>
            ) : (
              <>
                <Cell>
                  <UnknownRarityBadge rarity={rarity}>
                    {RARITIES[rarity].label}
                  </UnknownRarityBadge>
                </Cell>
                <UnknownCell>???</UnknownCell>
              </>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

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
