import { Property } from "csstype";
import React from "react";
import styled from "styled-components";
import { getTruncateEmail } from "./utils";

export type FontWeight = 400 | 500 | 600 | 700 | 800 | 900;
export type FontSize = 10 | 12 | 14 | 16 | 18 | 20 | 24;
export type FontFamily = "Barlow" | "Rubik";

const LINE_HEIGHT: Record<FontSize, number> = {
  "10": 13.5,
  "12": 16.2,
  "14": 18.9,
  "16": 21.6,
  "18": 24.3,
  "20": 27,
  "24": 32.4
};

const TypographyText = styled.span<{
  $fontSize: FontSize;
  $fontWeight: FontWeight;
  $color: Property.Color;
  $opacity?: number;
  $underline?: boolean;
  $family?: FontFamily;
  $align?: React.CSSProperties["textAlign"];
  $truncate?: boolean;
}>`
  font-family: ${({ $family }): string => $family ?? "Barlow"}, sans-serif;
  font-size: ${({ $fontSize }): string => `${$fontSize}px`};
  font-weight: ${({ $fontWeight }): number => $fontWeight};
  line-height: ${({ $fontSize }): string =>
    `${LINE_HEIGHT[$fontSize ?? 16]}px`};
  color: ${({ $color }): Property.Color => $color};
  opacity: ${({ $opacity }): number => $opacity ?? 1};
  text-decoration: ${({ $underline }): string =>
    $underline ? "underline" : "none"};
  text-align: ${({ $align }): React.CSSProperties["textAlign"] => $align};
  ${({ $truncate }): string =>
    $truncate
      ? `
    display: block;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    width: 100%;
  `
      : ""}
`;

interface TypographyProps {
  fontSize?: FontSize;
  fontWeight?: FontWeight;
  family?: FontFamily;
  color?: Property.Color;
  children?: React.ReactNode;
  opacity?: number;
  underline?: boolean;
  align?: React.CSSProperties["textAlign"];
  style?: React.CSSProperties;
  truncate?: boolean;
  truncateEmail?: boolean;
}

export const Typography: React.FC<TypographyProps> = ({
  children,
  fontSize = 14,
  fontWeight = 400,
  color = "var(--text-primary)",
  opacity,
  underline,
  style,
  family,
  align,
  truncate = false,
  truncateEmail = false
}): JSX.Element => {
  const content = React.useMemo(() => {
    if (truncateEmail && typeof children === "string") {
      const emails = children.split("\n");
      return emails.map((email, index) => (
        <React.Fragment key={index}>
          {getTruncateEmail(email.trim(), 30)}
          {index < emails.length - 1 && <br />}
        </React.Fragment>
      ));
    }
    return children;
  }, [children, truncateEmail]);

  return (
    <TypographyText
      $family={family ?? "Barlow"}
      $fontSize={fontSize}
      $fontWeight={fontWeight}
      $color={color}
      $opacity={opacity}
      $underline={underline}
      $align={align}
      $truncate={truncate}
      style={style}
    >
      {content}
    </TypographyText>
  );
};
