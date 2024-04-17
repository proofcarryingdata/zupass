import { LogoutButton } from "@/components/ui/Headers";
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
      <span className="mr-2">{loginState.config.name}</span>
      <LogoutButton logout={logout} />
    </div>
  );
}
