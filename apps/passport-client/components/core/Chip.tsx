import React from "react";

import styled from "styled-components";

/**
 * Chips are small, compact elements that represent an attribute, text, or action.
 *
 * See https://m3.material.io/components/chips/overview
 */
export function Chip({
  icon,
  label,
  onClick,
  disabled,
  checked
}: {
  // optional leading icon left of the label
  icon?: React.ReactNode;
  // label text to display in the chip
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  checked?: boolean;
}) {
  return (
    <Container onClick={onClick} disabled={disabled} checked={checked}>
      {icon}
      <Label>{label}</Label>
    </Container>
  );
}

const Container = styled.div<{
  onClick?: () => void;
  disabled?: boolean;
  checked?: boolean;
}>`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  height: 24px;
  border-radius: 6px;
  padding: 2px 6px;
  border: 1px solid
    ${(p) =>
      p.checked
        ? "rgba(var(--white-rgb), 0.3)"
        : "rgba(var(--white-rgb), 0.1)"};
  background: ${(p) =>
    p.checked ? "rgba(var(--white-rgb), 0.05)" : "transparent"};
  color: ${(p) => (p.checked ? "var(--white)" : "rgba(var(--white-rgb), 0.5)")};
  cursor: ${(p) => !p.disabled && p.onClick && "pointer"};
  pointer-events: ${(p) => (p.disabled ? "none" : "auto")};
`;

const Label = styled.div`
  font-size: 14px;
`;

export const ChipsContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-start;
  flex-wrap: wrap;
  gap: 8px;
`;
