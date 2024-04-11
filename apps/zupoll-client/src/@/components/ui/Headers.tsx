import { useRouter } from "next/navigation";
import { useCallback } from "react";
import styled from "styled-components";
import { DEFAULT_CONTENT_WIDTH } from "./Elements";
import { Button } from "./button";

export interface HeaderProps {
  actions?: any;
  title?: string;
}

export function AppHeader({ actions, title }: HeaderProps) {
  return (
    <StickyHeader>
      <MainScreenContainer>
        {title ? (
          <div className="text-2xl">{title}</div>
        ) : (
          <div className="text-2xl">Zupoll</div>
        )}
        <div className="flex row gap-2">{actions}</div>
      </MainScreenContainer>
    </StickyHeader>
  );
}

export function MainActions({
  logout,
  createBallot
}: {
  logout: () => void;
  createBallot: () => void;
}) {
  const confirmLogout = useCallback(() => {
    if (window.confirm("Are you sure you want to log out?")) {
      logout();
    }
  }, [logout]);

  return (
    <>
      <Button variant="outline" onClick={confirmLogout}>
        Log Out
      </Button>
      <Button variant="creative" onClick={createBallot}>
        Create Ballot
      </Button>
    </>
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

export function CancelPollHeader() {
  const router = useRouter();

  const confirmExit = useCallback(() => {
    if (
      window.confirm(
        "Are you sure you want to cancel? You will lose any questions you have written."
      )
    ) {
      router.push("/");
    }
  }, [router]);

  return (
    <StickyHeader>
      <MainScreenContainer>
        <Button onClick={confirmExit} variant="outline">
          Home
        </Button>
      </MainScreenContainer>
    </StickyHeader>
  );
}

const StickyHeader = styled.div`
  top: 0;
  margin-top: 2em;
  padding-top: 1em;
  padding-bottom: 1em;
  margin-bottom: 1em;
  background-color: hsl(var(--background));
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
