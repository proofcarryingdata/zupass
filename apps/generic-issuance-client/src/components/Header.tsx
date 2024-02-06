import { useStytch } from "@stytch/react";
import { ReactNode } from "react";
import styled from "styled-components";
import { useFetchSelf } from "../helpers/useFetchSelf";

export function Header(): ReactNode {
  const stytchClient = useStytch();
  const self = useFetchSelf();
  const user = self?.value;

  const leftElements: ReactNode[] = [];
  const rightElements: ReactNode[] = [];

  leftElements.push(<b key="title">Generic Issuance</b>);

  if (user) {
    leftElements.push(
      <b key="email">
        {" · "}
        {user.email}
      </b>
    );
  }

  if (user?.isAdmin) {
    leftElements.push(
      <b key="admin">
        {" · "}
        {"admin"}
      </b>
    );
  }

  if (user) {
    leftElements.push(
      <b key="id">
        {" · user id: "}
        <i style={{ fontWeight: "normal" }}>{user.id}</i>
      </b>
    );
  }

  if (user) {
    rightElements.push(
      <span key="logout">
        <button
          onClick={async (): Promise<void> => {
            if (confirm("Are you sure you want to log out?")) {
              try {
                await stytchClient.session.revoke();
              } catch (e) {
                // TODO: better error handling
              }
            }
          }}
        >
          Log Out
        </button>
      </span>
    );
  }

  return (
    <HeaderContainer>
      <LeftHalf>{leftElements}</LeftHalf>
      <RightHalf>{rightElements}</RightHalf>
    </HeaderContainer>
  );
}

export const HeaderContainer = styled.div`
  border-bottom: 2px solid #f4ff1f;
  width: 100vw;
  height: auto;
  padding: 16px;
  box-sizing: border-box;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

export const LeftHalf = styled.div``;

export const RightHalf = styled.div``;
