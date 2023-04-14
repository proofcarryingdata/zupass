import React, { useCallback, useState } from "react";
import styled from "styled-components";

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
  border: 1px solid var(--accent-lite);
  overflow: hidden;
  padding: 4px 8px;
  border-radius: 4px;
`;

export const HiddenTextContainer = styled(TextContainer)`
  display: flex;
  justify-content: center;
  align-items: center;
  user-select: none;
  cursor: pointer;
`;
