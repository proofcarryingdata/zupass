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
  color: var(--bg-dark-primary);
  border: none;
  border-radius: 99px;
  font-size: 16px;
  font-weight: 600;
  background: var(--accent-dark);
  opacity: 0.9;
  cursor: pointer;
  &:hover {
    opacity: 0.95;
  }
  &:active {
    opacity: 1;
  }
`;

const BtnBase = styled.button`
  ${buttonStyle}
`;

const BtnDanger = styled(BtnBase)`
  color: #fff;
  background: var(--danger);
`;

export const LinkButton = styled(Link)`
  ${buttonStyle}
  display: block;
  width: 100%;
  text-align: center;
  text-decoration: none;
  color: var(--primary-dark) !important;
`;
