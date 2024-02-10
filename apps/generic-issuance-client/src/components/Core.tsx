import React, { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import styled, { FlattenSimpleInterpolation, css } from "styled-components";
import { PCD_GITHUB_URL } from "../constants";

export const Container = styled.div`
  font-family: system-ui, sans-serif;
  border: 1px solid black;
  border-radius: 8px;
  padding: 8px;
  margin-bottom: 8px;
`;

export const HomeLink = (): JSX.Element => {
  return <Link to={"/"}>Home</Link>;
};

export const CodeLink = ({
  file,
  children
}: {
  file: string;
  children: React.ReactNode;
}): JSX.Element => {
  return <a href={PCD_GITHUB_URL + file}>{children}</a>;
};

export const CollapsableCode = ({
  code,
  label
}: {
  code: string;
  label?: string;
}): JSX.Element => {
  const [collapsed, setCollapsed] = useState(true);

  const toggle = useCallback(() => {
    setCollapsed((collapsed) => !collapsed);
  }, []);

  let buttonText = collapsed ? "Expand" : "Collapse";
  if (label !== undefined) {
    buttonText += " " + label;
  }

  if (collapsed) {
    return <button onClick={toggle}>{buttonText}</button>;
  }

  return (
    <>
      <button onClick={toggle}>{buttonText}</button>
      <CollapsableCodeContainer>
        <pre>{code}</pre>
      </CollapsableCodeContainer>
    </>
  );
};

const CollapsableCodeContainer = styled.div`
  border-radius: 8px;
  border: 1px solid grey;
  overflow-y: scroll;
  max-width: 100%;
  padding: 8px;
`;

export const PageContent = styled.div`
  padding: 32px;
`;

export const GOLD = "#f4ff1f";
export const TABLE_BORDER_COLOR = "#5d5d5d";
export const TABLE_BORDER_WIDTH = "1px";
export const CELL_PADDING = "6px 10px";
export const TABLE_FONT_SIZE = "inherit";

export const Table = styled.table`
  ${({ twoColumn }: { twoColumn?: boolean }): FlattenSimpleInterpolation => css`
    font-size: ${TABLE_FONT_SIZE};
    border-collapse: collapse;

    thead {
      user-select: none;

      tr,
      th {
        /* font-weight: bold; */
        text-align: right;
        padding: ${CELL_PADDING};
        border: ${TABLE_BORDER_WIDTH} solid ${TABLE_BORDER_COLOR};
      }
    }

    tr {
      td {
        padding: ${CELL_PADDING};
        border: ${TABLE_BORDER_WIDTH} solid ${TABLE_BORDER_COLOR};
      }

      ${twoColumn &&
      css`
        td:first-child {
          text-align: left;
        }
        td:last-child {
          text-align: right;
        }
      `}
    }
  `}
`;

export const TextButton = styled.span`
  cursor: pointer;
  user-select: none;

  &:hover {
    text-decoration: underline;
  }
`;
