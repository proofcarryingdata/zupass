import { Link } from "react-router-dom";
import styled from "styled-components";
import { icons } from "../icons/index";

export function ScreenNavigation({ to, label }: { to: string; label: string }) {
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
