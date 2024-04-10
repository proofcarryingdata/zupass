import { LoginGroup } from "../../api/loginGroups";
import { LoginButton } from "./LoginButton";
import { LoginWidgetProps } from "./LoginWidget";

/**
 * Given a {@link groupId} and {@link configs}, renders a login button for each config in the group.
 * @todo - this will need to be re-thought through when we have more than 2 configs per group.
 */
export function LoginActionsForLoginGroup({
  group,
  onLogin,
  setError,
  setServerLoading,
  serverLoading
}: LoginGroupProps) {
  const attendeeConfig = group.configs[0];
  const organizerConfig = group.configs[1];

  return (
    <div className="flex row w-full m-4 gap-2 items-center justify-center">
      <div className="mr-3">Log in as</div>
      {group.configs.map((loginConfig, i) => (
        <LoginButton
          key={i}
          onLogin={onLogin}
          onError={setError}
          setServerLoading={setServerLoading}
          serverLoading={serverLoading}
          config={loginConfig}
          variant={"creative"}
          className="grow"
        >
          {loginConfig.buttonName}
        </LoginButton>
      ))}
    </div>
  );
}

export interface LoginGroupProps extends LoginWidgetProps {
  group: LoginGroup;
}
