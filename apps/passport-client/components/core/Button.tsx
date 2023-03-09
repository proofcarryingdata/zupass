import * as React from "react";
import styled from "styled-components";

export function Button({
  children,
  onClick,
  style,
  type,
}: {
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  style?: "primary" | "secondary";
  type?: "submit" | "button" | "reset";
}) {
  const Btn = style === "primary" ? BtnPrimary : BtnBase;
  return (
    <Btn type={type} onClick={onClick}>
      {children}
    </Btn>
  );
}

const BtnBase = styled.button`
  width: 100%;
  padding: 16px;
  color: #666;
  border: 1px solid #666;
  border-radius: 4px;
  font-size: 1rem;
  background: transparent;
  cursor: pointer;
  &:hover {
    background: rgba(0, 0, 0, 0.01);
  }
  &:active {
    background: rgba(0, 0, 0, 0.03);
  }
`;

const BtnPrimary = styled(BtnBase)`
  color: #000;
  border-color: #000;
`;
