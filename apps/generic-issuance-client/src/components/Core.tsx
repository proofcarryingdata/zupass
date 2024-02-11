import { ExternalLinkIcon } from "@chakra-ui/icons";
import { Link } from "@chakra-ui/react";
import { ReactNode, useCallback } from "react";
import { Link as ReactLink } from "react-router-dom";
import styled from "styled-components";
import { PCD_GITHUB_URL } from "../constants";

export const PodLink = ({
  to,
  children,
  isExternal,
  onClick
}: {
  to: string;
  children?: ReactNode;
  isExternal?: boolean;
  onClick?: () => void;
}): JSX.Element => {
  const onClickWrapper = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onClick?.();
    },
    [onClick]
  );

  return (
    <Link
      to={to}
      as={ReactLink}
      isExternal={isExternal}
      onClick={onClickWrapper}
    >
      {children}
      {isExternal && <ExternalLinkIcon mx="2px" />}
    </Link>
  );
};

export const HomeLink = (): JSX.Element => {
  return <PodLink to={"/"}>Home</PodLink>;
};

export const CodeLink = ({
  file,
  children
}: {
  file: string;
  children: React.ReactNode;
}): JSX.Element => {
  return <PodLink to={PCD_GITHUB_URL + file}>{children}</PodLink>;
};

export const PageContent = styled.div`
  padding: 32px;
`;
