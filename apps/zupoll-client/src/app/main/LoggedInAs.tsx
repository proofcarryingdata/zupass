import { LogoutButton } from "@/components/ui/Headers";
import { FaUserAstronaut } from "react-icons/fa";
import { LoginState } from "../../types";
export function LoggedInAs({
  loginState,
  logout
}: {
  loginState: LoginState;
  logout: () => void;
}) {
  return (
    <div className="flex justify-between items-center">
      <span className="mr-2 flex flex-row gap-2 justify-center items-center">
        <FaUserAstronaut />
        {loginState.config.name}
      </span>
      <LogoutButton logout={logout} />
    </div>
  );
}
