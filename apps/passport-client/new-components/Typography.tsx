import React from "react";
import styled from "styled-components";

const TypographyText = styled.span`
  font-family: "Barlow", sans-serif;
  color: rgba(0, 0, 0, 1);
`;
interface TypographyProps {
  children?: React.ReactNode;
}
export const Typography: React.FC<TypographyProps> = ({
  children
}): JSX.Element => {
  return <TypographyText>{children}</TypographyText>;
};
