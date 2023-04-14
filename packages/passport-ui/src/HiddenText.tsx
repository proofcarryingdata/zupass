import { useCallback, useState } from "react";
import styled from "styled-components";
import React from "react";

export function HiddenText({ text, label }: { text: string; label: string }) {
  const [visible, setVisible] = useState(false);

  const onRevealClick = useCallback(() => {
    setVisible(true);
  }, []);

  if (visible) {
    return <TextContainer>{text}</TextContainer>;
  }

  return (
    <HiddenTextContainer onClick={onRevealClick}>
      tap to reveal {label}
    </HiddenTextContainer>
  );
}

export const TextContainer = styled.div`
  border: 2px solid var(--bg-dark-primary);
  overflow: hidden;
  padding: 4px 8px;
  border-radius: 4px;
  background-color: rgba(255, 255, 255, 0.2);
  &:hover {
    background-color: rgba(255, 255, 255, 0.21);
  }
`;

export const HiddenTextContainer = styled.div`
  border: 2px solid var(--bg-dark-primary);
  overflow: hidden;
  padding: 4px 8px;
  border-radius: 4px;
  display: flex;
  justify-content: center;
  align-items: center;
  user-select: none;
  cursor: pointer;
  background-color: rgba(0, 0, 0, 0.2);
  &:hover {
    background-color: rgba(0, 0, 0, 0.18);
  }
`;
