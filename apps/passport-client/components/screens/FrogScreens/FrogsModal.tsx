import { EdDSAFrogPCD } from "@pcd/eddsa-frog-pcd";
import _ from "lodash";
import { useCallback, useState } from "react";
import { useSwipeable } from "react-swipeable";
import styled from "styled-components";
import { AdhocModal } from "../../modals/AdhocModal";
import { PCDCard } from "../../shared/PCDCard";

export function FrogsModal({
  pcds,
  color,
  onClose
}: {
  pcds: EdDSAFrogPCD[];
  color: string;
  onClose: () => void;
}): JSX.Element {
  const [focused, setFocused] = useState<number | null>(0);
  const focusedPCD = pcds[focused ?? 0];

  const onSwipeLeft = useCallback(() => {
    setFocused((prev) => Math.min(pcds.length - 1, (prev ?? 0) + 1));
  }, [pcds]);
  const onSwipeRight = useCallback(() => {
    setFocused((prev) => Math.max(0, (prev ?? 0) - 1));
  }, []);
  const handlers = useSwipeable({
    onSwiped: (eventData) => {
      if (eventData.dir === "Left") {
        onSwipeLeft();
      } else if (eventData.dir === "Right") {
        onSwipeRight();
      }
    }
  });

  return (
    <AdhocModal
      open={!!pcds}
      onClose={onClose}
      center
      styles={{
        modal: {
          maxWidth: "400px"
        }
      }}
    >
      <Container
        index={focused ?? 0}
        count={pcds.length}
        color={color}
        {...handlers}
      >
        <ButtonContainer disabled={focused === 0} onClick={onSwipeRight}>
          <span>&lsaquo;</span>
        </ButtonContainer>
        <PCDCard pcd={focusedPCD} expanded hideRemoveButton />
        <ButtonContainer
          onClick={onSwipeLeft}
          disabled={focused === pcds.length - 1}
        >
          <span>&rsaquo;</span>
        </ButtonContainer>
      </Container>
    </AdhocModal>
  );
}

const Container = styled.div<{ index: number; count: number; color: string }>`
  padding: 16px;

  display: flex;
  gap: 4px;
  align-items: stretch;
  justify-content: space-around;

  > div > div {
    padding: 0;
    border: 1px solid ${({ color }): string => color};
    box-shadow: ${({ index, count, color }): string => {
      return [..._.range(-1, -index - 1, -1), ..._.range(1, count - index)]
        .map((i) => {
          const offset = i * 2;

          return [
            `${offset}px ${offset}px 2px -1px white`,
            `${offset}px ${offset}px 2px 0 ${color}`
          ];
        })
        .join(", ");
    }};
  }
`;

const ButtonContainer = styled.div<{ disabled: boolean }>`
  display: flex;
  justify-content: center;
  align-items: center;
  flex: 1 1 0;
  cursor: ${({ disabled }): string => (disabled ? "default" : "pointer")};
  user-select: none;
  font-size: 32px;
  color: ${({ disabled }): string =>
    disabled ? "rgba(var(--white-rgb), 0.2)" : "rgba(var(--white-rgb), 0.8)"};
  padding: 8px;

  &:hover {
    color: ${({ disabled }): string =>
      disabled ? "rgba(var(--white-rgb), 0.2)" : "rgba(var(--white-rgb), 1)"};
  }
`;
