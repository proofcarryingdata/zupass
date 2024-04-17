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
    // <Card>
    // <CardContent className="mt-6">
    <div className="flex justify-between items-center">
      You're logged in as {loginState.config.name}
      <LogoutButton logout={logout} />
    </div>
    // </CardContent>
    // </Card>
  );
}
