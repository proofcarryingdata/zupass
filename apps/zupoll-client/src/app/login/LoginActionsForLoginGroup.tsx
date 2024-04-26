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
  return (
    <div className="flex-grow flex row w-full gap-2 items-center justify-center box-border">
      {group.configs.map((loginConfig, i) => {
        const shouldEmphasize = i === group.configs.length - 1;
        return (
          <LoginButton
            key={group.category + loginConfig.name}
            onLogin={onLogin}
            onError={setError}
            setServerLoading={setServerLoading}
            serverLoading={serverLoading}
            config={loginConfig}
            variant={shouldEmphasize ? "default" : "ghost"}
            className={shouldEmphasize ? "grow" : undefined}
          >
            {loginConfig.buttonName}
          </LoginButton>
        );
      })}
    </div>
  );
}

export interface LoginGroupProps extends LoginWidgetProps {
  group: LoginGroup;
}
