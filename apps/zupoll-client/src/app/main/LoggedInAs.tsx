import { LogoutButton } from "@/components/ui/Headers";
import { FaUserAstronaut } from "react-icons/fa";
import { LoginState } from "../../types";
import { SettingsDrawer } from "./SettingsDrawer";
export function LoggedInAs({
  loginState,
  logout
}: {
  loginState: LoginState;
  logout: () => void;
}) {
  return (
    <div className="flex justify-between items-center">
      <span className="mr-2 flex flex-row gap-2 justify-center items-center shrink overflow-hidden">
        <FaUserAstronaut className="shrink-0" />
        <span className="shrink text-nowrap overflow-hidden text-ellipsis">
          {loginState.config.name}
        </span>
      </span>
      <span className="flex flex-row gap-2">
        <LogoutButton logout={logout} />
        <SettingsDrawer />
      </span>
    </div>
  );
}
