import * as React from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";

export function Button({
  children,
  onClick,
  style,
  type,
}: {
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  style?: "primary" | "danger";
  type?: "submit" | "button" | "reset";
}) {
  const Btn = style === "danger" ? BtnDanger : BtnBase;
  return (
    <Btn type={type} onClick={onClick}>
      {children}
    </Btn>
  );
}

const buttonStyle = `
  width: 100%;
  height: 48px;
  padding: 12px;
  color: #19473f;
  border: none;
  border-radius: 99px;
  font-size: 16px;
  font-weight: 600;
  background: rgba(252, 210, 112, 0.9);
  cursor: pointer;
  &:hover {
    background: rgba(252, 210, 112, 0.95);
  }
  &:active {
    background: rgba(252, 210, 112, 1);
  }
`;

const BtnBase = styled.button`
  ${buttonStyle}
`;

const BtnDanger = styled(BtnBase)`
  background: rgba(169, 89, 64, 0.9);
  &:hover {
    background: rgba(169, 89, 64, 0.95);
  }
  &:active {
    background: rgba(169, 89, 64, 1);
  }
`;

export const LinkButton = styled(Link)`
  ${buttonStyle}
  display: block;
  width: 100%;
  text-align: center;
  text-decoration: none;
`;
