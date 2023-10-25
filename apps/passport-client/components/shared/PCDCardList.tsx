import { PCD } from "@pcd/pcd-types";
import { SemaphoreIdentityPCDTypeName } from "@pcd/semaphore-identity-pcd";
import _ from "lodash";
import { useCallback, useMemo, useState } from "react";
import styled from "styled-components";
import { usePCDCollection } from "../../src/appHooks";
import { PCDCard } from "./PCDCard";

type Sortable = {
  name: string;
  order: number;
};
type SortKey = keyof Sortable;
type SortOption = {
  render: () => JSX.Element;
  key: SortKey;
};
const SORT_OPTIONS: SortOption[] = [
  { render: () => <NameIcon />, key: "name" },
  /**
   * PCDs are naturally sorted by order of when it is added to the collection.
   * The order of its sequence proximates the time it was added.
   */
  { render: () => <ClockIcon />, key: "order" }
];
type SortState = {
  sortBy?: SortKey;
  sortOrder?: "asc" | "desc";
};

export function PCDCardList({ pcds }: { pcds: PCD[] }) {
  const mainPCDId = useMemo(() => {
    if (pcds[0]?.type === SemaphoreIdentityPCDTypeName) {
      return pcds[0]?.id;
    }
  }, [pcds]);

  const pcdCollection = usePCDCollection();
  const sortablePCDs = useMemo(
    () =>
      pcds.map((pcd, i) => ({
        pcd,
        name: pcdCollection.getPackage(pcd.type).getDisplayOptions?.(pcd)
          ?.displayName,
        order: i
      })),
    [pcdCollection, pcds]
  );
  // only show sort options that are valid for all PCDs
  const sortOptions = useMemo(
    () =>
      SORT_OPTIONS.filter(
        (option) =>
          !sortablePCDs.some((pcd) => typeof pcd[option.key] === "undefined")
      ),
    [sortablePCDs]
  );
  const [sortState, setSortState] = useState<SortState>({
    sortBy: "order",
    sortOrder: "asc"
  });
  const sortedPCDs = useMemo(
    () =>
      (sortState.sortBy && sortState.sortOrder
        ? _.orderBy(sortablePCDs, [sortState.sortBy], [sortState.sortOrder])
        : sortablePCDs
      ).map((o) => o.pcd),
    [sortState, sortablePCDs]
  );

  const [selectedPCDID, setSelectedPCDID] = useState("");
  const selectedPCD = useMemo(() => {
    // if user just added a PCD, highlight that one
    if (sessionStorage.newAddedPCDID != null) {
      const added = pcds.find((pcd) => pcd.id === sessionStorage.newAddedPCDID);
      if (added) {
        return added;
      }
    }

    const selected = pcds.find((pcd) => pcd.id === selectedPCDID);
    if (selected) {
      return selected;
    }

    // default to first PCD if no selected PCD found
    return pcds[0];
  }, [pcds, selectedPCDID]);

  const onClick = useCallback((id: string) => {
    setSelectedPCDID(id);
  }, []);

  return (
    <Container>
      {sortablePCDs.length > 1 && (
        <ToolBar
          sortOptions={sortOptions}
          sortState={sortState}
          onSortStateChange={setSortState}
        />
      )}
      {sortedPCDs.map((pcd) => (
        <PCDCard
          key={pcd.id}
          pcd={pcd}
          isMainIdentity={pcd.id === mainPCDId}
          onClick={onClick}
          expanded={pcd.id === selectedPCD?.id}
        />
      ))}
    </Container>
  );
}

function ToolBar({
  sortOptions,
  sortState,
  onSortStateChange
}: {
  sortOptions: SortOption[];
  sortState: SortState;
  onSortStateChange: (sortState: SortState) => void;
}) {
  if (sortOptions.length === 0) return null;

  return (
    <ToolBarContainer>
      {sortOptions.map((o) => {
        const active = sortState.sortBy === o.key;
        const onClick = () => {
          if (active) {
            onSortStateChange({
              sortBy: o.key,
              sortOrder: sortState.sortOrder === "asc" ? "desc" : "asc"
            });
          } else {
            onSortStateChange({
              sortBy: o.key,
              sortOrder: "asc"
            });
          }
        };

        return (
          <ToolBarItem key={o.key} onClick={onClick}>
            {o.render()}
            <SortIcon sortOrder={active ? sortState.sortOrder : undefined} />
          </ToolBarItem>
        );
      })}
    </ToolBarContainer>
  );
}

function SortIcon({ sortOrder }: { sortOrder?: "asc" | "desc" }) {
  return (
    <SortIconContainer>
      <SortIconUp active={sortOrder === "asc"} />
      <SortIconDown active={sortOrder === "desc"} />
    </SortIconContainer>
  );
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const ToolBarContainer = styled.div`
  display: flex;
  flex-direction: row-reverse;
  gap: 8px;
  align-items: center;
`;

const ToolBarItem = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
`;

const SortIconContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const SortIconUp = styled.div<{ active: boolean }>`
  left: 3px;
  display: inline-block;
  width: 0;
  height: 0;
  border: solid 5px transparent;
  background: transparent;
  border-bottom: solid 7px
    ${(p) =>
      p.active ? "var(--accent-darker)" : "rgba(var(--white-rgb), 0.6)"};
  border-top-width: 0;
`;

const SortIconDown = styled.div<{ active: boolean }>`
  left: 3px;
  display: inline-block;
  width: 0;
  height: 0;
  border: solid 5px transparent;
  background: transparent;
  border-top: solid 7px
    ${(p) =>
      p.active ? "var(--accent-darker)" : "rgba(var(--white-rgb), 0.6)"};
  border-bottom-width: 0;
`;

const ClockIcon = styled.div`
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background-color: rgba(var(--white-rgb), 0.6);
  position: relative;
  display: block;

  &::before {
    content: "";
    height: 9px;
    width: 1px;
    background-color: var(--black);
    display: block;
    position: absolute;
    left: 9px;
    top: 3px;
    opacity: 0.6;
  }
  &::after {
    content: "";
    height: 6px;
    width: 1px;
    background-color: var(--black);
    display: block;
    position: absolute;
    top: 7px;
    left: 11px;
    transform: rotate(45deg);
    opacity: 0.6;
  }
`;

const NameIcon = styled.div`
  width: 18px;
  height: 18px;
  position: relative;
  display: block;

  &::before {
    content: "A";
    font-size: 12px;
    line-height: 12px;
    font-weight: 600;
    color: var(--white);
    display: block;
    position: absolute;
    top: 0px;
    opacity: 0.6;
  }
  &::after {
    content: "Z";
    font-size: 12px;
    line-height: 12px;
    font-weight: 600;
    color: var(--white);
    display: block;
    position: absolute;
    right: 0px;
    bottom: 0px;
    opacity: 0.6;
  }
`;
