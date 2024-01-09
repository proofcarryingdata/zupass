import { useCallback, useState } from "react";
import styled from "./StyledWrapper";

export function HiddenText({ text }: { text: string }) {
  const [visible, setVisible] = useState(false);

  const onRevealClick = useCallback(() => {
    setVisible(true);
  }, []);

  if (visible) {
    return <TextContainer>{text}</TextContainer>;
  }

  return (
    <HiddenTextContainer onClick={onRevealClick}>
      tap to reveal
    </HiddenTextContainer>
  );
}

export const TextContainer = styled.div`
  border: 2px solid var(--primary-lite);
  overflow: hidden;
  padding: 4px 8px;
  border-radius: 4px;
  margin-bottom: 8px;
`;

export const HiddenTextContainer = styled.div`
  border: 2px solid var(--primary-lite);
  overflow: hidden;
  padding: 4px 8px;
  border-radius: 4px;
  display: flex;
  justify-content: center;
  align-items: center;
  user-select: none;
  cursor: pointer;
  background-color: rgba(0, 0, 0, 0.1);
  &:hover {
    background-color: rgba(0, 0, 0, 0.12);
  }
`;
