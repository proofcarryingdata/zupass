import { icons } from "@pcd/passport-ui";
import { Link } from "react-router-dom";
import styled from "styled-components";

export function ScreenNavigation({
  to,
  label
}: {
  to: string;
  label: string;
}): JSX.Element {
  return (
    <Navigation>
      <BackLink to={to}>
        <BackIcon src={icons.back} />
        <span>{label}</span>
      </BackLink>
    </Navigation>
  );
}

const Navigation = styled.div`
  text-align: left;
  width: 100%;
  padding-bottom: 8px;
`;

const BackIcon = styled.img`
  width: 16px;
  height: 16px;
`;

const BackLink = styled(Link)`
  display: inline-flex;
  padding: 8px;
  border-radius: 8px;
  align-items: center;
  column-gap: 8px;
  &:hover {
    background: var(--bg-lite-gray);
  }
`;
