import _ from "lodash";
import React, { useMemo, useState } from "react";
import {
  LoginCategory,
  LoginConfig,
  LoginState,
  ZupollError
} from "../../types";
import { LoginAsSubgroup } from "./ChooseGroup";
import { SelectLoginGroup } from "./SelectLoginGroup";

/**
 * Lets user select event and then log in as one of the groups in
 * that event.
 */
export function LoginWidget(props: LoginWidgetProps) {
  const groups = useMemo<LoginGroup[]>((): LoginGroup[] => {
    const rawGroups = Object.entries(
      _.groupBy(props.configs, (r) => r.configCategoryId)
    ) as [LoginCategory, LoginConfig[]][];

    return rawGroups.map(
      ([groupId, configs]) => ({ groupId, configs }) satisfies LoginGroup
    );
  }, [props.configs]);
  const [curGroupCategory, setCurGroupCategory] = useState<
    LoginCategory | undefined
  >();
  const curGroup = useMemo(() => {
    return groups.find((g) => g.groupId === curGroupCategory);
  }, [groups, curGroupCategory]);

  return (
    <>
      {!!curGroup && (
        <div className="my-4">
          <React.Fragment key={curGroup.groupId}>
            <LoginAsSubgroup
              {...props}
              groupId={curGroup.groupId}
              configs={curGroup.configs}
            />
          </React.Fragment>
        </div>
      )}

      <SelectLoginGroup
        selectedGroup={curGroupCategory}
        setSelectedGroup={setCurGroupCategory}
        groups={groups}
      />
    </>
  );
}

/**
 * Props for {@link LoginWidget}.
 */
export interface LoginWidgetProps {
  configs: LoginConfig[];
  onLogin: (loginState: LoginState) => void;
  setError: (error?: ZupollError) => void;
  setServerLoading: (loading: boolean) => void;
}

export interface LoginGroup {
  groupId: LoginCategory;
  configs: LoginConfig[];
}
