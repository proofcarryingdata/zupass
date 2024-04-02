import _ from "lodash";
import { useMemo, useState } from "react";
import {
  ConfigGroupName,
  LoginConfig,
  LoginState,
  ZupollError
} from "../../types";
import { LoginButton } from "./LoginButton";
import { SelectLoginGroup } from "./SelectLoginGroup";

export interface LoginGroupsProps {
  configs: LoginConfig[];
  onLogin: (loginState: LoginState) => void;
  setError: (error?: ZupollError) => void;
  setServerLoading: (loading: boolean) => void;
}

export function LoginGroups(props: LoginGroupsProps) {
  const [selectedGroup, setSelectedGroup] = useState<
    ConfigGroupName | undefined
  >();

  const allGroups = useMemo<[string, LoginConfig[]][]>(() => {
    return Object.entries(_.groupBy(props.configs, (r) => r.configGroupId));
  }, [props.configs]);

  const onlySelectedGroup = useMemo(() => {
    return allGroups.filter(
      (g) => g[0] === selectedGroup || selectedGroup === undefined
    );
  }, [allGroups, selectedGroup]);

  return (
    <div>
      {!!selectedGroup && (
        <div className="my-4">
          {onlySelectedGroup.map(([groupId, groupConfigs], i) => {
            return (
              <div key={i}>
                <LoginGroup
                  {...props}
                  groupId={groupId}
                  configs={groupConfigs}
                />
              </div>
            );
          })}
        </div>
      )}
      <SelectLoginGroup
        selectedGroup={selectedGroup}
        setSelectedGroup={setSelectedGroup}
        groups={allGroups}
      />
    </div>
  );
}

export interface LoginGroupProps extends LoginGroupsProps {
  groupId: string;
}

export function LoginGroup({
  configs,
  groupId,
  onLogin,
  setError,
  setServerLoading
}: LoginGroupProps) {
  const attendeeConfig = configs[0];
  const organizerConfig = configs[1];

  return (
    <div className="flex row w-full m-1 gap-2">
      <LoginButton
        onLogin={onLogin}
        onError={setError}
        setServerLoading={setServerLoading}
        config={attendeeConfig}
        variant={"outline"}
        className="grow"
      >
        Log in as {attendeeConfig.prompt}
      </LoginButton>
      <LoginButton
        variant={"ghost"}
        onLogin={onLogin}
        onError={setError}
        setServerLoading={setServerLoading}
        config={organizerConfig}
      >
        Log in as Organizer
      </LoginButton>
    </div>
  );
}
