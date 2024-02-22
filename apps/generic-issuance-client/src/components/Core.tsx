import { ExternalLinkIcon } from "@chakra-ui/icons";
import { Link } from "@chakra-ui/react";
import { ReactNode, useCallback } from "react";
import { Link as ReactLink } from "react-router-dom";
import styled from "styled-components";

/**
 * Use in place of {@link Link} and {@link ReactLink}.
 */
export const PodLink = ({
  to,
  children,
  isExternal,
  hideIcon,
  onClick
}: {
  to: string;
  children?: ReactNode;
  isExternal?: boolean;
  onClick?: () => void;
  hideIcon?: boolean;
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
      {isExternal && !hideIcon && <ExternalLinkIcon mx="2px" />}
    </Link>
  );
};

export const HomeLink = (): JSX.Element => {
  return <PodLink to={"/"}>Home</PodLink>;
};

export const PageContent = styled.div`
  padding: 32px;
`;
