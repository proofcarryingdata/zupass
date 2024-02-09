import { GenericIssuanceSelfResult } from "@pcd/passport-interface";
import { useStytch } from "@stytch/react";
import { ReactNode, useCallback, useContext, useState } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { GIContext } from "../helpers/Context";
import { TABLE_BORDER_COLOR, TABLE_BORDER_WIDTH, TextButton } from "./Core";

/**
 * A header that displays information about the logged-in user
 * and provides rudimentary navigation help. Intended to be
 * displayed at the top of all the generic issuance client pages.
 */
export function Header({
  user,
  includeLinkToDashboard,
  stytchClient
}: {
  user?: GenericIssuanceSelfResult;
  includeLinkToDashboard?: boolean;
  stytchClient?: ReturnType<typeof useStytch>;
}): ReactNode {
  const leftElements: ReactNode[] = [];
  const rightElements: ReactNode[] = [];
  const ctx = useContext(GIContext);
  const [showUserId, setShowUserId] = useState(false);
  const onAdminToggleClick = useCallback(() => {
    ctx.setState({ isAdminMode: !ctx.isAdminMode });
  }, [ctx]);

  const title = <Title key="title" />;
  const linkToDashboard = (
    <span key="back">
      <Link to="/dashboard">
        <button>👈 Back to Dashboard</button>
      </Link>
      {" · "}
    </span>
  );

  if (!user?.value) {
    return (
      <HeaderContainer>
        <LeftHalf>
          {includeLinkToDashboard ? linkToDashboard : null}
          {title}
        </LeftHalf>
        <RightHalf>
          {/* to prevent page reflow on data load */}
          <button style={{ visibility: "hidden" }}>...</button>
        </RightHalf>
      </HeaderContainer>
    );
  }

  if (includeLinkToDashboard) {
    leftElements.push(linkToDashboard);
  }

  leftElements.push(title);

  leftElements.push(
    <span key="email">
      {" · "}
      {user?.value?.email}
    </span>
  );

  if (user.value.isAdmin) {
    leftElements.push(
      <span key="admin">
        {" · "}
        {"admin"}
      </span>
    );
  }

  leftElements.push(
    <span key="id">
      {" · "}
      <TextButton
        onClick={(): void => {
          setShowUserId((show) => !show);
        }}
      >
        user id
      </TextButton>{" "}
      {showUserId ? user.value.id : "***"}
    </span>
  );

  if (user.value.isAdmin) {
    rightElements.push(
      <span key="admin-toggle">
        <label style={{ cursor: "pointer", userSelect: "none" }}>
          admin view
          <input
            type="checkbox"
            checked={!!ctx.isAdminMode}
            onChange={onAdminToggleClick}
          />
        </label>
        {" · "}
      </span>
    );
  }

  rightElements.push(
    <span key="logout">
      <button
        onClick={async (): Promise<void> => {
          if (confirm("Are you sure you want to log out?")) {
            try {
              await stytchClient?.session.revoke();
              window.location.href = "/";
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

  return (
    <HeaderContainer>
      <LeftHalf>{leftElements}</LeftHalf>
      <RightHalf>{rightElements}</RightHalf>
    </HeaderContainer>
  );
}

export const HeaderContainer = styled.div`
  border-bottom: ${TABLE_BORDER_WIDTH} solid ${TABLE_BORDER_COLOR};
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

export const Title = (): ReactNode => <span>📦 Podbox</span>;
