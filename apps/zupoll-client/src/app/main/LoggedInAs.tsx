import { LogoutButton } from "@/components/ui/Headers";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { FaUserAstronaut } from "react-icons/fa";
import { LoginState } from "../../types";

export function LoggedInAs({
  loginState,
  logout,
  showHomeButton
}: {
  loginState: LoginState;
  logout: () => void;
  showHomeButton: boolean;
}) {
  const router = useRouter();

  return (
    <div className="flex justify-between items-center w-full">
      <span className="mr-2 flex flex-row gap-2 justify-center items-center shrink overflow-hidden">
        <FaUserAstronaut className="shrink-0" />
        <span className="shrink text-nowrap overflow-hidden text-ellipsis text-nowrap">
          {loginState.config.name}
        </span>
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
