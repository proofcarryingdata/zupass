import { PCD } from "@pcd/pcd-types";
import { sleep } from "@pcd/util";
import _ from "lodash";
import { useCallback, useMemo, useState } from "react";
import styled from "styled-components";
import { usePCDCollection, useUserIdentityPCD } from "../../src/appHooks";
import { PCDCard } from "./PCDCard";

type Sortable<T = unknown> = {
  name: string;
  index: number;
  value: T;
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
  { render: () => <ClockIcon />, key: "index" }
];
type SortState = {
  sortBy?: SortKey;
  sortOrder?: "asc" | "desc";
};

export function PCDCardList({
  pcds,
  defaultSortState,
  allExpanded,
  hideRemoveButton,
  hidePadding
}: {
  pcds: PCD[];
  /**
   * Defaults to natural order of PCDs which loosely corresponds to when it is issued.
   */
  defaultSortState?: SortState;
  /**
   * If true, all PCDs will be expanded. Otherwise, the last clicked PCD is expanded.
   */
  allExpanded?: boolean;
  /**
   * If true, all PCDs will have the remove button hidden.
   */
  hideRemoveButton?: boolean;
  /**
   * If true, all PCDs will have padding hidden.
   */
  hidePadding?: boolean;
}): JSX.Element {
  const pcdCollection = usePCDCollection();
  const userIdentityPCD = useUserIdentityPCD();
  const userIdentityPCDId = userIdentityPCD?.id;
  const sortablePCDs = useMemo<Sortable<PCD>[]>(
    () =>
      pcds.map((pcd, i) => ({
        value: pcd,
        name:
          pcdCollection.getPackage(pcd.type)?.getDisplayOptions?.(pcd)
            ?.displayName ?? "",
        index: i
      })),
    [pcdCollection, pcds]
  );
  // only show sort options that are valid for all PCDs
  const sortOptions = useMemo(
    () =>
      SORT_OPTIONS.filter(
        (option) =>
          !sortablePCDs.some(
            (sortable) => typeof sortable[option.key] === "undefined"
          )
      ),
    [sortablePCDs]
  );
  const [sortState, setSortState] = useState<SortState>(
    defaultSortState ?? {
      sortBy: "index",
      sortOrder: "asc"
    }
  );
  const sortedPCDs = useMemo(
    () =>
      (sortState.sortBy && sortState.sortOrder
        ? _.orderBy(sortablePCDs, [sortState.sortBy], [sortState.sortOrder])
        : sortablePCDs
      ).map((o) => o.value),
    [sortState, sortablePCDs]
  );

  const [selectedPCDID, setSelectedPCDID] = useState("");
  const selectedPCD = useMemo(() => {
    // if user just added a PCD, highlight that one
    if (sessionStorage.newAddedPCDID) {
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

  const onClick = useCallback(
    async (id: string, cardContainer: HTMLDivElement | undefined) => {
      if (selectedPCDID === id) return;

      setSelectedPCDID(id);

      if (cardContainer) {
        await sleep(0);
        cardContainer.scrollIntoView({
          behavior: "instant",
          block: "start",
          inline: "nearest"
        });
        window.scrollBy(0, -50);
      }
    },
    [selectedPCDID]
  );

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
          hideRemoveButton={hideRemoveButton}
          hidePadding={hidePadding}
          key={pcd.id}
          pcd={pcd}
          isMainIdentity={pcd.id === userIdentityPCDId}
          onClick={allExpanded ? undefined : onClick}
          expanded={allExpanded || pcd.id === selectedPCD?.id}
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
}): JSX.Element | null {
  if (sortOptions.length === 0) return null;

  return (
    <ToolBarContainer>
      <ToolBarText>Sort:</ToolBarText>
      {sortOptions.map((o) => {
        const active = sortState.sortBy === o.key;
        const onClick = (): void => {
          if (active && sortState.sortOrder === "asc") {
            onSortStateChange({
              sortBy: o.key,
              sortOrder: "desc"
            });
          } else if (active && sortState.sortOrder === "desc") {
            onSortStateChange({});
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

function SortIcon({ sortOrder }: { sortOrder?: "asc" | "desc" }): JSX.Element {
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
  gap: 8px;
  align-items: center;
`;

const ToolBarItem = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  padding: 4px;

  &:hover {
    box-shadow: inset 0 0 100px 100px rgba(255, 255, 255, 0.1);
    border-radius: 8px;
  }
`;

const ToolBarText = styled.span`
  margin-left: auto;
  user-select: none;
  color: rgba(var(--white-rgb), 0.8);
  font-size: 18px;
`;

const SortIconContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const SortIconUp = styled.div<{ active: boolean }>`
  left: 3px;
  display: inline-block;
  width: 0;
  height: 0;
  border: solid 5px transparent;
  background: transparent;
  border-bottom: solid 7px
    ${(p): string =>
      p.active ? "var(--accent-darker)" : "rgba(var(--white-rgb), 0.8)"};
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
    ${(p): string =>
      p.active ? "var(--accent-darker)" : "rgba(var(--white-rgb), 0.8)"};
  border-bottom-width: 0;
`;

const ClockIcon = styled.div`
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background-color: #fff;
  position: relative;
  display: block;
  opacity: 0.8;
  z-index: -1;

  &::before {
    content: "";
    height: 10px;
    width: 1px;
    background-color: #000;
    display: block;
    position: absolute;
    left: 10px;
    top: 3px;
    opacity: 0.8;
  }
  &::after {
    content: "";
    height: 6px;
    width: 1px;
    background-color: #000;
    display: block;
    position: absolute;
    top: 8px;
    left: 12px;
    transform: rotate(45deg);
    opacity: 0.8;
  }
`;

const NameIcon = styled.div`
  width: 22px;
  height: 22px;
  position: relative;
  display: block;

  &::before {
    content: "A";
    font-size: 14px;
    line-height: 14px;
    font-weight: 600;
    color: #fff;
    display: block;
    position: absolute;
    top: 0px;
    opacity: 0.8;
    z-index: -1;
  }
  &::after {
    content: "Z";
    font-size: 14px;
    line-height: 14px;
    font-weight: 600;
    color: #fff;
    display: block;
    position: absolute;
    right: 0px;
    bottom: 0px;
    opacity: 0.8;
    z-index: -1;
  }
`;
