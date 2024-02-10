import { Button, Checkbox } from "@chakra-ui/react";
import { GenericIssuanceSelfResult } from "@pcd/passport-interface";
import { useStytch } from "@stytch/react";
import { ReactNode, useCallback, useContext } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { GIContext } from "../helpers/Context";

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
  const onAdminToggleClick = useCallback(() => {
    ctx.setState({ isAdminMode: !ctx.isAdminMode });
  }, [ctx]);

  const title = <Title key="title" />;

  if (!user?.value) {
    return (
      <HeaderContainer>
        <LeftHalf>{title}</LeftHalf>
        <RightHalf>
          {/* to prevent page reflow on data load */}
          <Button style={{ visibility: "hidden" }}>...</Button>
        </RightHalf>
      </HeaderContainer>
    );
  }

  leftElements.push(title);

  if (user.value.isAdmin) {
    rightElements.push(
      <span key="admin-toggle">
        <Checkbox
          style={{ cursor: "pointer", userSelect: "none" }}
          size="md"
          type="checkbox"
          isChecked={!!ctx.isAdminMode}
          onChange={onAdminToggleClick}
        >
          admin view
        </Checkbox>
      </span>
    );
  }

  rightElements.push(
    <span key="logout">
      <Button
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
      </Button>
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
  width: 100vw;
  padding: 16px 28px;
  box-sizing: border-box;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

export const LeftHalf = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
`;

export const RightHalf = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
`;

export const Title = (): ReactNode => (
  <Link to="/dashboard">
    <Button>
      <span style={{ fontSize: "20pt" }}>📦</span>
      &nbsp; &nbsp;
      <span>Podbox</span>
    </Button>
  </Link>
);
