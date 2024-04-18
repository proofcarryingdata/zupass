import { useRouter } from "next/navigation";
import { useCallback } from "react";
import styled from "styled-components";
import { SettingsDrawer } from "../../../app/main/SettingsDrawer";
import { DEFAULT_CONTENT_WIDTH } from "./Elements";
import { Button } from "./button";

export interface HeaderProps {
  actions?: any;
  title?: string;
}

export function AppHeader({ actions, title }: HeaderProps) {
  return (
    <HeaderContainer>
      <MainScreenContainer>
        <SettingsDrawer />
        <div className="flex flex-row gap-4 items-center justify-center">
          {title ? (
            <div className="text-2xl">{title}</div>
          ) : (
            <div className="text-2xl">Zupoll</div>
          )}
        </div>
        <div className="flex row gap-2 ml-2">{actions}</div>
      </MainScreenContainer>
    </HeaderContainer>
  );
}

export function MainActions({
  logout,
  createBallot
}: {
  logout: () => void;
  createBallot: () => void;
}) {
  return (
    <>
      <Button variant="creative" onClick={createBallot}>
        Create Ballot
      </Button>
    </>
  );
}

export function LogoutButton({ logout }: { logout: () => void }) {
  const confirmLogout = useCallback(() => {
    if (window.confirm("Are you sure you want to log out?")) {
      logout();
    }
  }, [logout]);

  return (
    <Button variant="outline" onClick={confirmLogout}>
      Log Out
    </Button>
  );
}

export function SubpageActions() {
  const router = useRouter();
  return (
    <Button onClick={() => router.push("/")} variant="outline">
      Home
    </Button>
  );
}

const HeaderContainer = styled.div`
  padding-bottom: 1em;
  margin-bottom: 1em;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
`;

const MainScreenContainer = styled.div`
  width: ${DEFAULT_CONTENT_WIDTH};
  max-width: 100%;
  font-size: 2em;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: bold;
  box-sizing: border-box;
`;

const ActionsContainer = styled.div`
  display: flex;
  gap: 6px;
`;
