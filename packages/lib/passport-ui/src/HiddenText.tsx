import { ReactNode, useCallback, useState } from "react";
import { FieldLabel } from "./Core";
import styled from "./StyledWrapper";

export function HiddenText({
  text,
  style
}: {
  text: string;
  style?: React.CSSProperties;
}): JSX.Element {
  const [visible, setVisible] = useState(false);

  const onRevealClick = useCallback(() => {
    setVisible(true);
  }, []);

  if (visible) {
    return <TextContainer style={style}>{text}</TextContainer>;
  }

  return (
    <HiddenTextContainer onClick={onRevealClick}>
      Tap to reveal
    </HiddenTextContainer>
  );
}

const CardWrapper = styled.div`
  border: 1px solid #eceaf4;
  background-color: #f6f8fd;
  padding: 4px;
  border-radius: 8px;
`;

export const Card = ({
  title,
  children
}: {
  title: string;
  children: ReactNode;
}): JSX.Element => {
  return (
    <CardWrapper>
      <FieldLabel style={{ paddingLeft: 12, paddingTop: 4, paddingBottom: 8 }}>
        {title}
      </FieldLabel>
      {children}
    </CardWrapper>
  );
};

export const TextContainer = styled.div`
  border: 1px solid #eceaf4;
  overflow: hidden;
  padding: 10px 12px;
  border-radius: 8px;

  min-height: 40px;
  border: 1px solid rgba(0, 0, 0, 0.05);
  background: #fff;
  color: var(--text-primary, #1e2c50);
  font-family: Rubik;
  font-size: 16px;
  line-height: 20px;
`;

export const HiddenTextContainer = styled.div`
  border: 1px solid #eceaf4;
  overflow: hidden;
  padding: 4px 8px;
  height: 42px;
  border-radius: 4px;
  display: flex;
  justify-content: center;
  align-items: center;
  user-select: none;
  cursor: pointer;
  background-color: #ffffff;
  &:hover {
    background-color: rgba(0, 0, 0, 0.12);
  }

  color: var(--text-primary);
  font-family: Rubik;
  font-size: 16px;
  font-style: normal;
  font-weight: 500;
  line-height: 135%; /* 21.6px */
`;
