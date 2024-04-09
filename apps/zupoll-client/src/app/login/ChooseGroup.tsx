import { LoginCategory, LoginConfig } from "../../types";
import { LoginButton } from "./LoginButton";
import { LoginWidgetProps } from "./LoginWidget";

/**
 * Given a {@link groupId} and {@link configs}, renders a login button for each config in the group.
 * @todo - this will need to be re-thought through when we have more than 2 configs per group.
 */
export function LoginAsSubgroup({
  configs,
  groupId,
  onLogin,
  setError,
  setServerLoading
}: LoginGroupProps) {
  const attendeeConfig = configs[0];
  const organizerConfig = configs[1];

  return (
    <div className="flex row w-full m-1 gap-2 items-center justify-center">
      <div className="mr-3">Log in as</div>
      <LoginButton
        onLogin={onLogin}
        onError={setError}
        setServerLoading={setServerLoading}
        config={attendeeConfig}
        variant={"creative"}
        className="grow"
      >
        Resident
      </LoginButton>
      <LoginButton
        variant={"outline"}
        onLogin={onLogin}
        onError={setError}
        setServerLoading={setServerLoading}
        config={organizerConfig}
      >
        Organizer
      </LoginButton>
    </div>
  );
}

export interface LoginGroupProps extends LoginWidgetProps {
  groupId: LoginCategory;
  configs: LoginConfig[];
}
