import { LogoutButton } from "@/components/ui/Headers";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { FaUserAstronaut } from "react-icons/fa";
import styled from "styled-components";
import { LoginState } from "../../types";

export function LoggedInAs({
  loginState,
  logout,
  showHomeButton
}: {
  loginState: LoginState | undefined;
  logout: () => void;
  showHomeButton: boolean;
}) {
  const router = useRouter();

  if (!loginState) {
    return null;
  }

  return (
    <div className="flex justify-between items-center w-full">
      <span className="mr-2 flex flex-row gap-2 justify-center items-center shrink overflow-hidden rounded text-sm bg-green-950/20 px-3 py-1">
        <FaUserAstronaut className="shrink-0" />
        <AnimContainer className="shrink overflow-hidden text-ellipsis text-nowrap">
          {loginState.config.name}
        </AnimContainer>
      </span>
      <span className="flex flex-row gap-2">
        {showHomeButton && (
          <Button
            variant="outline"
            onClick={() => {
              router.push("/");
            }}
          >
            Home
          </Button>
        )}
        <LogoutButton logout={logout} />
        {/* <SettingsDrawer /> */}
      </span>
    </div>
  );
}

const AnimContainer = styled.span`
  user-select: none;
  animation: move-bg 8s linear infinite;
  --bg-size: 400%;
  --color-one: rgb(152, 228, 129);
  --color-two: rgb(250, 250, 207);
  font-family: sans-serif;
  background: linear-gradient(
      90deg,
      var(--color-one),
      var(--color-two),
      var(--color-one)
    )
    0 0 / var(--bg-size) 100%;
  color: transparent;
  background-clip: text;

  @keyframes move-bg {
    to {
      background-position: var(--bg-size) 0;
    }
  }
`;
