import { useRouter } from "next/navigation";
import { useCallback } from "react";
import styled from "styled-components";
import { DEFAULT_CONTENT_WIDTH } from "./Elements";
import { Button } from "./button";

export interface HeaderProps {
  title?: string;
}

export function AppHeader({ title }: HeaderProps) {
  return (
    <HeaderContainer>
      <div className="flex flex-row gap-4 items-center justify-center">
        {title ? (
          <div className="text-3xl">{title}</div>
        ) : (
          <div className="text-3xl">Zupoll</div>
        )}
      </div>
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
  width: 100%;
  margin-bottom: 1em;
  display: flex;
  justify-content: center;
  align-items: center;
  width: ${DEFAULT_CONTENT_WIDTH};
  max-width: 100%;
  display: flex;
  font-weight: bold;

  /**
   * mobile styling
   */
  @media screen and (max-width: 640px) {
    padding-top: 32px;
  }
`;
